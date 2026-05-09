import { sql } from 'drizzle-orm';
import { db } from './db';

/**
 * Build a SQLite FTS5 MATCH expression from raw user input.
 *
 * Strategy:
 *  - Split on whitespace, strip non-letter/digit characters per token.
 *  - For each token emit `("token" OR token*)` so we get both phrase match
 *    and prefix match (the FTS5 prefix index handles shorter substrings).
 *  - Combine all tokens with OR — a search for "정산 동시성" should match
 *    documents that mention either term.
 *
 * Returns `null` when the query has no usable tokens (avoids empty MATCH).
 *
 * Korean note: SQLite FTS5's unicode61 tokenizer splits on whitespace only,
 * so "멱등" won't directly hit a token "멱등키" without `token*` prefix
 * expansion enabled by `prefix='2 3 4'` on the virtual table.
 */
export function buildFtsQuery(input: string): string | null {
  const tokens = input
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `("${t}" OR ${t}*)`).join(' OR ');
}

export interface SearchResult {
  articleId: number;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
  companySlug: string;
  companyName: string;
  companyNameKo: string | null;
  snippet: string;
  rank: number;
}

interface SearchOpts {
  query: string;
  limit?: number;
  domainSlug?: string;
}

/**
 * SQLite FTS5 full-text search across article title/summary/body.
 * Returns articles with snippet + bm25-style rank from FTS5.
 */
export async function searchArticles(opts: SearchOpts): Promise<SearchResult[]> {
  const { query, limit = 20, domainSlug } = opts;

  const ftsQuery = buildFtsQuery(query);
  if (ftsQuery === null) return [];

  if (!ftsQuery) return [];

  // domainSlug filter: SQLite stores domains as JSON text; use `EXISTS json_each`.
  const domainFilter = domainSlug
    ? sql`AND EXISTS (
        SELECT 1 FROM json_each(a.domains) j WHERE j.value = ${domainSlug}
      )`
    : sql``;

  const rows = await db.all<{
    article_id: number;
    title: string;
    url: string;
    summary: string | null;
    published_at: string | null;
    company_slug: string;
    company_name: string;
    company_name_ko: string | null;
    snippet: string;
    rank: number;
  }>(sql`
    SELECT
      a.id           AS article_id,
      a.title        AS title,
      a.url          AS url,
      a.summary      AS summary,
      a.published_at AS published_at,
      co.slug        AS company_slug,
      co.name        AS company_name,
      co.name_ko     AS company_name_ko,
      snippet(articles_fts, 2, '<mark>', '</mark>', '…', 24) AS snippet,
      bm25(articles_fts) AS rank
    FROM articles_fts
    JOIN articles a   ON a.id = articles_fts.rowid
    JOIN sources s    ON s.id = a.source_id
    JOIN companies co ON co.id = s.company_id
    WHERE articles_fts MATCH ${ftsQuery}
      ${domainFilter}
    ORDER BY rank
    LIMIT ${limit}
  `);

  return rows.map<SearchResult>((r) => ({
    articleId: r.article_id,
    title: r.title,
    url: r.url,
    summary: r.summary,
    publishedAt: r.published_at,
    companySlug: r.company_slug,
    companyName: r.company_name,
    companyNameKo: r.company_name_ko,
    snippet: r.snippet ?? '',
    rank: r.rank ?? 0,
  }));
}
