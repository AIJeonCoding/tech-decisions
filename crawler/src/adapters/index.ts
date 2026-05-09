import type { SourceAdapter } from '../lib/types.js';
import { rssReadabilityAdapter } from './rss-readability.js';
import { mediumRssAdapter } from './medium-rss.js';

export const adapters: Record<string, SourceAdapter> = {
  'rss-readability': rssReadabilityAdapter,
  'medium-rss': mediumRssAdapter,
};

export function getAdapter(name: string): SourceAdapter {
  const a = adapters[name];
  if (!a) throw new Error(`Unknown adapter: ${name}`);
  return a;
}
