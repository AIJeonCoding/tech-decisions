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
  lastVerifiedAt: string | null;
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

export async function getDomainStats(): Promise<Array<{
  domain: string;
  article_count: number;
  company_count: number;
  last_updated: string | null;
}>> {
  return db.all<{
    domain: string; article_count: number; company_count: number; last_updated: string | null;
  }>(sql`
    SELECT
      d.slug AS domain,
      COUNT(DISTINCT a.id) AS article_count,
      COUNT(DISTINCT s.company_id) AS company_count,
      MAX(a.updated_at) AS last_updated
    FROM domains d
    LEFT JOIN articles a
      ON EXISTS (SELECT 1 FROM json_each(a.domains) j WHERE j.value = d.slug)
    LEFT JOIN sources s ON s.id = a.source_id
    GROUP BY d.slug
  `);
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

export async function getArticleById(id: number) {
  const rows = await db
    .select({
      id: articles.id,
      url: articles.url,
      title: articles.title,
      author: articles.author,
      summary: articles.summary,
      bodyMd: articles.bodyMd,
      publishedAt: articles.publishedAt,
      tags: articles.tags,
      domains: articles.domains,
      decisions: articles.decisions,
      processedAt: articles.processedAt,
      companySlug: companies.slug,
      companyName: companies.name,
      companyNameKo: companies.nameKo,
      companyBlogUrl: companies.blogUrl,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .innerJoin(companies, eq(companies.id, sources.companyId))
    .where(eq(articles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllArticleIds() {
  return db.select({ id: articles.id, updatedAt: articles.updatedAt }).from(articles);
}

export async function getCompanyBySlug(slug: string) {
  const rows = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getArticlesByCompanySlug(slug: string) {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      summary: articles.summary,
      domains: articles.domains,
      tags: articles.tags,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .innerJoin(companies, eq(companies.id, sources.companyId))
    .where(eq(companies.slug, slug))
    .orderBy(desc(articles.publishedAt));
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
