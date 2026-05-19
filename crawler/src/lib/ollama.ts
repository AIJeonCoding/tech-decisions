import { logger } from './log.js';

const log = logger('ollama');

const BASE_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

export const OLLAMA_MODELS = {
  embed: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
  generate: process.env.OLLAMA_GENERATE_MODEL ?? 'qwen3:1.7b',
} as const;

/**
 * Get a single embedding from Ollama. Retries once on network error since
 * `ollama serve` occasionally drops the first connection after a model swap.
 */
export async function embed(text: string, model: string = OLLAMA_MODELS.embed): Promise<number[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { embedding?: number[] };
      if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
        throw new Error(`empty embedding from ${model}`);
      }
      return data.embedding;
    } catch (e) {
      if (attempt === 1) throw e;
      log.warn(`embed retry after: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('unreachable');
}

export async function* generateStream(opts: {
  prompt: string;
  system?: string;
  model?: string;
}): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? OLLAMA_MODELS.generate,
      prompt: opts.prompt,
      system: opts.system,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line) as { response?: string; done?: boolean };
        if (obj.response) yield obj.response;
        if (obj.done) return;
      } catch {
        // ignore malformed lines (rare during ollama restarts)
      }
    }
  }
}
