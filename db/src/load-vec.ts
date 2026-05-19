import * as sqliteVec from 'sqlite-vec';
import type Database from 'better-sqlite3';

/**
 * Load the sqlite-vec extension onto a better-sqlite3 connection.
 * Idempotent at the SQLite level — calling more than once on the same handle
 * is a no-op after the first load.
 *
 * vec0 virtual tables provide KNN search over float32 vectors. We use the
 * 768-dim nomic-embed-text output by default; bge-m3 (1024) requires
 * recreating the tables with a different dim.
 */
export function loadSqliteVec(db: Database.Database): void {
  sqliteVec.load(db);
}

/** Pack a JS number[] embedding into a Float32 Buffer for INSERT. */
export function embeddingToBuffer(vec: number[]): Buffer {
  return Buffer.from(new Float32Array(vec).buffer);
}
