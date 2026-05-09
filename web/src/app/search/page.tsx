import { Suspense } from 'react';
import { SearchClient } from './SearchClient';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata = { title: '검색' };

export default function SearchPage() {
  return (
    <div className="container-narrow py-10">
      <Breadcrumbs items={[{ href: '/search', label: '검색' }]} />
      <h1 className="text-3xl font-bold tracking-tight mb-2">검색</h1>
      <p className="text-fg/60 mb-8">
        키워드로 본문·요약을 한 번에 찾고, 회사·도메인으로 좁혀볼 수 있습니다.
      </p>
      <Suspense fallback={<div className="text-fg/50">로딩…</div>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
