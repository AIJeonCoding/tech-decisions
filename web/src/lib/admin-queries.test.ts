/**
 * Integration test for admin-queries.
 * Uses the seeded SQLite DB at the monorepo root, so make sure to run
 * `pnpm db:reset` before vitest.
 */
import { describe, it, expect } from 'vitest';
import { getAdminCells, getAdminStats } from './admin-queries';

describe('admin-queries (integration)', () => {
  describe('getAdminCells', () => {
    it('returns rows with all required fields populated', async () => {
      const cells = await getAdminCells();
      expect(cells.length).toBeGreaterThan(0);
      const c = cells[0]!;
      expect(typeof c.cellId).toBe('number');
      expect(typeof c.domainSlug).toBe('string');
      expect(typeof c.companyName).toBe('string');
      expect(typeof c.confidence).toBe('number');
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    });

    it('includes evidence count and first url for cells with evidence', async () => {
      const cells = await getAdminCells();
      const verified = cells.find((c) => c.confidence >= 0.85);
      expect(verified).toBeDefined();
      expect(verified!.evidenceCount).toBeGreaterThan(0);
      expect(verified!.firstUrl).toMatch(/^https?:\/\//);
    });

    it('groups cells by domain priority desc, then axis sortOrder', async () => {
      const cells = await getAdminCells();
      // Confirm payment-settlement (priority 100) appears before search (50).
      const paymentIdx = cells.findIndex((c) => c.domainSlug === 'payment-settlement');
      const searchIdx = cells.findIndex((c) => c.domainSlug === 'search');
      expect(paymentIdx).toBeGreaterThanOrEqual(0);
      expect(searchIdx).toBeGreaterThanOrEqual(0);
      expect(paymentIdx).toBeLessThan(searchIdx);
    });
  });

  describe('getAdminStats', () => {
    it('returns total / verified / high-confidence counts', async () => {
      const s = await getAdminStats();
      expect(s.totalCells).toBeGreaterThan(0);
      expect(s.highConfidenceCells).toBeLessThanOrEqual(s.totalCells);
      expect(s.verifiedCells).toBeLessThanOrEqual(s.totalCells);
    });

    it('byDomain entries sum to total cells (within seeded set)', async () => {
      const s = await getAdminStats();
      const sum = s.byDomain.reduce((acc, d) => acc + d.count, 0);
      // Allow a small slack: byDomain only includes domains that have cells,
      // so the sum should equal totalCells exactly.
      expect(sum).toBe(s.totalCells);
    });

    it('average confidence per domain is between 0 and 1', async () => {
      const s = await getAdminStats();
      for (const d of s.byDomain) {
        expect(d.avgConfidence).toBeGreaterThanOrEqual(0);
        expect(d.avgConfidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
