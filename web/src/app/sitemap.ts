import type { MetadataRoute } from 'next';
import { db, domains } from '@/lib/db';

export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tech-decisions.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let ds: Array<{ slug: string }> = [];
  try {
    ds = await db.select().from(domains);
  } catch {
    // DB unavailable at build time — return static-only sitemap
    ds = [
      { slug: 'payment-settlement' },
      { slug: 'search' },
      { slug: 'recommendation' },
      { slug: 'msa-migration' },
      { slug: 'realtime-data' },
    ];
  }
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/chat`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...ds.map((d) => ({
      url: `${BASE}/compare/${d.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: d.slug === 'payment-settlement' ? 0.95 : 0.6,
    })),
  ];
}
