-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE source_type AS ENUM ('blog', 'video');

-- Companies
CREATE TABLE companies (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(64) NOT NULL,
  name         VARCHAR(128) NOT NULL,
  name_ko      VARCHAR(128),
  blog_url     TEXT,
  github_url   TEXT,
  logo_url     TEXT,
  description  TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX companies_slug_idx ON companies(slug);

-- Sources
CREATE TABLE sources (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id),
  type            source_type NOT NULL DEFAULT 'blog',
  feed_url        TEXT NOT NULL,
  home_url        TEXT,
  adapter         VARCHAR(64) NOT NULL,
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_crawled_at TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX sources_feed_idx ON sources(feed_url);
CREATE INDEX sources_company_idx ON sources(company_id);

-- Articles
CREATE TABLE articles (
  id            SERIAL PRIMARY KEY,
  source_id     INTEGER NOT NULL REFERENCES sources(id),
  url           TEXT NOT NULL,
  url_hash      VARCHAR(64) NOT NULL,
  title         TEXT NOT NULL,
  author        VARCHAR(128),
  published_at  TIMESTAMP,
  body_md       TEXT NOT NULL,
  body_hash     VARCHAR(64) NOT NULL,
  summary       TEXT,
  decisions     JSONB,
  tags          TEXT[] DEFAULT ARRAY[]::TEXT[],
  domains       TEXT[] DEFAULT ARRAY[]::TEXT[],
  llm_cost      REAL DEFAULT 0,
  llm_model     VARCHAR(64),
  processed_at  TIMESTAMP,
  embedded_at   TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX articles_url_hash_idx ON articles(url_hash);
CREATE INDEX articles_source_idx ON articles(source_id);
CREATE INDEX articles_published_idx ON articles(published_at);
CREATE INDEX articles_domains_idx ON articles USING GIN(domains);
CREATE INDEX articles_tags_idx ON articles USING GIN(tags);

-- Full-text search column (Korean + English)
ALTER TABLE articles ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body_md,'')), 'C')
  ) STORED;
CREATE INDEX articles_tsv_idx ON articles USING GIN(tsv);
CREATE INDEX articles_title_trgm_idx ON articles USING GIN(title gin_trgm_ops);

-- Chunks (with embeddings)
CREATE TABLE chunks (
  id           SERIAL PRIMARY KEY,
  article_id   INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  idx          INTEGER NOT NULL,
  text         TEXT NOT NULL,
  token_count  INTEGER,
  heading      TEXT,
  embedding    vector(1024),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX chunks_article_idx ON chunks(article_id);
-- IVFFlat for cosine similarity. Tune `lists` ~ sqrt(rows). 100 is fine up to 10k chunks.
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add tsvector to chunks too for hybrid search
ALTER TABLE chunks ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED;
CREATE INDEX chunks_tsv_idx ON chunks USING GIN(tsv);

-- Domains and axes
CREATE TABLE domains (
  slug         VARCHAR(64) PRIMARY KEY,
  name         VARCHAR(128) NOT NULL,
  description  TEXT,
  priority     INTEGER NOT NULL DEFAULT 0,
  enabled      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE axes (
  id           SERIAL PRIMARY KEY,
  domain_slug  VARCHAR(64) NOT NULL REFERENCES domains(slug),
  slug         VARCHAR(64) NOT NULL,
  name         VARCHAR(128) NOT NULL,
  question     TEXT,
  options      TEXT[],
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX axes_domain_slug_idx ON axes(domain_slug, slug);

-- Comparison cells (the heart of the comparison page)
CREATE TABLE cells (
  id                SERIAL PRIMARY KEY,
  axis_id           INTEGER NOT NULL REFERENCES axes(id) ON DELETE CASCADE,
  company_id        INTEGER NOT NULL REFERENCES companies(id),
  cell_summary      TEXT,
  evidence          JSONB,
  confidence        REAL DEFAULT 0,
  is_verified       INTEGER NOT NULL DEFAULT 0,
  last_verified_at  TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX cells_axis_company_idx ON cells(axis_id, company_id);

-- LLM cost tracking
CREATE TABLE llm_costs (
  id                  SERIAL PRIMARY KEY,
  day                 VARCHAR(10) NOT NULL,
  model               VARCHAR(64) NOT NULL,
  operation           VARCHAR(32) NOT NULL,
  input_tokens        INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens       INTEGER NOT NULL DEFAULT 0,
  cost_usd            REAL NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX llm_costs_day_idx ON llm_costs(day);
