import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  real,
  customType,
} from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1024)';
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value) {
    if (typeof value !== 'string') return [];
    return value.replace(/^\[|\]$/g, '').split(',').map(Number);
  },
});

export const sourceType = pgEnum('source_type', ['blog', 'video']);

export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    nameKo: varchar('name_ko', { length: 128 }),
    blogUrl: text('blog_url'),
    githubUrl: text('github_url'),
    logoUrl: text('logo_url'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('companies_slug_idx').on(t.slug),
  })
);

export const sources = pgTable(
  'sources',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').notNull().references(() => companies.id),
    type: sourceType('type').notNull().default('blog'),
    feedUrl: text('feed_url').notNull(),
    homeUrl: text('home_url'),
    adapter: varchar('adapter', { length: 64 }).notNull(),
    enabled: integer('enabled').notNull().default(1),
    lastCrawledAt: timestamp('last_crawled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    feedIdx: uniqueIndex('sources_feed_idx').on(t.feedUrl),
    companyIdx: index('sources_company_idx').on(t.companyId),
  })
);

export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    sourceId: integer('source_id').notNull().references(() => sources.id),
    url: text('url').notNull(),
    urlHash: varchar('url_hash', { length: 64 }).notNull(),
    title: text('title').notNull(),
    author: varchar('author', { length: 128 }),
    publishedAt: timestamp('published_at'),
    bodyMd: text('body_md').notNull(),
    bodyHash: varchar('body_hash', { length: 64 }).notNull(),
    summary: text('summary'),
    decisions: jsonb('decisions').$type<Array<{
      axis: string;
      choice: string;
      rationale: string;
      quote: string;
      confidence: number;
    }>>(),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),
    domains: text('domains').array().default(sql`ARRAY[]::text[]`),
    llmCost: real('llm_cost').default(0),
    llmModel: varchar('llm_model', { length: 64 }),
    processedAt: timestamp('processed_at'),
    embeddedAt: timestamp('embedded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    urlHashIdx: uniqueIndex('articles_url_hash_idx').on(t.urlHash),
    sourceIdx: index('articles_source_idx').on(t.sourceId),
    publishedIdx: index('articles_published_idx').on(t.publishedAt),
    domainsIdx: index('articles_domains_idx').using('gin', t.domains),
    tagsIdx: index('articles_tags_idx').using('gin', t.tags),
  })
);

export const chunks = pgTable(
  'chunks',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    text: text('text').notNull(),
    tokenCount: integer('token_count'),
    heading: text('heading'),
    embedding: vector('embedding'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    articleIdx: index('chunks_article_idx').on(t.articleId),
    embeddingIdx: index('chunks_embedding_idx')
      .using('ivfflat', sql`embedding vector_cosine_ops`)
      .with({ lists: 100 }),
  })
);

export const domains = pgTable('domains', {
  slug: varchar('slug', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  priority: integer('priority').notNull().default(0),
  enabled: integer('enabled').notNull().default(1),
});

export const axes = pgTable(
  'axes',
  {
    id: serial('id').primaryKey(),
    domainSlug: varchar('domain_slug', { length: 64 }).notNull().references(() => domains.slug),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    question: text('question'),
    options: text('options').array(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    domainSlugIdx: uniqueIndex('axes_domain_slug_idx').on(t.domainSlug, t.slug),
  })
);

export const cells = pgTable(
  'cells',
  {
    id: serial('id').primaryKey(),
    axisId: integer('axis_id').notNull().references(() => axes.id, { onDelete: 'cascade' }),
    companyId: integer('company_id').notNull().references(() => companies.id),
    cellSummary: text('cell_summary'),
    evidence: jsonb('evidence').$type<Array<{
      articleId: number;
      url: string;
      title: string;
      quote: string;
      publishedAt: string | null;
    }>>(),
    confidence: real('confidence').default(0),
    isVerified: integer('is_verified').notNull().default(0),
    lastVerifiedAt: timestamp('last_verified_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    axisCompanyIdx: uniqueIndex('cells_axis_company_idx').on(t.axisId, t.companyId),
  })
);

export const llmCosts = pgTable(
  'llm_costs',
  {
    id: serial('id').primaryKey(),
    day: varchar('day', { length: 10 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    operation: varchar('operation', { length: 32 }).notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    dayIdx: index('llm_costs_day_idx').on(t.day),
  })
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
export type Domain = typeof domains.$inferSelect;
export type Axis = typeof axes.$inferSelect;
export type Cell = typeof cells.$inferSelect;
