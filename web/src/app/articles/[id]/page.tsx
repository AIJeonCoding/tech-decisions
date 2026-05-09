import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink, ArrowLeft, Calendar, Building2, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getArticleById } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const DOMAIN_LABELS: Record<string, string> = {
  'payment-settlement': '결제·정산',
  'search': '검색',
  'recommendation': '추천',
  'msa-migration': 'MSA 전환',
  'realtime-data': '실시간 데이터',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(Number(id));
  if (!article) return { title: '글을 찾을 수 없음' };

  const company = article.companyNameKo ?? article.companyName;
  const description = article.summary ?? article.bodyMd.slice(0, 150);

  return {
    title: `${article.title} · ${company}`,
    description,
    keywords: [
      ...(article.tags ?? []),
      ...(article.domains ?? []).map((d) => DOMAIN_LABELS[d] ?? d),
      company,
      '한국 빅테크',
      '엔지니어링 비교',
    ],
    authors: article.author ? [{ name: article.author }] : undefined,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      publishedTime: article.publishedAt ?? undefined,
      authors: article.author ? [article.author] : undefined,
      tags: article.tags ?? undefined,
    },
    twitter: { card: 'summary_large_image', title: article.title, description },
    alternates: { canonical: `/articles/${id}` },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticleById(Number(id));
  if (!article) notFound();

  const company = article.companyNameKo ?? article.companyName;

  // JSON-LD structured data — Article schema for Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.processedAt ?? article.publishedAt,
    author: article.author
      ? { '@type': 'Person', name: article.author }
      : { '@type': 'Organization', name: company },
    publisher: {
      '@type': 'Organization',
      name: company,
      url: article.companyBlogUrl ?? undefined,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `/articles/${id}` },
    keywords: article.tags?.join(', '),
    isAccessibleForFree: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container-narrow py-10">
        <Link
          href={`/companies/${article.companySlug}`}
          className="inline-flex items-center gap-1 text-sm text-fg/60 hover:text-accent mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {company}의 글 모두 보기
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {(article.domains ?? []).map((d) => (
              <Link
                key={d}
                href={`/compare/${d}`}
                className="chip text-xs hover:bg-accent/10 hover:text-accent transition-colors"
              >
                {DOMAIN_LABELS[d] ?? d}
              </Link>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-4 text-lg text-fg/70 leading-relaxed">{article.summary}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-fg/55">
            <Link
              href={`/companies/${article.companySlug}`}
              className="inline-flex items-center gap-1.5 hover:text-accent"
            >
              <Building2 className="w-4 h-4" /> {company}
            </Link>
            {article.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {formatDate(article.publishedAt)}
              </span>
            )}
            {article.author && <span>· {article.author}</span>}
          </div>
        </header>

        {/* 의사결정 추출 (있다면) */}
        {article.decisions && article.decisions.length > 0 && (
          <section className="mb-8 card p-6 bg-accent/5 border-accent/20">
            <h2 className="text-sm uppercase tracking-wider text-accent font-semibold mb-4">
              핵심 의사결정 추출
            </h2>
            <div className="space-y-4">
              {article.decisions.map((d, i) => (
                <div key={i} className="border-l-2 border-accent/40 pl-4">
                  <div className="text-xs text-fg/50 uppercase tracking-wider">{d.axis}</div>
                  <div className="font-semibold mt-1">{d.choice}</div>
                  <div className="mt-1 text-sm text-fg/70">{d.rationale}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 본문 markdown — globals.css의 .article-prose 스타일 적용 */}
        <div className="article-prose">
          <ReactMarkdown>{article.bodyMd}</ReactMarkdown>
        </div>

        {/* 태그 */}
        {article.tags && article.tags.length > 0 && (
          <section className="mt-10 pt-6 border-t border-border">
            <div className="text-xs uppercase tracking-wider text-fg/50 mb-2 inline-flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> 태그
            </div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <Link
                  key={t}
                  href={`/search?q=${encodeURIComponent(t)}`}
                  className="chip text-xs hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  #{t}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 원문 링크 */}
        <section className="mt-10 p-6 card bg-muted/30">
          <p className="text-sm text-fg/70 mb-3">
            이 글은 {company}의 공개 기술 블로그를 참고로 정리되었습니다.
            전체 내용은 원문에서 확인할 수 있습니다.
          </p>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex"
          >
            원문 글 읽기 <ExternalLink className="w-4 h-4" />
          </a>
        </section>

        {/* 다른 도메인 비교로 유도 */}
        {article.domains && article.domains.length > 0 && (
          <section className="mt-10">
            <div className="text-xs uppercase tracking-wider text-fg/50 mb-3">관련 비교 페이지</div>
            <div className="flex flex-wrap gap-3">
              {article.domains.map((d) => (
                <Link
                  key={d}
                  href={`/compare/${d}`}
                  className="btn"
                >
                  {DOMAIN_LABELS[d] ?? d} 비교 보기 →
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
