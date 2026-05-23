import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chatBackendEnabled } from '@/lib/feature-flags';
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

function isWithinOperatingHours(): { ok: true } | { ok: false; hourKst: number } {
  const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  if (kstHour >= 7 && kstHour < 19) return { ok: true };
  return { ok: false, hourKst: kstHour };
}

const Body = z.object({ message: z.string().min(1).max(500) });

const SYSTEM = [
  '너는 사용자가 보낸 이미지를 한국어로 설명·분석하는 어시스턴트다.',
  '응답 규칙:',
  '1) 한국어, 최대 6문장.',
  '2) 이미지에서 직접 확인되는 사실만 단정한다. 모르겠으면 모른다고 답한다.',
  '3) 다이어그램·코드·UI라면 핵심 요소를 간결히 요약한다.',
  '4) 가능하면 한국 빅테크(토스·카카오페이·네이버 등)의 유사 사례와 짧게 연결한다.',
].join('\n');

/**
 * 비전 챗 Stage-1:
 *   1) HMAC 토큰 발급 + 비전 모델명 반환.            ← this route
 *   2) 브라우저가 직접 Funnel `/api/generate`에 images 필드와 함께 요청.
 *
 * RAG 검색은 하지 않는다 — 이미지 질문은 보통 이미지 자체에 대한 것이고,
 * 텍스트 임베딩으로 사진 의도를 검색해봐야 잡음만 늘어난다.
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
  const model = process.env.OLLAMA_VISION_MODEL ?? 'gemma3:4b';
  if (!funnelUrl || !secret) {
    return Response.json(
      { error: 'server misconfigured (OLLAMA_URL or HMAC_SECRET missing)' },
      { status: 500 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const { token, exp, jti } = issueOllamaToken(secret, 60);

  return Response.json({
    funnelUrl,
    token,
    expiresAt: exp,
    jti,
    model,
    prompt: body.message,
    system: SYSTEM,
    think: false,
    options: { num_predict: 320, num_ctx: 4096, temperature: 0.3 },
  });
}
