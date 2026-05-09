import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db, domains, axes, cells, companies, articles, sources } from './db';

export async function getDomain(slug: string) {
  const rows = await db.select().from(domains).where(eq(domains.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAxesForDomain(slug: string) {
  return db.select().from(axes).where(eq(axes.domainSlug, slug)).orderBy(axes.sortOrder);
}

export async function getAllCompanies() {
  return db.select().from(companies);
}

export interface CellWithCompany {
  id: number;
  axisId: number;
  axisSlug: string;
  axisName: string;
  companyId: number;
  companySlug: string;
  companyName: string;
  companyNameKo: string | null;
  cellSummary: string | null;
  evidence: Array<{
    articleId: number;
    url: string;
    title: string;
    quote: string;
    publishedAt: string | null;
  }> | null;
  confidence: number | null;
  isVerified: number;
  lastVerifiedAt: Date | null;
}

export async function getCellsForDomain(domainSlug: string): Promise<CellWithCompany[]> {
  const result = await db
    .select({
      id: cells.id,
      axisId: cells.axisId,
      axisSlug: axes.slug,
      axisName: axes.name,
      companyId: cells.companyId,
      companySlug: companies.slug,
      companyName: companies.name,
      companyNameKo: companies.nameKo,
      cellSummary: cells.cellSummary,
      evidence: cells.evidence,
      confidence: cells.confidence,
      isVerified: cells.isVerified,
      lastVerifiedAt: cells.lastVerifiedAt,
    })
    .from(cells)
    .innerJoin(axes, eq(axes.id, cells.axisId))
    .innerJoin(companies, eq(companies.id, cells.companyId))
    .where(eq(axes.domainSlug, domainSlug));
  return result;
}

export async function getCompaniesWithDecisions(domainSlug: string) {
  const result = await db
    .selectDistinct({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      nameKo: companies.nameKo,
      blogUrl: companies.blogUrl,
    })
    .from(cells)
    .innerJoin(axes, eq(axes.id, cells.axisId))
    .innerJoin(companies, eq(companies.id, cells.companyId))
    .where(eq(axes.domainSlug, domainSlug));
  return result;
}

export async function getDomainStats() {
  const rows = await db.execute<{
    domain: string; article_count: number; company_count: number; last_updated: Date | null;
  }>(sql`
    SELECT
      d.slug AS domain,
      COUNT(DISTINCT a.id)::int AS article_count,
      COUNT(DISTINCT s.company_id)::int AS company_count,
      MAX(a.updated_at) AS last_updated
    FROM domains d
    LEFT JOIN articles a ON a.domains && ARRAY[d.slug]::text[]
    LEFT JOIN sources s ON s.id = a.source_id
    GROUP BY d.slug
  `);
  return rows as unknown as Array<{
    domain: string; article_count: number; company_count: number; last_updated: Date | null;
  }>;
}

export async function getRecentArticles(limit = 12) {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      summary: articles.summary,
      tags: articles.tags,
      domains: articles.domains,
      publishedAt: articles.publishedAt,
      companySlug: companies.slug,
      companyName: companies.name,
      companyNameKo: companies.nameKo,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .innerJoin(companies, eq(companies.id, sources.companyId))
    .where(sql`${articles.summary} IS NOT NULL`)
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getArticlesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      summary: articles.summary,
      publishedAt: articles.publishedAt,
      companySlug: companies.slug,
      companyName: companies.name,
      companyNameKo: companies.nameKo,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .innerJoin(companies, eq(companies.id, sources.companyId))
    .where(inArray(articles.id, ids));
}
