import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chatBackendEnabled } from '@/lib/feature-flags';
import { hybridSearch, type RagHit } from '@/lib/hybrid-search';
import { issueOllamaToken } from '@/lib/hmac-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = new Set([
  'https://tech-decisions.vercel.app',
  'https://tech-decisions-portfolio.vercel.app',
  'https://tech-decisions-public.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]);

function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * 챗봇 운영 시간 — KST 07:00 ~ 18:59 만 활성. 외 시간은 Mac 발열·전력 절감.
 * 실제 Funnel은 cron으로 토글되지만, 그 전에 Vercel 단에서 안내 메시지로
 * 우아하게 차단해야 사용자가 빨간 에러 대신 정중한 안내를 본다.
 */
function isWithinOperatingHours(): { ok: true } | { ok: false; hourKst: number } {
  // Vercel 서버는 UTC. KST = UTC+9.
  const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  if (kstHour >= 7 && kstHour < 19) return { ok: true };
  return { ok: false, hourKst: kstHour };
}

const Body = z.object({ message: z.string().min(1).max(500) });

const SYSTEM = [
  '너는 한국 빅테크 엔지니어링 의사결정을 비교해 설명하는 어시스턴트다.',
  '아래 [검색결과] 안의 내용만 근거로 답한다. 모르는 건 모른다고 한다.',
  '응답 규칙:',
  '1) 한국어, 최대 4문장.',
  '2) 회사 이름과 인용 도구·패턴을 정확히 적는다. 추측·과장 금지.',
  '3) 회사가 두 곳 이상이면 짧게 비교한다 (예: "토스는 X, 카카오페이는 Y").',
  '4) 검색결과에 없으면 "현재 인덱싱된 자료에 없습니다"라고 답한다.',
].join('\n');

function buildContext(hits: RagHit[]): string {
  const PER_HIT = 300;
  return hits
    .map((h, i) => {
      const tag = h.source === 'cell' ? `[셀 ${i + 1}] ${h.title}` : `[글 ${i + 1}] ${h.title}`;
      const text = h.text.length > PER_HIT ? h.text.slice(0, PER_HIT) + '…' : h.text;
      return `${tag}\n${text}`;
    })
    .join('\n\n');
}

/**
 * Stage-1 of the two-step chat flow on Hobby Vercel (10s function cap):
 *   1) Run RAG search + assemble prompt + mint 60s HMAC token.       ← this route
 *   2) Browser calls Funnel directly with the token for streaming.   ← ChatRoom
 *
 * Done in <1s so the 10s cap never bites.
 */
export async function POST(req: NextRequest) {
  if (!isOriginAllowed(req)) {
    return Response.json({ error: 'forbidden origin' }, { status: 403 });
  }
  if (!chatBackendEnabled()) {
    return Response.json(
      { error: 'CLOUD_LLM_ENABLED=true and OLLAMA_URL/HMAC_SECRET must be set.' },
      { status: 503 },
    );
  }
  const hours = isWithinOperatingHours();
  if (!hours.ok) {
    return Response.json(
      {
        scheduledOff: true,
        hourKst: hours.hourKst,
        message:
          '🌙 챗봇 야간 점검 시간입니다. 매일 KST 07:00 ~ 19:00 사이에 운영합니다. 그 외 시간엔 검색·비교·셀 기능을 이용해주세요.',
      },
      { status: 503 },
    );
  }

  const funnelUrl = process.env.OLLAMA_URL;
  const secret = process.env.HMAC_SECRET;
  const model = process.env.OLLAMA_GENERATE_MODEL ?? 'qwen3:1.7b';
  if (!funnelUrl || !secret) {
    return Response.json({ error: 'server misconfigured (OLLAMA_URL or HMAC_SECRET missing)' }, { status: 500 });
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
    '[검색결과]',
    context || '(검색 결과 없음)',
    '',
    '[질문]',
    body.message,
    '',
    '[답변]',
  ].join('\n');

  const { token, exp, jti } = issueOllamaToken(secret, 60);

  // Citations are computed server-side and shipped here so the browser doesn't
  // need to re-derive them. Same shape as the legacy /api/chat SSE event.
  const citations = hits.map((h) => ({
    source: h.source,
    id: h.id,
    title: h.title,
    url: h.url,
    companySlug: h.companySlug,
    companyName: h.companyName,
    axisName: h.axisName,
    domainSlug: h.domainSlug,
    score: h.score,
  }));

  return Response.json({
    funnelUrl,
    token,
    expiresAt: exp,
    jti,
    model,
    prompt,
    system: SYSTEM,
    // think:false → qwen3 thinking 비활성 (dense 모델은 무시). browser가 그대로 funnel에 전달.
    think: false,
    options: { num_predict: 180, num_ctx: 2048, temperature: 0.4 },
    citations,
  });
}
