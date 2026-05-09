import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

// Resolve a stable repo-root path so all workspaces (db/, crawler/, web/)
// open the same SQLite file regardless of cwd.
const here = fileURLToPath(import.meta.url);
// db/src/index.ts → up two levels = monorepo root.
const repoRoot = path.resolve(path.dirname(here), '..', '..');
const DEFAULT_PATH = path.join(repoRoot, 'tech-decisions.db');
const dbPath = process.env.SQLITE_PATH ?? DEFAULT_PATH;

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema, logger: process.env.DB_LOG === '1' });
export const sqliteHandle = sqlite;
export * from './schema.js';
export { schema };
