import Anthropic from '@anthropic-ai/sdk';
import { sql, eq } from 'drizzle-orm';
import { db, llmCosts } from '@td/db';
import { logger } from './log.js';

const log = logger('anthropic');

export const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const;

export type ModelKey = keyof typeof MODELS;

// Pricing (USD per 1M tokens) — adjust if Anthropic prices change.
// Cached input is billed at ~10% of base input.
const PRICING: Record<ModelKey, { input: number; cachedInput: number; output: number }> = {
  haiku: { input: 1.0, cachedInput: 0.1, output: 5.0 },
  sonnet: { input: 3.0, cachedInput: 0.3, output: 15.0 },
  opus: { input: 15.0, cachedInput: 1.5, output: 75.0 },
};

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && process.env.NODE_ENV !== 'test') {
  log.warn('ANTHROPIC_API_KEY not set — LLM calls will throw');
}

export const anthropic = new Anthropic({
  apiKey: apiKey ?? 'missing-key',
});

export interface LLMUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheCreationInputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function computeCost(model: ModelKey, usage: {
  input_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens: number;
}): LLMUsage {
  const p = PRICING[model];
  const cached = usage.cache_read_input_tokens ?? 0;
  const created = usage.cache_creation_input_tokens ?? 0;
  // Cache creation is 1.25x base; we approximate as base for simplicity.
  const inputCost =
    (usage.input_tokens / 1_000_000) * p.input +
    (created / 1_000_000) * p.input * 1.25 +
    (cached / 1_000_000) * p.cachedInput;
  const outputCost = (usage.output_tokens / 1_000_000) * p.output;
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: cached,
    cacheCreationInputTokens: created,
    outputTokens: usage.output_tokens,
    costUsd: inputCost + outputCost,
  };
}

export async function recordCost(operation: string, model: ModelKey, usage: LLMUsage): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await db.insert(llmCosts).values({
    day,
    model: MODELS[model],
    operation,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
  });
}

export async function checkBudget(): Promise<{ ok: boolean; spent: number; budget: number }> {
  const budget = Number(process.env.LLM_DAILY_BUDGET_USD ?? '5');
  const day = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${llmCosts.costUsd}), 0)` })
    .from(llmCosts)
    .where(eq(llmCosts.day, day));
  const spent = Number(rows[0]?.total ?? 0);
  if (spent > budget) {
    log.warn(`Daily budget hit: $${spent.toFixed(3)} > $${budget}`);
    return { ok: false, spent, budget };
  }
  return { ok: true, spent, budget };
}
