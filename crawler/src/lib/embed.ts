// Voyage AI embedding client.
// Uses raw fetch instead of voyageai SDK because the SDK is occasionally
// out of sync with newest models. Endpoint is stable since Voyage v1.

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

const apiKey = () => {
  const k = process.env.VOYAGE_API_KEY;
  if (!k) throw new Error('VOYAGE_API_KEY is not set');
  return k;
};

export async function embedTexts(
  texts: string[],
  inputType: 'document' | 'query' = 'document',
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
      output_dtype: 'float',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Voyage error ${res.status}: ${t}`);
  }
  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };
  // Sort by index to align with input order
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const tokens = json.usage.total_tokens / sorted.length;
  return sorted.map((d) => ({ embedding: d.embedding, tokens: Math.round(tokens) }));
}

export async function embedQuery(text: string): Promise<number[]> {
  const r = await embedTexts([text], 'query');
  return r[0]!.embedding;
}
