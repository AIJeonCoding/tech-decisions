import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, articles } from '@td/db';
import { anthropic, MODELS, computeCost, recordCost, checkBudget } from '../lib/anthropic.js';
import { logger } from '../lib/log.js';

const log = logger('tag');

const TAG_VOCAB = [
  'payment', 'settlement', 'ledger', 'idempotency', 'concurrency',
  'search', 'ranking', 'recommendation', 'embedding',
  'msa', 'monolith-decomposition', 'saga', 'eventsourcing',
  'kafka', 'redis', 'postgres', 'mysql', 'dynamodb', 'elasticsearch',
  'observability', 'sre', 'deployment', 'ci-cd',
  'frontend', 'backend', 'mobile', 'infra', 'security',
  'ml', 'llm', 'data-pipeline', 'cdc', 'graphql', 'grpc', 'rest',
] as const;

const DOMAIN_VOCAB = [
  'payment-settlement',
  'search',
  'recommendation',
  'msa-migration',
  'realtime-data',
] as const;

const SYSTEM = [
  '너는 기술 블로그 글을 분류하는 어시스턴트다.',
  '입력 글의 본질을 보고 다음 두 가지를 출력한다:',
  '',
  '1) tags: 아래 목록에서 적합한 것만 1~5개 선택 (소문자 슬러그)',
  TAG_VOCAB.join(', '),
  '',
  '2) domains: 아래 5개 비교 도메인 중 0~2개 선택. 명백히 해당될 때만',
  DOMAIN_VOCAB.join(', '),
  '',
  '추측하지 말고 본문에 명확한 근거가 있을 때만 선택한다. 없으면 빈 배열.',
  '',
  '반드시 아래 JSON 스키마로만 응답한다 (다른 텍스트 금지):',
  '{"tags": ["..."], "domains": ["..."], "confidence": 0.0~1.0}',
].join('\n');

const ResponseSchema = z.object({
  tags: z.array(z.string()),
  domains: z.array(z.string()),
  confidence: z.number().min(0).max(1).default(0.5),
});

function safeJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return JSON.parse(text.slice(start, end + 1));
}

async function tagOne(title: string, summary: string | null, body: string) {
  const truncated = body.length > 4000 ? body.slice(0, 4000) + '\n…(생략)' : body;
  const res = await anthropic.beta.messages.create({
    model: MODELS.haiku,
    max_tokens: 200,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
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
  const parsed = ResponseSchema.parse(safeJson(text));
  const tagSet = new Set<string>(TAG_VOCAB);
  const domainSet = new Set<string>(DOMAIN_VOCAB);
  parsed.tags = parsed.tags.filter((t) => tagSet.has(t));
  parsed.domains = parsed.domains.filter((d) => domainSet.has(d));
  return { result: parsed, usage: computeCost('haiku', res.usage) };
}

export async function tagBatch({ limit = 50 }: { limit?: number }) {
  const budget = await checkBudget();
  if (!budget.ok) {
    log.error(`Budget exceeded: $${budget.spent}`);
    return;
  }
  // Articles that are summarized but not yet tagged (empty domains array).
  const todo = await db
    .select({ id: articles.id, title: articles.title, summary: articles.summary, bodyMd: articles.bodyMd })
    .from(articles)
    .where(sql`${articles.summary} IS NOT NULL AND coalesce(array_length(${articles.domains}, 1), 0) = 0 AND coalesce(array_length(${articles.tags}, 1), 0) = 0`)
    .limit(limit);

  log.info(`To tag: ${todo.length}`);
  let totalCost = 0;
  for (const a of todo) {
    try {
      const { result, usage } = await tagOne(a.title, a.summary, a.bodyMd);
      totalCost += usage.costUsd;
      await db
        .update(articles)
        .set({
          tags: result.tags,
          domains: result.domains,
          llmCost: sql`coalesce(${articles.llmCost}, 0) + ${usage.costUsd}`,
        })
        .where(eq(articles.id, a.id));
      await recordCost('tag', 'haiku', usage);
      log.info(`  ✓ #${a.id} domains=[${result.domains.join(',')}] tags=[${result.tags.slice(0, 4).join(',')}]`);
    } catch (e) {
      log.error(`  ✗ #${a.id}: ${(e as Error).message}`);
    }
  }
  log.info(`Done. cost=$${totalCost.toFixed(4)}`);
}
