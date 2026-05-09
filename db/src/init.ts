/**
 * One-shot DB initializer.
 * Creates all tables + FTS5 virtual table for full-text search.
 * Idempotent — safe to run repeatedly.
 */
import { sqliteHandle } from './index.js';

const DDL = `
CREATE TABLE IF NOT EXISTS companies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  name_ko     TEXT,
  blog_url    TEXT,
  github_url  TEXT,
  logo_url    TEXT,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_idx ON companies(slug);

CREATE TABLE IF NOT EXISTS sources (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id),
  type            TEXT NOT NULL DEFAULT 'blog',
  feed_url        TEXT NOT NULL,
  home_url        TEXT,
  adapter         TEXT NOT NULL,
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_crawled_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS sources_feed_idx ON sources(feed_url);
CREATE INDEX IF NOT EXISTS sources_company_idx ON sources(company_id);

CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    INTEGER NOT NULL REFERENCES sources(id),
  url          TEXT NOT NULL,
  url_hash     TEXT NOT NULL,
  title        TEXT NOT NULL,
  author       TEXT,
  published_at TEXT,
  body_md      TEXT NOT NULL,
  body_hash    TEXT NOT NULL,
  summary      TEXT,
  decisions    TEXT,    -- JSON array
  tags         TEXT DEFAULT '[]',  -- JSON array
  domains      TEXT DEFAULT '[]',  -- JSON array
  llm_cost     REAL DEFAULT 0,
  llm_model    TEXT,
  processed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS articles_url_hash_idx ON articles(url_hash);
CREATE INDEX IF NOT EXISTS articles_source_idx ON articles(source_id);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(published_at);

-- FTS5 virtual table mirrors articles for full-text search.
-- Tokenizer: unicode61 + diacritic removal works well enough for Korean
-- (jamo decomposition handled by the tokenizer at token level).
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  summary,
  body,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3 4'
);

-- Triggers to keep FTS in sync with articles
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, body)
  VALUES (new.id, new.title, coalesce(new.summary,''), new.body_md);
END;
CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  DELETE FROM articles_fts WHERE rowid = old.id;
END;
CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  DELETE FROM articles_fts WHERE rowid = old.id;
  INSERT INTO articles_fts(rowid, title, summary, body)
  VALUES (new.id, new.title, coalesce(new.summary,''), new.body_md);
END;

CREATE TABLE IF NOT EXISTS domains (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  priority    INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS axes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_slug TEXT NOT NULL REFERENCES domains(slug),
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  question    TEXT,
  options     TEXT,  -- JSON array
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS axes_domain_slug_idx ON axes(domain_slug, slug);

CREATE TABLE IF NOT EXISTS cells (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  axis_id          INTEGER NOT NULL REFERENCES axes(id) ON DELETE CASCADE,
  company_id       INTEGER NOT NULL REFERENCES companies(id),
  cell_summary     TEXT,
  evidence         TEXT,  -- JSON array
  confidence       REAL DEFAULT 0,
  is_verified      INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS cells_axis_company_idx ON cells(axis_id, company_id);
`;

console.log('Running DDL...');
sqliteHandle.exec(DDL);
console.log('DB initialized.');
process.exit(0);
