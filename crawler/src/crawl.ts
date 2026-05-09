import pLimit from 'p-limit';
import { eq, sql } from 'drizzle-orm';
import { db, articles, sources, companies } from '@td/db';
import { getAdapter } from './adapters/index.js';
import { sha256 } from './lib/hash.js';
import { logger } from './lib/log.js';

const log = logger('crawl');

interface CrawlOptions {
  /** company slug or 'all' */
  target: string;
  /** max articles per source */
  limit?: number;
  /** parallelism per source */
  concurrency?: number;
  /** if true, re-fetch even if URL hash exists */
  force?: boolean;
}

export async function crawl(opts: CrawlOptions) {
  const { target, limit = 30, concurrency = 4, force = false } = opts;

  const rows = await db
    .select({
      sourceId: sources.id,
      companySlug: companies.slug,
      companyName: companies.name,
      feedUrl: sources.feedUrl,
      adapter: sources.adapter,
    })
    .from(sources)
    .innerJoin(companies, eq(sources.companyId, companies.id))
    .where(target === 'all' ? sql`${sources.enabled} = 1` : eq(companies.slug, target));

  if (rows.length === 0) {
    log.warn(`No sources matched target=${target}`);
    return { fetched: 0, skipped: 0, failed: 0 };
  }

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const src of rows) {
    log.info(`▶ ${src.companyName} (${src.adapter}) ${src.feedUrl}`);
    const adapter = getAdapter(src.adapter);
    let items;
    try {
      items = await adapter.listLinks(src.feedUrl);
    } catch (e) {
      log.error(`Feed fetch failed: ${(e as Error).message}`);
      failed++;
      continue;
    }
    items = items.slice(0, limit);
    log.info(`  ${items.length} items`);

    const existing = await db
      .select({ urlHash: articles.urlHash })
      .from(articles)
      .where(eq(articles.sourceId, src.sourceId));
    const seen = new Set(existing.map((r) => r.urlHash));

    const limitFn = pLimit(concurrency);
    await Promise.all(
      items.map((item) =>
        limitFn(async () => {
          const urlHash = sha256(item.link).slice(0, 32);
          if (!force && seen.has(urlHash)) {
            skipped++;
            return;
          }
          try {
            const art = await adapter.fetchArticle(item.link, item);
            if (!art) {
              log.warn(`  ✗ skip (too short or unreadable): ${item.link}`);
              return;
            }
            const bodyHash = sha256(art.bodyMd).slice(0, 32);
            await db
              .insert(articles)
              .values({
                sourceId: src.sourceId,
                url: art.url,
                urlHash,
                title: art.title,
                author: art.author,
                publishedAt: art.publishedAt?.toISOString() ?? null,
                bodyMd: art.bodyMd,
                bodyHash,
              })
              .onConflictDoUpdate({
                target: articles.urlHash,
                set: {
                  title: art.title,
                  bodyMd: art.bodyMd,
                  bodyHash,
                  updatedAt: new Date().toISOString(),
                },
              });
            fetched++;
            log.info(`  ✓ ${art.title.slice(0, 60)}`);
          } catch (e) {
            failed++;
            log.error(`  ✗ ${item.link}: ${(e as Error).message}`);
          }
        })
      )
    );

    await db.update(sources).set({ lastCrawledAt: new Date().toISOString() }).where(eq(sources.id, src.sourceId));
  }

  log.info(`Done. fetched=${fetched} skipped=${skipped} failed=${failed}`);
  return { fetched, skipped, failed };
}
