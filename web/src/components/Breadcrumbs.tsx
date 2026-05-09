import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  href: string;
  label: string;
}

interface Props {
  items: Crumb[];
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tech-decisions.app';

export function Breadcrumbs({ items }: Props) {
  // JSON-LD BreadcrumbList — Google 검색 결과에 빵부스러기 노출
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '홈',
        item: `${BASE}/`,
      },
      ...items.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.label,
        item: `${BASE}${c.href}`,
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-fg/55 flex-wrap">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-accent transition-colors">
          <Home className="w-3 h-3" />
          <span>홈</span>
        </Link>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <span key={c.href} className="inline-flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-fg/30" />
              {last ? (
                <span className="text-fg/80 font-medium">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-accent transition-colors">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
