import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

// Resolve a stable repo-root path so all workspaces (db/, crawler/, web/)
// open the same SQLite file regardless of cwd.
const here = fileURLToPath(import.meta.url);
// db/src/index.ts → up two levels = monorepo root.
const repoRoot = path.resolve(path.dirname(here), '..', '..');
const DEFAULT_PATH = path.join(repoRoot, 'tech-decisions.db');

// Candidate paths in resolution priority order. The first one that exists wins.
// This handles dev (monorepo root), Vercel serverless (function cwd), and
// explicit override via SQLITE_PATH.
const candidates = [
  process.env.SQLITE_PATH,
  DEFAULT_PATH,
  path.join(process.cwd(), 'tech-decisions.db'),
  // Vercel serverless functions deploy under /var/task by default.
  '/var/task/tech-decisions.db',
  // Also try web/ subdirectory inside the function bundle.
  path.join(process.cwd(), 'web', 'tech-decisions.db'),
  '/var/task/web/tech-decisions.db',
].filter(Boolean) as string[];

const dbPath = candidates.find((p) => existsSync(p)) ?? DEFAULT_PATH;
const onVercel = !!process.env.VERCEL;

// In Vercel runtime the filesystem is read-only and WAL is not supported.
// In build/dev we want full read-write + WAL.
const sqlite = new Database(dbPath);
try {
  if (!onVercel) {
    sqlite.pragma('journal_mode = WAL');
  }
  sqlite.pragma('foreign_keys = ON');
} catch {
  // ignore pragma errors on read-only filesystems
}

export const db = drizzle(sqlite, { schema, logger: process.env.DB_LOG === '1' });
export const sqliteHandle = sqlite;
export * from './schema.js';
export { schema };
