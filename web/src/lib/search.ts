import { sql } from 'drizzle-orm';
import { db } from './db';

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

  // FTS5 query: sanitize each token, then OR phrase-match + prefix-match.
  // Korean unicode61 tokenizer splits on whitespace only, so "멱등" won't
  // hit the token "멱등키" without prefix expansion. We add `token*` so
  // shorter inputs still find substring matches via the prefix index.
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return [];
  const ftsQuery = tokens
    .map((t) => `("${t}" OR ${t}*)`)
    .join(' OR ');

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
