// Server-side query embedding (Voyage AI).
// Mirrors crawler/src/lib/embed.ts but kept here so web has no cross-deps on crawler.

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

export async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set');
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: VOYAGE_MODEL,
      input_type: 'query',
      output_dtype: 'float',
    }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const e = j.data[0]?.embedding;
  if (!e) throw new Error('No embedding returned');
  return e;
}
