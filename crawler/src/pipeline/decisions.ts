import { eq, sql, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, articles } from '@td/db';
import { anthropic, MODELS, computeCost, recordCost, checkBudget } from '../lib/anthropic.js';
import { logger } from '../lib/log.js';

const log = logger('decisions');

const PAYMENT_AXES = `
- concurrency-control: 동시성·정합성 제어 (분산락 / 낙관적 락 / 멱등키 / 이벤트소싱 / 단일 라이터)
- settlement-timing: 정산 시점 (실시간 / 일배치 / 하이브리드 / 스트리밍)
- reconciliation: 대사·정합성 검증 (이중기장 / 이벤트소싱 / 스냅샷+리컨실 / 전문 파일 diff)
- fee-distribution: 수수료·정산금 분배 (룰 엔진 / 단계별 분배 / 역분배 / 정밀도 처리)
- failure-recovery: 장애 복구·재처리 (DLQ+수동 / 보상 트랜잭션 / 자동 재시도 / 상태머신)
`.trim();

const SYSTEM_PAYMENT = [
  '너는 한국 핀테크/이커머스 엔지니어링 글에서 핵심 아키텍처 의사결정을 추출하는 어시스턴트다.',
  '',
  '아래 5개 비교축 중 본문에 명백히 언급/구현된 것만 추출한다:',
  PAYMENT_AXES,
  '',
  '각 의사결정 항목은:',
  '- axis: 위 5개 슬러그 중 하나',
  '- choice: 위 옵션 중 하나(또는 본문에 등장한 구체 명칭, 예: "Redlock", "Outbox+Saga")',
  '- rationale: 본문 근거 1~2문장 (한국어, 따옴표 인용 X)',
  '- quote: 본문에서 가장 직접적인 근거 문장 1개 (변경 없이 그대로)',
  '- confidence: 0.0~1.0 (본문 근거가 명확할수록 1에 가까움)',
  '',
  '규칙:',
  '1) 추측 금지. quote가 없으면 항목 자체를 만들지 마라.',
  '2) 한 글에서 0~3개까지만 추출. 5개 축 모두 강제로 채우려 하지 마라.',
  '3) confidence < 0.4면 반환하지 않는다.',
  '4) 반드시 아래 JSON 스키마만 출력 (다른 텍스트·마크다운 금지):',
  '{"decisions": [{"axis":"...","choice":"...","rationale":"...","quote":"...","confidence":0.0}]}',
].join('\n');

const Decision = z.object({
  axis: z.enum([
    'concurrency-control',
    'settlement-timing',
    'reconciliation',
    'fee-distribution',
    'failure-recovery',
  ]),
  choice: z.string().min(1).max(120),
  rationale: z.string().min(5).max(400),
  quote: z.string().min(5).max(500),
  confidence: z.number().min(0).max(1),
});

const Response = z.object({
  decisions: z.array(Decision),
});

function safeJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}

async function decisionsOne(title: string, summary: string | null, body: string) {
  const truncated = body.length > 12000 ? body.slice(0, 12000) + '\n…(생략)' : body;
  const res = await anthropic.beta.messages.create({
    model: MODELS.sonnet,
    max_tokens: 1500,
    system: [
      { type: 'text', text: SYSTEM_PAYMENT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `제목: ${title}\n${summary ? `요약: ${summary}\n` : ''}본문:\n${truncated}\n\nJSON으로:`,
      },
    ],
  });
  const text = res.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const parsed = Response.parse(safeJson(text));
  const filtered = parsed.decisions.filter((d) => d.confidence >= 0.4);
  return { decisions: filtered, usage: computeCost('sonnet', res.usage) };
}

export async function decisionsBatch({ limit = 30 }: { limit?: number }) {
  const budget = await checkBudget();
  if (!budget.ok) {
    log.error(`Budget exceeded: $${budget.spent}`);
    return;
  }

  // Only run on articles tagged with payment-settlement domain to keep cost down.
  const todo = await db
    .select({ id: articles.id, title: articles.title, summary: articles.summary, bodyMd: articles.bodyMd })
    .from(articles)
    .where(
      and(
        sql`${articles.domains} && ARRAY['payment-settlement']::text[]`,
        isNull(articles.decisions),
      ),
    )
    .limit(limit);

  log.info(`To extract decisions: ${todo.length}`);
  let totalCost = 0;
  for (const a of todo) {
    try {
      const { decisions, usage } = await decisionsOne(a.title, a.summary, a.bodyMd);
      totalCost += usage.costUsd;
      await db
        .update(articles)
        .set({
          decisions: decisions.map((d) => ({
            axis: d.axis,
            choice: d.choice,
            rationale: d.rationale,
            quote: d.quote,
            confidence: d.confidence,
          })),
          llmCost: sql`coalesce(${articles.llmCost}, 0) + ${usage.costUsd}`,
        })
        .where(eq(articles.id, a.id));
      await recordCost('decisions', 'sonnet', usage);
      log.info(`  ✓ #${a.id} ${decisions.length} decisions`);
    } catch (e) {
      log.error(`  ✗ #${a.id}: ${(e as Error).message}`);
    }
  }
  log.info(`Done. cost=$${totalCost.toFixed(4)}`);
}
