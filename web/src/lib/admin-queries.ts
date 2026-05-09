import { sql } from 'drizzle-orm';
import { db } from './db';

export interface AdminCellRow {
  cellId: number;
  domainSlug: string;
  domainName: string;
  axisSlug: string;
  axisName: string;
  companySlug: string;
  companyName: string;
  cellSummary: string | null;
  confidence: number;
  isVerified: number;
  evidenceCount: number;
  firstUrl: string | null;
  lastVerifiedAt: string | null;
}

/**
 * Flat list of all cells with axis/domain/company info, joined for admin review.
 * Sorted by domain → axis → company so the table reads top-to-bottom by domain.
 */
export async function getAdminCells(): Promise<AdminCellRow[]> {
  return db.all<AdminCellRow>(sql`
    SELECT
      c.id              AS cellId,
      d.slug            AS domainSlug,
      d.name            AS domainName,
      ax.slug           AS axisSlug,
      ax.name           AS axisName,
      co.slug           AS companySlug,
      coalesce(co.name_ko, co.name) AS companyName,
      c.cell_summary    AS cellSummary,
      coalesce(c.confidence, 0) AS confidence,
      c.is_verified     AS isVerified,
      coalesce(json_array_length(c.evidence), 0) AS evidenceCount,
      json_extract(c.evidence, '$[0].url') AS firstUrl,
      c.last_verified_at AS lastVerifiedAt
    FROM cells c
    JOIN axes ax       ON ax.id = c.axis_id
    JOIN domains d     ON d.slug = ax.domain_slug
    JOIN companies co  ON co.id = c.company_id
    ORDER BY d.priority DESC, ax.sort_order, co.id
  `);
}

export interface AdminStats {
  totalCells: number;
  verifiedCells: number;
  highConfidenceCells: number;  // ≥ 0.85
  byDomain: Array<{ slug: string; name: string; count: number; avgConfidence: number }>;
}

export async function getAdminStats(): Promise<AdminStats> {
  const total = await db.all<{ total: number; verified: number; high: number }>(sql`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN confidence >= 0.85 THEN 1 ELSE 0 END) AS high
    FROM cells
  `);
  const byDomain = await db.all<{ slug: string; name: string; count: number; avgConfidence: number }>(sql`
    SELECT
      d.slug AS slug,
      d.name AS name,
      COUNT(c.id) AS count,
      coalesce(avg(c.confidence), 0) AS avgConfidence
    FROM domains d
    LEFT JOIN axes ax ON ax.domain_slug = d.slug
    LEFT JOIN cells c ON c.axis_id = ax.id
    GROUP BY d.slug
    HAVING COUNT(c.id) > 0
    ORDER BY d.priority DESC
  `);
  const stats = total[0] ?? { total: 0, verified: 0, high: 0 };
  return {
    totalCells: stats.total,
    verifiedCells: stats.verified,
    highConfidenceCells: stats.high,
    byDomain,
  };
}
