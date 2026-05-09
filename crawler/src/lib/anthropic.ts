import Anthropic from '@anthropic-ai/sdk';
import { logger } from './log.js';

const log = logger('anthropic');

export const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const;

export type ModelKey = keyof typeof MODELS;

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

// Cost tracking removed in V1 — re-add when V2 automation pipeline is enabled.
// In V1 the data is seeded manually via Claude Code, so per-run cost is not tracked in DB.
let dailySpent = 0;
let dailyDay = new Date().toISOString().slice(0, 10);

export function recordCost(_operation: string, _model: ModelKey, usage: LLMUsage): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyDay) {
    dailyDay = today;
    dailySpent = 0;
  }
  dailySpent += usage.costUsd;
}

export function checkBudget(): { ok: boolean; spent: number; budget: number } {
  const budget = Number(process.env.LLM_DAILY_BUDGET_USD ?? '5');
  return { ok: dailySpent <= budget, spent: dailySpent, budget };
}
