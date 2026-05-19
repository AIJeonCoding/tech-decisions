/**
 * Browser-free Ollama client used by /api/chat. Mirrors crawler/src/lib/ollama.ts
 * but lives in the web package so the Next.js bundler doesn't pull in crawler deps.
 */

const BASE_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

export const OLLAMA_MODELS = {
  embed: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
  generate: process.env.OLLAMA_GENERATE_MODEL ?? 'qwen3:1.7b',
} as const;

/**
 * Build headers — adds Bearer token only when `LLM_BEARER_TOKEN` is set
 * (cloud mode through a Caddy auth proxy). For pure localhost dev the env is
 * absent and the header is omitted (Ollama has no auth anyway).
 */
function authHeaders(): Record<string, string> {
  const token = process.env.LLM_BEARER_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ model: OLLAMA_MODELS.embed, prompt: text }),
  });
  if (!res.ok) throw new Error(`embed HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding)) throw new Error('embed returned no vector');
  return data.embedding;
}

/** Stream Gemma generate as a string async iterator. */
export async function* generateStream(opts: {
  prompt: string;
  system?: string;
  signal?: AbortSignal;
  maxTokens?: number;
}): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      model: OLLAMA_MODELS.generate,
      prompt: opts.prompt,
      system: opts.system,
      stream: true,
      options: {
        num_predict: opts.maxTokens ?? 180,
        num_ctx: 2048,
        temperature: 0.4,
      },
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`generate HTTP ${res.status}`);
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
        // ignore partial lines
      }
    }
  }
}

/** Float32 → BLOB the way sqlite-vec expects on the JS side. */
export function vecToBuffer(vec: number[]): Buffer {
  return Buffer.from(new Float32Array(vec).buffer);
}
