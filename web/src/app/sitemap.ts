import type { MetadataRoute } from 'next';
import { ne } from 'drizzle-orm';
import { db, domains, companies } from '@/lib/db';
import { getAllArticleIds } from '@/lib/queries';
import { shouldHideMyProject, MY_PROJECT_SLUG } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tech-decisions.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let domainSlugs: string[] = [];
  let companySlugs: string[] = [];
  let articleIds: Array<{ id: number; updatedAt: string }> = [];

  try {
    const companyQuery = shouldHideMyProject()
      ? db.select({ slug: companies.slug }).from(companies).where(ne(companies.slug, MY_PROJECT_SLUG))
      : db.select({ slug: companies.slug }).from(companies);
    const [d, c, a] = await Promise.all([
      db.select({ slug: domains.slug }).from(domains),
      companyQuery,
      getAllArticleIds(),
    ]);
    domainSlugs = d.map((x) => x.slug);
    companySlugs = c.map((x) => x.slug);
    articleIds = a;
  } catch {
    // DB unavailable at build time — return static-only sitemap
    domainSlugs = ['payment-settlement', 'search', 'recommendation', 'msa-migration', 'realtime-data'];
    companySlugs = [];
    articleIds = [];
  }

  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/chat`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    ...domainSlugs.map((slug) => ({
      url: `${BASE}/compare/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: slug === 'payment-settlement' ? 0.95 : 0.85,
    })),
    ...companySlugs.map((slug) => ({
      url: `${BASE}/companies/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: slug === 'my-project' ? 0.9 : 0.7,
    })),
    ...articleIds.map((a) => ({
      url: `${BASE}/articles/${a.id}`,
      lastModified: a.updatedAt ? new Date(a.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
