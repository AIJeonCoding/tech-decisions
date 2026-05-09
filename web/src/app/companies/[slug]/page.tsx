import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink, Calendar, Building2, Layers, CheckCircle2 } from 'lucide-react';
import { getCompanyBySlug, getArticlesByCompanySlug, getCellsByCompanySlug } from '@/lib/queries';
import { formatRelative } from '@/lib/utils';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

const DOMAIN_LABELS: Record<string, string> = {
  'payment-settlement': '결제·정산',
  'search': '검색',
  'recommendation': '추천',
  'msa-migration': 'MSA 전환',
  'realtime-data': '실시간 데이터',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: '회사를 찾을 수 없음' };

  const name = company.nameKo ?? company.name;
  return {
    title: `${name} 엔지니어링 블로그 분석`,
    description:
      company.description ??
      `${name}의 기술 블로그 글을 결제·정산·검색·추천·MSA·실시간 데이터 5개 도메인 비교축으로 정리했습니다.`,
    keywords: [name, '기술 블로그', '엔지니어링', '아키텍처 비교', '한국 빅테크'],
    openGraph: {
      title: `${name} · tech-decisions`,
      description: company.description ?? undefined,
      type: 'profile',
    },
    alternates: { canonical: `/companies/${slug}` },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const [company, articles, companyCells] = await Promise.all([
    getCompanyBySlug(slug),
    getArticlesByCompanySlug(slug),
    getCellsByCompanySlug(slug),
  ]);
  if (!company) notFound();

  const name = company.nameKo ?? company.name;
  const isMine = slug === 'my-project';

  // 도메인별로 그룹핑
  const byDomain = new Map<string, typeof articles>();
  for (const a of articles) {
    for (const d of a.domains ?? []) {
      const list = byDomain.get(d) ?? [];
      list.push(a);
      byDomain.set(d, list);
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    alternateName: company.nameKo,
    url: company.blogUrl,
    description: company.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-narrow py-10">
        <Breadcrumbs items={[{ href: `/companies/${slug}`, label: name }]} />
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-accent mb-2">
            <Building2 className="w-4 h-4" /> 회사 프로필
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {isMine && '★ '}{name}
            {isMine && (
              <span className="ml-2 chip text-sm text-accent bg-accent/10 align-middle">
                내 정산 MSA 포트폴리오
              </span>
            )}
          </h1>
          {company.description && (
            <p className="mt-3 text-fg/70 leading-relaxed">{company.description}</p>
          )}
          {company.blogUrl && (
            <a
              href={company.blogUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              {company.blogUrl} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </header>

        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-fg/50">분석된 글</div>
            <div className="mt-1 text-2xl font-bold">{articles.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-fg/50">관련 도메인</div>
            <div className="mt-1 text-2xl font-bold">{byDomain.size}</div>
          </div>
          <div className="card p-4 col-span-2 sm:col-span-2">
            <div className="text-xs uppercase tracking-wider text-fg/50 mb-1.5">관련 비교 페이지</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(byDomain.keys()).map((d) => (
                <Link
                  key={d}
                  href={`/compare/${d}`}
                  className="chip text-xs hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  {DOMAIN_LABELS[d] ?? d}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 비교 셀 미리보기 — 도메인별 그룹핑 */}
        {companyCells.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 inline-flex items-center gap-2">
              <Layers className="w-4 h-4" /> 비교축에서의 의사결정 ({companyCells.length}개)
            </h2>
            <div className="space-y-5">
              {(() => {
                const byDom = new Map<string, typeof companyCells>();
                for (const c of companyCells) {
                  const list = byDom.get(c.domainSlug) ?? [];
                  list.push(c);
                  byDom.set(c.domainSlug, list);
                }
                return Array.from(byDom.entries()).map(([dom, cells]) => (
                  <div key={dom}>
                    <div className="text-xs uppercase tracking-wider text-accent/80 font-semibold mb-2">
                      {DOMAIN_LABELS[dom] ?? dom}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {cells.map((c) => (
                        <Link
                          key={c.cellId}
                          href={`/compare/${c.domainSlug}`}
                          className={`card p-4 hover:border-accent/50 transition-colors ${isMine ? 'bg-accent/5 border-accent/30' : ''}`}
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-[10px] font-mono text-accent/70 mt-0.5">
                              {String(c.axisSortOrder ?? 0).padStart(2, '0')}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider text-fg/55 font-semibold">
                              {c.axisName}
                            </span>
                          </div>
                          <p className="text-sm font-medium leading-snug">{c.cellSummary}</p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-fg/45">
                            <span className={`inline-flex items-center gap-0.5 ${(c.confidence ?? 0) >= 0.85 ? 'text-accent' : ''}`}>
                              {(c.confidence ?? 0) >= 0.85 && <CheckCircle2 className="w-3 h-3" />}
                              신뢰도 {Math.round((c.confidence ?? 0) * 100)}%
                            </span>
                            <span>·</span>
                            <span>근거 {c.evidence?.length ?? 0}건</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </section>
        )}

        {articles.length > 0 && (
          <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 inline-flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 인덱싱된 글 ({articles.length}편)
          </h2>
        )}
        {Array.from(byDomain.entries()).map(([domain, list]) => (
          <section key={domain} className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-lg font-bold">{DOMAIN_LABELS[domain] ?? domain}</h3>
              <Link
                href={`/compare/${domain}`}
                className="text-xs text-accent hover:underline"
              >
                {DOMAIN_LABELS[domain] ?? domain} 비교 페이지 →
              </Link>
            </div>
            <div className="space-y-3">
              {list.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.id}`}
                  className="block card p-4 hover:border-accent/50 transition-colors"
                >
                  <h3 className="font-medium leading-snug">{a.title}</h3>
                  {a.summary && (
                    <p className="mt-1.5 text-sm text-fg/65 line-clamp-2 leading-relaxed">
                      {a.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-fg/45">
                    <Calendar className="w-3 h-3" />
                    <span>{formatRelative(a.publishedAt)}</span>
                    {a.tags && a.tags.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {a.tags.slice(0, 4).map((t) => `#${t}`).join(' ')}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {articles.length === 0 && (
          <div className="card p-10 text-center text-fg/50">
            아직 인덱싱된 글이 없습니다.
          </div>
        )}
      </div>
    </>
  );
}
