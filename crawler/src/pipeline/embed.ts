import { eq, isNull, sql, and } from 'drizzle-orm';
import { db, articles, chunks } from '@td/db';
import { chunkMarkdown } from '../lib/chunk.js';
import { embedTexts } from '../lib/embed.js';
import { logger } from '../lib/log.js';

const log = logger('embed');

const BATCH = 16; // Voyage allows 128 inputs per request, but smaller batches reduce retry cost

export async function embedBatch({ limit = 50 }: { limit?: number }) {
  const todo = await db
    .select({ id: articles.id, title: articles.title, bodyMd: articles.bodyMd })
    .from(articles)
    .where(and(isNull(articles.embeddedAt)))
    .limit(limit);

  log.info(`To embed: ${todo.length} articles`);
  let totalChunks = 0;

  for (const a of todo) {
    try {
      // Re-chunk fresh (idempotent: delete existing chunks first)
      await db.delete(chunks).where(eq(chunks.articleId, a.id));

      const chs = chunkMarkdown(a.bodyMd);
      if (chs.length === 0) {
        log.warn(`  ✗ #${a.id} no chunks`);
        continue;
      }

      // Prepend title + heading to each chunk text for stronger retrieval
      const texts = chs.map((c) =>
        c.heading
          ? `${a.title}\n\n## ${c.heading}\n\n${c.text}`
          : `${a.title}\n\n${c.text}`,
      );

      const embeddings: number[][] = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const slice = texts.slice(i, i + BATCH);
        const r = await embedTexts(slice, 'document');
        embeddings.push(...r.map((x) => x.embedding));
      }

      const rows = chs.map((c, i) => ({
        articleId: a.id,
        idx: c.idx,
        text: c.text,
        tokenCount: c.estimatedTokens,
        heading: c.heading,
        embedding: embeddings[i]!,
      }));

      // Insert in chunks of 50
      for (let i = 0; i < rows.length; i += 50) {
        await db.insert(chunks).values(rows.slice(i, i + 50));
      }

      await db.update(articles).set({ embeddedAt: new Date() }).where(eq(articles.id, a.id));
      totalChunks += rows.length;
      log.info(`  ✓ #${a.id} ${rows.length} chunks`);
    } catch (e) {
      log.error(`  ✗ #${a.id}: ${(e as Error).message}`);
    }
  }
  log.info(`Done. ${totalChunks} chunks embedded.`);
  // Refresh IVFFlat index recommendations
  if (totalChunks > 0) {
    await db.execute(sql`ANALYZE chunks`);
  }
}
