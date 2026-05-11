import type { MetadataRoute } from 'next';
import { includeMyProject } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tech-decisions.app';
  // 포트폴리오 사이트(INCLUDE_MY_PROJECT=true)는 우연한 인덱싱을 막기 위해 전체 차단.
  // 공개 SEO 사이트는 일반 사용자/검색엔진에게 열림.
  if (includeMyProject()) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
