import { eq, isNull, sql } from 'drizzle-orm';
import { db, articles } from '@td/db';
import { anthropic, MODELS, computeCost, recordCost, checkBudget } from '../lib/anthropic.js';
import { logger } from '../lib/log.js';

const log = logger('summarize');

const SYSTEM = [
  '너는 한국 빅테크 엔지니어링 블로그 글을 1줄로 요약하는 어시스턴트다.',
  '규칙:',
  '1) 60자 이내 한국어로, 이 글이 어떤 문제를 어떻게 풀었는지를 압축한다.',
  '2) 도구 이름·핵심 의사결정·정량 수치가 있으면 우선 포함한다.',
  '3) 과장 표현 금지("혁신적", "충격" 등). 사실만 담는다.',
  '4) 따옴표·이모지·말줄임표 사용 금지. 문장 끝에 마침표 없음.',
  '예시 입력 → 출력:',
  '- "결제 시스템에 Idempotency-Key 도입한 이야기" → "결제 API 멱등성을 Idempotency-Key + Redis 12시간 TTL로 구현"',
  '- "MSA로 전환하며 겪은 5가지 시행착오" → "모놀리스 분해 시 DB 분리 순서·사가 보상·관측성 부재 등 5개 시행착오 정리"',
].join('\n');

async function summarizeOne(title: string, body: string): Promise<{ summary: string; usage: ReturnType<typeof computeCost> }> {
  const truncated = body.length > 8000 ? body.slice(0, 8000) + '\n…(생략)' : body;
  const res = await anthropic.beta.messages.create({
    model: MODELS.haiku,
    max_tokens: 120,
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `제목: ${title}\n\n본문(markdown):\n${truncated}\n\n위 글의 1줄 요약을 한국어 60자 이내로:`,
      },
    ],
  });
  const text = res.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\.$/, '');
  const usage = computeCost('haiku', res.usage);
  return { summary: text, usage };
}

export async function summarizeBatch({ limit = 50 }: { limit?: number }) {
  const budget = await checkBudget();
  if (!budget.ok) {
    log.error(`Budget exceeded: $${budget.spent} / $${budget.budget}`);
    return;
  }

  const todo = await db
    .select({ id: articles.id, title: articles.title, bodyMd: articles.bodyMd })
    .from(articles)
    .where(isNull(articles.summary))
    .limit(limit);

  log.info(`To summarize: ${todo.length}`);

  let totalCost = 0;
  for (const a of todo) {
    try {
      const { summary, usage } = await summarizeOne(a.title, a.bodyMd);
      totalCost += usage.costUsd;
      await db
        .update(articles)
        .set({
          summary,
          llmCost: sql`coalesce(${articles.llmCost}, 0) + ${usage.costUsd}`,
          llmModel: MODELS.haiku,
          processedAt: new Date().toISOString(),
        })
        .where(eq(articles.id, a.id));
      await recordCost('summarize', 'haiku', usage);
      log.info(`  ✓ #${a.id} ${summary.slice(0, 50)}…`);
    } catch (e) {
      log.error(`  ✗ #${a.id}: ${(e as Error).message}`);
    }
  }
  log.info(`Done. cost=$${totalCost.toFixed(4)}`);
}
