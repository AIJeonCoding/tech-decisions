import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hybridSearch } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  q: z.string().min(2).max(200),
  domain: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { q, domain } = RequestSchema.parse(params);
    const chunks = await hybridSearch({ query: q, topK: 12, perRetriever: 30, domainSlug: domain });
    // Group by article to avoid duplicates
    const byArticle = new Map<number, typeof chunks[number]>();
    for (const c of chunks) {
      const cur = byArticle.get(c.articleId);
      if (!cur || c.fusedScore > cur.fusedScore) byArticle.set(c.articleId, c);
    }
    const results = Array.from(byArticle.values()).sort((a, b) => b.fusedScore - a.fusedScore);
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
