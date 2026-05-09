import Anthropic from '@anthropic-ai/sdk';

export const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
  console.error('ANTHROPIC_API_KEY is not set in production');
}

export const anthropic = new Anthropic({
  apiKey: apiKey ?? 'missing-key',
});
