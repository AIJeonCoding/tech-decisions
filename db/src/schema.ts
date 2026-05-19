import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  real,
} from 'drizzle-orm/sqlite-core';

// SQLite has no native array/jsonb types. We store arrays/objects as JSON strings
// using Drizzle's `mode: 'json'` which auto-(de)serializes.

export const companies = sqliteTable(
  'companies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nameKo: text('name_ko'),
    blogUrl: text('blog_url'),
    githubUrl: text('github_url'),
    logoUrl: text('logo_url'),
    description: text('description'),
    // 'bigtech' = 네카라쿠배당토 + 글로벌 빅테크 / 'scaleup' = 공신력 유니콘·중견 스타트업
    // / 'personal' = my-project. 검색 결과 정렬·필터링에 사용.
    tier: text('tier', { enum: ['bigtech', 'scaleup', 'personal'] }).notNull().default('scaleup'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('companies_slug_idx').on(t.slug),
  }),
);

export const sources = sqliteTable(
  'sources',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    companyId: integer('company_id').notNull().references(() => companies.id),
    type: text('type', { enum: ['blog', 'video'] }).notNull().default('blog'),
    feedUrl: text('feed_url').notNull(),
    homeUrl: text('home_url'),
    adapter: text('adapter').notNull(),
    enabled: integer('enabled').notNull().default(1),
    lastCrawledAt: text('last_crawled_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  },
  (t) => ({
    feedIdx: uniqueIndex('sources_feed_idx').on(t.feedUrl),
    companyIdx: index('sources_company_idx').on(t.companyId),
  }),
);

export const articles = sqliteTable(
  'articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    url: text('url').notNull(),
    urlHash: text('url_hash').notNull(),
    title: text('title').notNull(),
    author: text('author'),
    publishedAt: text('published_at'), // ISO string
    bodyMd: text('body_md').notNull(),
    bodyHash: text('body_hash').notNull(),
    summary: text('summary'),
    decisions: text('decisions', { mode: 'json' }).$type<Array<{
      axis: string;
      choice: string;
      rationale: string;
      quote: string;
      confidence: number;
    }>>(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    domains: text('domains', { mode: 'json' }).$type<string[]>().default([]),
    llmCost: real('llm_cost').default(0),
    llmModel: text('llm_model'),
    processedAt: text('processed_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
  },
  (t) => ({
    urlHashIdx: uniqueIndex('articles_url_hash_idx').on(t.urlHash),
    sourceIdx: index('articles_source_idx').on(t.sourceId),
    publishedIdx: index('articles_published_idx').on(t.publishedAt),
  }),
);

export const domains = sqliteTable('domains', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  priority: integer('priority').notNull().default(0),
  enabled: integer('enabled').notNull().default(1),
});

export const axes = sqliteTable(
  'axes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    domainSlug: text('domain_slug').notNull().references(() => domains.slug),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    question: text('question'),
    options: text('options', { mode: 'json' }).$type<string[]>(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    domainSlugIdx: uniqueIndex('axes_domain_slug_idx').on(t.domainSlug, t.slug),
  }),
);

export const cells = sqliteTable(
  'cells',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    axisId: integer('axis_id').notNull().references(() => axes.id, { onDelete: 'cascade' }),
    companyId: integer('company_id').notNull().references(() => companies.id),
    cellSummary: text('cell_summary'),
    evidence: text('evidence', { mode: 'json' }).$type<Array<{
      articleId: number;
      url: string;
      title: string;
      quote: string;
      publishedAt: string | null;
    }>>(),
    confidence: real('confidence').default(0),
    isVerified: integer('is_verified').notNull().default(0),
    lastVerifiedAt: text('last_verified_at'),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
  },
  (t) => ({
    axisCompanyIdx: uniqueIndex('cells_axis_company_idx').on(t.axisId, t.companyId),
  }),
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Domain = typeof domains.$inferSelect;
export type Axis = typeof axes.$inferSelect;
export type Cell = typeof cells.$inferSelect;
