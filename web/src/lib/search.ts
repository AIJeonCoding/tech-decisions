import { sql } from 'drizzle-orm';
import { db } from './db';
import { embedQuery } from './embed';

export interface RetrievedChunk {
  chunkId: number;
  articleId: number;
  text: string;
  heading: string | null;
  title: string;
  url: string;
  publishedAt: Date | null;
  companySlug: string;
  companyName: string;
  companyNameKo: string | null;
  vectorScore: number;
  bm25Score: number;
  fusedScore: number;
}

interface HybridOpts {
  query: string;
  topK?: number;
  perRetriever?: number;
  domainSlug?: string;
}

/**
 * Hybrid retrieval: vector top-N + BM25 top-N, RRF-merged.
 * Returns top-K chunks with article + company metadata for citation.
 */
export async function hybridSearch(opts: HybridOpts): Promise<RetrievedChunk[]> {
  const { query, topK = 8, perRetriever = 20, domainSlug } = opts;

  const qVec = await embedQuery(query);
  const qVecLiteral = `[${qVec.join(',')}]`;

  const domainFilter = domainSlug
    ? sql`AND a.domains && ARRAY[${domainSlug}]::text[]`
    : sql``;

  // Vector top-N
  const vec = await db.execute<{
    chunk_id: number; article_id: number; text: string; heading: string | null;
    title: string; url: string; published_at: Date | null;
    company_slug: string; company_name: string; company_name_ko: string | null;
    score: number;
  }>(sql`
    SELECT
      c.id AS chunk_id,
      c.article_id,
      c.text,
      c.heading,
      a.title,
      a.url,
      a.published_at,
      co.slug AS company_slug,
      co.name AS company_name,
      co.name_ko AS company_name_ko,
      1 - (c.embedding <=> ${qVecLiteral}::vector) AS score
    FROM chunks c
    JOIN articles a ON a.id = c.article_id
    JOIN sources s ON s.id = a.source_id
    JOIN companies co ON co.id = s.company_id
    WHERE c.embedding IS NOT NULL
    ${domainFilter}
    ORDER BY c.embedding <=> ${qVecLiteral}::vector ASC
    LIMIT ${perRetriever}
  `);

  // BM25 top-N (tsvector ranking — pseudo-BM25)
  const bm = await db.execute<{
    chunk_id: number; article_id: number; text: string; heading: string | null;
    title: string; url: string; published_at: Date | null;
    company_slug: string; company_name: string; company_name_ko: string | null;
    score: number;
  }>(sql`
    SELECT
      c.id AS chunk_id,
      c.article_id,
      c.text,
      c.heading,
      a.title,
      a.url,
      a.published_at,
      co.slug AS company_slug,
      co.name AS company_name,
      co.name_ko AS company_name_ko,
      ts_rank_cd(c.tsv, plainto_tsquery('simple', ${query})) AS score
    FROM chunks c
    JOIN articles a ON a.id = c.article_id
    JOIN sources s ON s.id = a.source_id
    JOIN companies co ON co.id = s.company_id
    WHERE c.tsv @@ plainto_tsquery('simple', ${query})
    ${domainFilter}
    ORDER BY score DESC
    LIMIT ${perRetriever}
  `);

  const rrfK = 60;
  type Row = (typeof vec)[number];
  const ranks = new Map<number, { row: Row; vRank: number; bRank: number; vScore: number; bScore: number }>();

  vec.forEach((r: typeof vec[number], i: number) => {
    ranks.set(r.chunk_id, { row: r, vRank: i + 1, bRank: 9999, vScore: r.score, bScore: 0 });
  });
  bm.forEach((r: typeof bm[number], i: number) => {
    const cur = ranks.get(r.chunk_id);
    if (cur) {
      cur.bRank = i + 1;
      cur.bScore = r.score;
    } else {
      ranks.set(r.chunk_id, { row: r, vRank: 9999, bRank: i + 1, vScore: 0, bScore: r.score });
    }
  });

  const fused = Array.from(ranks.values())
    .map((x) => ({
      ...x,
      fused: 1 / (rrfK + x.vRank) + 1 / (rrfK + x.bRank),
    }))
    .sort((a, b) => b.fused - a.fused)
    .slice(0, topK);

  return fused.map<RetrievedChunk>((x) => ({
    chunkId: x.row.chunk_id,
    articleId: x.row.article_id,
    text: x.row.text,
    heading: x.row.heading,
    title: x.row.title,
    url: x.row.url,
    publishedAt: x.row.published_at,
    companySlug: x.row.company_slug,
    companyName: x.row.company_name,
    companyNameKo: x.row.company_name_ko,
    vectorScore: x.vScore,
    bm25Score: x.bScore,
    fusedScore: x.fused,
  }));
}
