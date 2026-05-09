import { eq, and, desc, sql, inArray, ne } from 'drizzle-orm';
import { db, domains, axes, cells, companies, articles, sources } from './db';
import { shouldHideMyProject, MY_PROJECT_SLUG } from './feature-flags';

/**
 * Returns a Drizzle SQL clause that excludes my-project when the env flag says so.
 * Caller does: `.where(and(otherFilter, hideMyProjectClause()))`
 */
function hideMyProjectClause() {
  return shouldHideMyProject()
    ? sql`${companies.slug} != ${MY_PROJECT_SLUG}`
    : undefined;
}

export async function getDomain(slug: string) {
  const rows = await db.select().from(domains).where(eq(domains.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAxesForDomain(slug: string) {
  return db.select().from(axes).where(eq(axes.domainSlug, slug)).orderBy(axes.sortOrder);
}

export async function getAllCompanies() {
  if (shouldHideMyProject()) {
    return db.select().from(companies).where(ne(companies.slug, MY_PROJECT_SLUG));
  }
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
  const conditions = [eq(axes.domainSlug, domainSlug)];
  const hide = hideMyProjectClause();
  if (hide) conditions.push(hide);
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
    .where(and(...conditions));
  return result;
}

export async function getCompaniesWithDecisions(domainSlug: string) {
  const conditions = [eq(axes.domainSlug, domainSlug)];
  const hide = hideMyProjectClause();
  if (hide) conditions.push(hide);
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
    .where(and(...conditions));
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

export async function getCellsByCompanySlug(slug: string) {
  return db
    .select({
      cellId: cells.id,
      domainSlug: axes.domainSlug,
      axisName: axes.name,
      axisSlug: axes.slug,
      axisSortOrder: axes.sortOrder,
      cellSummary: cells.cellSummary,
      confidence: cells.confidence,
      isVerified: cells.isVerified,
      evidence: cells.evidence,
    })
    .from(cells)
    .innerJoin(axes, eq(axes.id, cells.axisId))
    .innerJoin(companies, eq(companies.id, cells.companyId))
    .where(eq(companies.slug, slug))
    .orderBy(axes.domainSlug, axes.sortOrder);
}

export async function getMyProjectCells(domainSlug: string) {
  // 공개 SEO 모드일 땐 my-project 미리보기 자체를 숨긴다.
  if (shouldHideMyProject()) return [];
  const result = await db
    .select({
      cellId: cells.id,
      axisId: cells.axisId,
      axisName: axes.name,
      axisSortOrder: axes.sortOrder,
      cellSummary: cells.cellSummary,
      confidence: cells.confidence,
      evidence: cells.evidence,
    })
    .from(cells)
    .innerJoin(axes, eq(axes.id, cells.axisId))
    .innerJoin(companies, eq(companies.id, cells.companyId))
    .where(and(eq(axes.domainSlug, domainSlug), eq(companies.slug, MY_PROJECT_SLUG)))
    .orderBy(axes.sortOrder);
  return result;
}

export async function getRecentArticles(limit = 12) {
  const conditions = [sql`${articles.summary} IS NOT NULL`];
  const hide = hideMyProjectClause();
  if (hide) conditions.push(hide);
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
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getArticleById(id: number) {
  const conditions = [eq(articles.id, id)];
  const hide = hideMyProjectClause();
  if (hide) conditions.push(hide);
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
    .where(and(...conditions))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllArticleIds() {
  // sitemap 생성용 — 공개 모드에선 my-project article ID 제외.
  if (shouldHideMyProject()) {
    return db
      .select({ id: articles.id, updatedAt: articles.updatedAt })
      .from(articles)
      .innerJoin(sources, eq(sources.id, articles.sourceId))
      .innerJoin(companies, eq(companies.id, sources.companyId))
      .where(ne(companies.slug, MY_PROJECT_SLUG));
  }
  return db.select({ id: articles.id, updatedAt: articles.updatedAt }).from(articles);
}

export async function getCompanyBySlug(slug: string) {
  // 공개 모드일 땐 my-project 회사 페이지 자체를 보여주지 않는다.
  if (shouldHideMyProject() && slug === MY_PROJECT_SLUG) return null;
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
