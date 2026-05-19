import { sql } from 'drizzle-orm';
import { db, sqliteHandle } from './db';
import { buildFtsQuery } from './search';
import { shouldHideMyProject, MY_PROJECT_SLUG } from './feature-flags';
import { embedQuery, vecToBuffer } from './local-llm';

export type HitSource = 'article' | 'cell';

export interface RagHit {
  source: HitSource;
  id: number;            // article_id or cell_id
  text: string;          // chunk text for cells, or snippet for articles
  title: string;         // article title or "[회사 — 축]"
  url?: string;          // article url
  companySlug?: string;
  companyName?: string;
  axisName?: string;
  domainSlug?: string;
  score: number;         // RRF score (higher = better)
}

/** Reciprocal Rank Fusion. k=60 is the conventional default. */
function rrfMerge(...rankings: { key: string; rank: number; hit: RagHit }[][]): RagHit[] {
  const k = 60;
  const scores = new Map<string, { hit: RagHit; score: number }>();
  for (const ranking of rankings) {
    for (const { key, rank, hit } of ranking) {
      const prev = scores.get(key);
      const contrib = 1 / (k + rank);
      if (prev) {
        prev.score += contrib;
      } else {
        scores.set(key, { hit: { ...hit }, score: contrib });
      }
    }
  }
  return [...scores.values()]
    .map(({ hit, score }) => ({ ...hit, score }))
    .sort((a, b) => b.score - a.score);
}

interface SearchRow {
  source: HitSource;
  id: number;
  text: string;
  title: string;
  url: string | null;
  company_slug: string | null;
  company_name: string | null;
  axis_name: string | null;
  domain_slug: string | null;
}

async function ftsArticles(query: string, limit: number): Promise<{ key: string; rank: number; hit: RagHit }[]> {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];
  const myProjectFilter = shouldHideMyProject() ? sql`AND co.slug != ${MY_PROJECT_SLUG}` : sql``;
  const rows = await db.all<SearchRow & { rank: number }>(sql`
    SELECT
      'article'      AS source,
      a.id           AS id,
      snippet(articles_fts, 2, '', '', '…', 24) AS text,
      a.title        AS title,
      a.url          AS url,
      co.slug        AS company_slug,
      co.name_ko     AS company_name,
      NULL           AS axis_name,
      NULL           AS domain_slug,
      bm25(articles_fts) AS rank
    FROM articles_fts
    JOIN articles a   ON a.id = articles_fts.rowid
    JOIN sources s    ON s.id = a.source_id
    JOIN companies co ON co.id = s.company_id
    WHERE articles_fts MATCH ${ftsQuery}
      ${myProjectFilter}
    ORDER BY rank
    LIMIT ${limit}
  `);
  return rows.map((r, i) => ({
    key: `article:${r.id}`,
    rank: i,
    hit: rowToHit(r),
  }));
}

async function vectorArticles(qvec: Buffer, limit: number): Promise<{ key: string; rank: number; hit: RagHit }[]> {
  // vec0 MATCH returns rowid + distance. We then join chunks → articles → companies.
  const rows = sqliteHandle
    .prepare(
      `SELECT 'article'   AS source,
              a.id        AS id,
              ch.chunk_text AS text,
              a.title     AS title,
              a.url       AS url,
              co.slug     AS company_slug,
              co.name_ko  AS company_name,
              NULL        AS axis_name,
              NULL        AS domain_slug,
              v.distance  AS distance
       FROM article_embeddings v
       JOIN article_chunks ch ON ch.rowid = v.rowid
       JOIN articles a        ON a.id = ch.article_id
       JOIN sources s         ON s.id = a.source_id
       JOIN companies co      ON co.id = s.company_id
       WHERE v.embedding MATCH ?
         AND k = ?
         ${shouldHideMyProject() ? `AND co.slug != '${MY_PROJECT_SLUG}'` : ''}
       ORDER BY v.distance`,
    )
    .all(qvec, limit) as Array<SearchRow & { distance: number }>;
  // Dedupe — multiple chunks of one article should only count once.
  const seen = new Set<number>();
  return rows
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r, i) => ({ key: `article:${r.id}`, rank: i, hit: rowToHit(r) }));
}

async function vectorCells(qvec: Buffer, limit: number): Promise<{ key: string; rank: number; hit: RagHit }[]> {
  const myProjectFilter = shouldHideMyProject() ? `AND co.slug != '${MY_PROJECT_SLUG}'` : '';
  const rows = sqliteHandle
    .prepare(
      `SELECT 'cell'      AS source,
              c.id        AS id,
              ch.chunk_text AS text,
              ax.name || ' — ' || coalesce(co.name_ko, co.name) AS title,
              NULL        AS url,
              co.slug     AS company_slug,
              co.name_ko  AS company_name,
              ax.name     AS axis_name,
              ax.domain_slug AS domain_slug,
              v.distance  AS distance
       FROM cell_embeddings v
       JOIN cell_chunks ch ON ch.rowid = v.rowid
       JOIN cells c        ON c.id = ch.cell_id
       JOIN axes ax        ON ax.id = c.axis_id
       JOIN companies co   ON co.id = c.company_id
       WHERE v.embedding MATCH ?
         AND k = ?
         ${myProjectFilter}
       ORDER BY v.distance`,
    )
    .all(qvec, limit) as Array<SearchRow & { distance: number }>;
  return rows.map((r, i) => ({ key: `cell:${r.id}`, rank: i, hit: rowToHit(r) }));
}

function rowToHit(r: SearchRow): RagHit {
  return {
    source: r.source,
    id: r.id,
    text: r.text,
    title: r.title,
    url: r.url ?? undefined,
    companySlug: r.company_slug ?? undefined,
    companyName: r.company_name ?? undefined,
    axisName: r.axis_name ?? undefined,
    domainSlug: r.domain_slug ?? undefined,
    score: 0,
  };
}

/** Returns top-N hybrid results across cells + articles, ranked by RRF. */
export async function hybridSearch(query: string, topN = 8): Promise<RagHit[]> {
  // Embedding call is the slow leg (~50ms locally). Fire it first.
  let qvec: Buffer | null = null;
  try {
    const emb = await embedQuery(query);
    qvec = vecToBuffer(emb);
  } catch {
    // Ollama down — degrade to FTS-only.
  }

  const rankings: { key: string; rank: number; hit: RagHit }[][] = [];
  rankings.push(await ftsArticles(query, 20));
  if (qvec) {
    rankings.push(await vectorArticles(qvec, 20));
    rankings.push(await vectorCells(qvec, 20));
  }
  return rrfMerge(...rankings).slice(0, topN);
}
