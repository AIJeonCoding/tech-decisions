import Link from 'next/link';
import { sql, desc } from 'drizzle-orm';
import {
  ArrowRight, Search, Layers, CheckCircle2, FileText, Building2,
  Star, ArrowUpRight,
} from 'lucide-react';
import { db, domains } from '@/lib/db';
import { getDomainStats, getRecentArticles, getMyProjectCells } from '@/lib/queries';
import { formatRelative } from '@/lib/utils';
import { includeMyProject } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

async function getOverallStats() {
  const r = await db.all<{ totalCells: number; verifiedCells: number; companyCount: number; articleCount: number }>(sql`
    SELECT
      (SELECT COUNT(*) FROM cells) AS totalCells,
      (SELECT COUNT(*) FROM cells WHERE coalesce(confidence, 0) >= 0.85) AS verifiedCells,
      (SELECT COUNT(*) FROM companies) AS companyCount,
      (SELECT COUNT(*) FROM articles) AS articleCount
  `);
  return r[0] ?? { totalCells: 0, verifiedCells: 0, companyCount: 0, articleCount: 0 };
}

export default async function Home() {
  const [domainList, stats, recent, overall, myCells] = await Promise.all([
    db.select().from(domains).orderBy(desc(domains.priority)),
    getDomainStats(),
    getRecentArticles(8),
    getOverallStats(),
    getMyProjectCells('payment-settlement'),
  ]);

  const statsBySlug: Record<string, typeof stats[number]> = Object.fromEntries(
    stats.map((s) => [s.domain, s] as const),
  );

  return (
    <>
      <section className="container-wide pt-16 pb-12">
        <div className="max-w-3xl">
          <span className="chip mb-4">한국 빅테크 엔지니어링 비교 큐레이터</span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            다른 회사는 이 문제를<br /> 어떻게 풀었지?
          </h1>
          <p className="mt-6 text-lg text-fg/60 leading-relaxed">
            토스, 카카오페이, 쿠팡, 우아한형제들의 기술 글을 도메인별로 묶고,
            같은 비교축에 나란히 두어 <strong className="text-fg">의사결정에 쓸 수 있게</strong> 정리했습니다.
            제목 모음이 아니라, 본문에서 핵심 의사결정을 추출한 비교표입니다.
          </p>
          {includeMyProject() && (
            <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">★</span>
                <div className="text-sm leading-relaxed">
                  <strong className="text-accent">내 정산 MSA 포트폴리오</strong>
                  <span className="text-fg/70">(settlement-msa)도 같은 비교축에 함께 노출됩니다 —</span>
                  <Link href="/compare/payment-settlement" className="text-accent hover:underline ml-1 font-medium">
                    결제·정산 5축에서 빅테크와 나란히 보기 →
                  </Link>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/compare/payment-settlement" className="btn-primary">
              결제·정산 비교 보기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/search" className="btn">
              <Search className="w-4 h-4" /> 키워드로 검색
            </Link>
          </div>
        </div>
      </section>

      <section className="container-wide pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/50">
              <Building2 className="w-3.5 h-3.5" /> 인덱싱된 회사
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{overall.companyCount}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/50">
              <FileText className="w-3.5 h-3.5" /> 분석된 글
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{overall.articleCount}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/50">
              <Layers className="w-3.5 h-3.5" /> 비교 셀
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{overall.totalCells}</div>
          </div>
          <div className="card p-4 ring-1 ring-accent/30 bg-accent/5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent">
              <CheckCircle2 className="w-3.5 h-3.5" /> 검증된 셀 ≥ 85%
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-accent">
              {overall.verifiedCells}
              <span className="text-base font-normal text-accent/60 ml-1">
                / {overall.totalCells}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* my-project 5축 미리보기 */}
      {myCells.length > 0 && (
        <section className="container-wide pb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-accent flex items-center gap-2 font-semibold">
              <Star className="w-4 h-4 fill-current" />
              내 프로젝트 — 결제·정산 5축 매핑
            </h2>
            <Link href="/compare/payment-settlement" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              전체 비교 보기 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {myCells.map((c) => (
              <Link
                key={c.cellId}
                href="/compare/payment-settlement"
                className="card p-4 bg-accent/5 border-accent/30 hover:border-accent/60 transition-colors block"
              >
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[10px] font-mono text-accent/70">
                    {String(c.axisSortOrder ?? 0).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-accent/80 font-semibold">
                    {c.axisName}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug text-fg">
                  {c.cellSummary}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-fg/45">
                  <span className="inline-flex items-center gap-0.5 text-accent">
                    <CheckCircle2 className="w-3 h-3" /> {Math.round((c.confidence ?? 0) * 100)}%
                  </span>
                  <span>·</span>
                  <span>근거 {c.evidence?.length ?? 0}건</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-fg/55 leading-relaxed">
            ★ 위 5개 셀이 결제·정산 비교 페이지의 첫 컬럼에 노출됩니다.
            토스/카카오페이/쿠팡/우아한과 같은 비교축에 나란히 — 빅테크가 같은 문제를 어떻게 풀었는지 즉시 비교 가능.
          </p>
        </section>
      )}

      <section className="container-wide pb-16">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" /> 도메인별 비교 페이지
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domainList.map((d: typeof domainList[number]) => {
            const s = statsBySlug[d.slug];
            const enabled = (s?.article_count ?? 0) > 0;
            return (
              <Link
                key={d.slug}
                href={enabled ? `/compare/${d.slug}` : '#'}
                className={`card p-6 transition-colors ${enabled ? 'hover:border-accent/50 hover:bg-muted/30' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold tracking-tight">{d.name}</h3>
                  {enabled ? (
                    <span className="chip text-accent">V1</span>
                  ) : (
                    <span className="chip">V2 예정</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-fg/60 leading-snug">{d.description}</p>
                {s && (
                  <div className="mt-4 flex gap-3 text-xs text-fg/50">
                    <span>{s.article_count}편</span>
                    <span>·</span>
                    <span>{s.company_count}개사</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-wide pb-20">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4" /> 최근 인덱싱된 글
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {recent.map((r: typeof recent[number]) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="card p-4 hover:border-accent/50 transition-colors block"
            >
              <div className="flex items-center gap-2 text-xs text-fg/50">
                <span>{r.companyNameKo ?? r.companyName}</span>
                <span>·</span>
                <span>{formatRelative(r.publishedAt)}</span>
              </div>
              <h3 className="mt-2 font-medium leading-snug">{r.title}</h3>
              {r.summary && (
                <p className="mt-2 text-sm text-fg/60 leading-snug line-clamp-2">{r.summary}</p>
              )}
              {r.tags && r.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.slice(0, 4).map((t: string) => (
                    <span key={t} className="chip text-[10px]">#{t}</span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
