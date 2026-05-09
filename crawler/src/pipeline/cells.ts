import { eq, and, sql } from 'drizzle-orm';
import { db, articles, axes, cells, sources, companies } from '@td/db';
import { logger } from '../lib/log.js';

const log = logger('cells');

interface BuildCellsOpts {
  domain: string;
}

export async function buildCells({ domain }: BuildCellsOpts) {
  const axisRows = await db.select().from(axes).where(eq(axes.domainSlug, domain));
  if (axisRows.length === 0) {
    log.warn(`No axes for domain=${domain}`);
    return;
  }
  const axisBySlug = Object.fromEntries(axisRows.map((a) => [a.slug, a]));

  const companyRows = await db.select().from(companies);
  const companyById = Object.fromEntries(companyRows.map((c) => [c.id, c]));

  // Pull every article in this domain that has decisions
  const articleRows = await db
    .select({
      id: articles.id,
      url: articles.url,
      title: articles.title,
      publishedAt: articles.publishedAt,
      decisions: articles.decisions,
      sourceId: articles.sourceId,
    })
    .from(articles)
    .where(sql`${articles.domains} && ARRAY[${domain}]::text[] AND ${articles.decisions} IS NOT NULL`);

  // Map each article to its company via source
  const sourceRows = await db.select({ id: sources.id, companyId: sources.companyId }).from(sources);
  const companyForSource = Object.fromEntries(sourceRows.map((s) => [s.id, s.companyId]));

  // Aggregate: (axis, company) → list of evidence
  type Evidence = { articleId: number; url: string; title: string; quote: string; publishedAt: string | null; choice: string; rationale: string; confidence: number };
  const agg = new Map<string, Evidence[]>();

  for (const a of articleRows) {
    const companyId = companyForSource[a.sourceId];
    if (!companyId) continue;
    for (const d of a.decisions ?? []) {
      const ax = axisBySlug[d.axis];
      if (!ax) continue;
      const key = `${ax.id}::${companyId}`;
      const arr = agg.get(key) ?? [];
      arr.push({
        articleId: a.id,
        url: a.url,
        title: a.title,
        quote: d.quote ?? '',
        publishedAt: a.publishedAt?.toISOString() ?? null,
        choice: d.choice,
        rationale: d.rationale,
        confidence: d.confidence,
      });
      agg.set(key, arr);
    }
  }

  log.info(`Aggregated ${agg.size} (axis × company) cells from ${articleRows.length} articles`);

  for (const [key, evList] of agg) {
    const [axisIdStr, companyIdStr] = key.split('::');
    const axisId = Number(axisIdStr);
    const companyId = Number(companyIdStr);

    // Sort by confidence desc, take top-3 evidence
    evList.sort((a, b) => b.confidence - a.confidence);
    const top = evList.slice(0, 3);

    // Cell summary: aggregate of top choices, comma-joined unique
    const choices = Array.from(new Set(top.map((e) => e.choice)));
    const cellSummary = choices.slice(0, 2).join(' + ');
    const avgConf = top.reduce((acc, e) => acc + e.confidence, 0) / top.length;

    await db
      .insert(cells)
      .values({
        axisId,
        companyId,
        cellSummary,
        evidence: top.map((e) => ({
          articleId: e.articleId,
          url: e.url,
          title: e.title,
          quote: e.quote,
          publishedAt: e.publishedAt,
        })),
        confidence: avgConf,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [cells.axisId, cells.companyId],
        set: {
          cellSummary,
          evidence: top.map((e) => ({
            articleId: e.articleId,
            url: e.url,
            title: e.title,
            quote: e.quote,
            publishedAt: e.publishedAt,
          })),
          confidence: avgConf,
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    const company = companyById[companyId];
    log.info(`  ✓ ${company?.slug} × axis#${axisId}: "${cellSummary}" (conf=${avgConf.toFixed(2)})`);
  }
  log.info('Cells built.');
}
