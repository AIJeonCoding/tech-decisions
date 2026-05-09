import { NextRequest } from 'next/server';
import { z } from 'zod';
import { searchArticles } from '@/lib/search';

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
    const results = await searchArticles({ query: q, limit: 20, domainSlug: domain });
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
