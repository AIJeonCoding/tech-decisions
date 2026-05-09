import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hybridSearch, type RetrievedChunk } from '@/lib/search';
import { anthropic, MODELS } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  query: z.string().min(2).max(500),
  domain: z.string().optional(),
});

const SYSTEM = `너는 한국 빅테크 엔지니어링 사례를 비교·요약해주는 어시스턴트다.

규칙:
1) 답변은 반드시 제공된 [참고 자료]에 근거해야 한다. 자료 밖 정보는 절대 추측하지 마라.
2) 본문 안에 [1], [2] 식으로 인라인 인용을 달고, 사용한 자료 번호만 참조한다.
3) 자료가 충분하지 않으면 "확인된 사례가 부족합니다"라고 명확히 말한다. 억지로 답하지 마라.
4) 회사별로 비교가 가능한 질문이면 회사명을 굵게 표기하고 차이점을 부각한다.
5) 마크다운 사용 가능. 코드/명령어는 \`백틱\`으로 감싼다.
6) 답변은 6문장 이내로 간결하게. 긴 인용 X.
`;

function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const company = c.companyNameKo ?? c.companyName;
      const date = c.publishedAt ? new Date(c.publishedAt).toISOString().slice(0, 10) : '날짜미상';
      return `[${i + 1}] ${company} · "${c.title}" (${date})\n${c.text.trim().slice(0, 800)}`;
    })
    .join('\n\n---\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { query, domain } = RequestSchema.parse(json);

    const chunks = await hybridSearch({ query, topK: 8, perRetriever: 20, domainSlug: domain });

    if (chunks.length === 0 || (chunks[0]?.fusedScore ?? 0) < 0.005) {
      return new Response(
        JSON.stringify({
          answer: '확인된 사례가 부족합니다. 다른 표현으로 질문해 보시거나, 비교 페이지에서 직접 사례를 찾아보세요.',
          citations: [],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const context = formatContext(chunks);

    const stream = await anthropic.beta.messages.create({
      model: MODELS.sonnet,
      max_tokens: 800,
      stream: true,
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `[참고 자료]\n${context}\n\n[질문]\n${query}\n\n위 자료만 근거로 [1], [2] 인용하며 답하라:`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          // First, send the citations metadata
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'citations',
              data: chunks.map((c, i) => ({
                index: i + 1,
                title: c.title,
                url: c.url,
                company: c.companyNameKo ?? c.companyName,
                companySlug: c.companySlug,
                publishedAt: c.publishedAt,
                heading: c.heading,
              })),
            })}\n\n`,
          ));
          for await (const ev of stream) {
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', text: ev.delta.text })}\n\n`,
              ));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: (e as Error).message })}\n\n`,
          ));
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
