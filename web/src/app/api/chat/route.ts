import { NextRequest } from 'next/server';
import { z } from 'zod';
import { localLlmEnabled } from '@/lib/feature-flags';
import { hybridSearch, type RagHit } from '@/lib/hybrid-search';
import { generateStream } from '@/lib/local-llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  message: z.string().min(1).max(500),
});

const SYSTEM = [
  '너는 한국 빅테크 엔지니어링 의사결정을 비교해 설명하는 어시스턴트다.',
  '아래 [검색결과] 안의 내용만 근거로 답한다. 모르는 건 모른다고 한다.',
  '응답 규칙:',
  '1) 한국어, 최대 4문장.',
  '2) 회사 이름과 인용 도구·패턴을 정확히 적는다. 추측·과장 금지.',
  '3) 회사가 두 곳 이상이면 짧게 비교한다 (예: "토스는 X, 카카오페이는 Y").',
  '4) 검색결과에 없으면 "현재 인덱싱된 자료에 없습니다"라고 답한다.',
  '/no_think', // qwen3 thinking 비활성 (다른 모델은 무시)
].join('\n');

function buildContext(hits: RagHit[]): string {
  // Tight per-hit budget so Gemma 3 4B on an 8GB Mac keeps first-token < 5s.
  const PER_HIT = 300;
  return hits
    .map((h, i) => {
      const tag = h.source === 'cell' ? `[셀 ${i + 1}] ${h.title}` : `[글 ${i + 1}] ${h.title}`;
      const text = h.text.length > PER_HIT ? h.text.slice(0, PER_HIT) + '…' : h.text;
      return `${tag}\n${text}`;
    })
    .join('\n\n');
}

export async function POST(req: NextRequest) {
  if (!localLlmEnabled()) {
    return Response.json(
      { error: 'LOCAL_LLM_ENABLED=true 환경변수와 ollama 서버가 필요합니다.' },
      { status: 503 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const hits = await hybridSearch(body.message, 4);
  const context = buildContext(hits);

  const prompt = [
    `[검색결과]`,
    context || '(검색 결과 없음)',
    '',
    `[질문]`,
    body.message,
    '',
    '[답변]',
  ].join('\n');

  // SSE-ish text stream — Plain `text/event-stream` lines so the client can
  // consume with EventSource semantics if it wants, but we send the citations
  // as a leading JSON event followed by token data: events.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        sendEvent(
          'citations',
          hits.map((h) => ({
            source: h.source,
            id: h.id,
            title: h.title,
            url: h.url,
            companySlug: h.companySlug,
            companyName: h.companyName,
            axisName: h.axisName,
            domainSlug: h.domainSlug,
            score: h.score,
          })),
        );
        for await (const token of generateStream({ prompt, system: SYSTEM, signal: req.signal })) {
          sendEvent('token', token);
        }
        sendEvent('done', { ok: true });
      } catch (e) {
        sendEvent('error', { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
