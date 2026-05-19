import { sql } from 'drizzle-orm';
import { db, sqliteHandle, embeddingToBuffer } from '@td/db';
import { embed, OLLAMA_MODELS } from '../lib/ollama.js';
import { logger } from '../lib/log.js';

const log = logger('embed');

/** Coarse chunker — splits long article bodies into 1500-char windows with 200-char overlap. */
function chunkText(text: string, max = 1500, overlap = 200): string[] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + max));
    if (i + max >= clean.length) break;
    i += max - overlap;
  }
  return out;
}

interface EmbedOpts {
  /** Re-embed even if rows exist. Default false — skip articles/cells already indexed. */
  force?: boolean;
  /** Cap how many source rows to process. Default: all. */
  limit?: number;
}

export async function embedArticles(opts: EmbedOpts = {}): Promise<void> {
  const { force = false, limit } = opts;

  // Wipe stale rows when force mode is on. Foreign keys cascade vec0 won't —
  // we manage both tables manually.
  if (force) {
    sqliteHandle.exec('DELETE FROM article_embeddings; DELETE FROM article_chunks;');
    log.info('Cleared previous article embeddings.');
  }

  const indexed = new Set<number>(
    sqliteHandle
      .prepare('SELECT DISTINCT article_id FROM article_chunks')
      .all()
      .map((r) => (r as { article_id: number }).article_id),
  );

  const rows = await db.all<{ id: number; title: string; summary: string | null; body_md: string }>(
    sql`SELECT id, title, summary, body_md FROM articles ORDER BY id`,
  );
  const todo = rows.filter((r) => force || !indexed.has(r.id));
  const capped = typeof limit === 'number' ? todo.slice(0, limit) : todo;

  log.info(`Articles to embed: ${capped.length} (skipped ${rows.length - capped.length} already indexed)`);

  const insertChunk = sqliteHandle.prepare(
    'INSERT INTO article_chunks (article_id, chunk_idx, chunk_text) VALUES (?, ?, ?)',
  );
  const insertVec = sqliteHandle.prepare(
    'INSERT INTO article_embeddings (rowid, embedding) VALUES (?, ?)',
  );

  const tx = sqliteHandle.transaction((articleId: number, chunks: { text: string; vec: number[] }[]) => {
    for (let i = 0; i < chunks.length; i++) {
      const res = insertChunk.run(articleId, i, chunks[i]!.text);
      const rowid = typeof res.lastInsertRowid === 'bigint' ? res.lastInsertRowid : BigInt(res.lastInsertRowid);
      insertVec.run(rowid, embeddingToBuffer(chunks[i]!.vec));
    }
  });

  for (const a of capped) {
    try {
      const head = [a.title, a.summary ?? ''].filter(Boolean).join('\n');
      const pieces = chunkText(`${head}\n${a.body_md}`);
      const vecs: { text: string; vec: number[] }[] = [];
      for (const p of pieces) {
        vecs.push({ text: p, vec: await embed(p) });
      }
      tx(a.id, vecs);
      log.info(`  ✓ article #${a.id} (${pieces.length} chunks) ${a.title.slice(0, 50)}…`);
    } catch (e) {
      log.error(`  ✗ article #${a.id}: ${(e as Error).message}`);
    }
  }
}

export async function embedCells(opts: EmbedOpts = {}): Promise<void> {
  const { force = false, limit } = opts;

  if (force) {
    sqliteHandle.exec('DELETE FROM cell_embeddings; DELETE FROM cell_chunks;');
    log.info('Cleared previous cell embeddings.');
  }

  const indexed = new Set<number>(
    sqliteHandle
      .prepare('SELECT DISTINCT cell_id FROM cell_chunks')
      .all()
      .map((r) => (r as { cell_id: number }).cell_id),
  );

  // Cells embed cell_summary + axis name + company name for richer signal.
  const rows = await db.all<{
    id: number;
    cell_summary: string | null;
    axis_name: string;
    company_name: string;
    company_name_ko: string | null;
  }>(sql`
    SELECT c.id, c.cell_summary,
           a.name        AS axis_name,
           co.name       AS company_name,
           co.name_ko    AS company_name_ko
    FROM cells c
    JOIN axes a       ON a.id = c.axis_id
    JOIN companies co ON co.id = c.company_id
    WHERE c.cell_summary IS NOT NULL AND c.cell_summary != ''
    ORDER BY c.id
  `);
  const todo = rows.filter((r) => force || !indexed.has(r.id));
  const capped = typeof limit === 'number' ? todo.slice(0, limit) : todo;

  log.info(`Cells to embed: ${capped.length} (skipped ${rows.length - capped.length})`);

  const insertChunk = sqliteHandle.prepare(
    'INSERT INTO cell_chunks (cell_id, chunk_text) VALUES (?, ?)',
  );
  const insertVec = sqliteHandle.prepare(
    'INSERT INTO cell_embeddings (rowid, embedding) VALUES (?, ?)',
  );

  for (const c of capped) {
    try {
      const company = c.company_name_ko ?? c.company_name;
      const text = `[${company} — ${c.axis_name}] ${c.cell_summary}`;
      const vec = await embed(text);
      const res = insertChunk.run(c.id, text);
      const rowid = typeof res.lastInsertRowid === 'bigint' ? res.lastInsertRowid : BigInt(res.lastInsertRowid);
      insertVec.run(rowid, embeddingToBuffer(vec));
      log.info(`  ✓ cell #${c.id} ${text.slice(0, 60)}…`);
    } catch (e) {
      log.error(`  ✗ cell #${c.id}: ${(e as Error).message}`);
    }
  }
}

export async function embedAll(opts: EmbedOpts = {}): Promise<void> {
  log.info(`Using embed model: ${OLLAMA_MODELS.embed}`);
  await embedCells(opts);
  await embedArticles(opts);
  const cellCount = (sqliteHandle.prepare('SELECT COUNT(*) AS n FROM cell_embeddings').get() as { n: number }).n;
  const artCount = (sqliteHandle.prepare('SELECT COUNT(*) AS n FROM article_embeddings').get() as { n: number }).n;
  log.info(`Done. cell_embeddings=${cellCount} article_embeddings=${artCount}`);
}
