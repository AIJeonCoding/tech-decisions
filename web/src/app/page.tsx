import Link from 'next/link';
import { sql, desc } from 'drizzle-orm';
import {
  ArrowRight, Search, Layers, CheckCircle2, FileText, Building2,
  Star, ArrowUpRight,
} from 'lucide-react';
import { db, domains } from '@/lib/db';
import { getDomainStats, getRecentArticles, getMyProjectCells } from '@/lib/queries';
import { formatRelative } from '@/lib/utils';
import { includeMyProject, chatBackendEnabled } from '@/lib/feature-flags';
import HeroChatCTA from '@/components/HeroChatCTA';

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

// 첫 화면 예시: 결제 동시성을 4사가 어떻게 풀었는지 한 줄로.
const HERO_EXAMPLE_COMPANIES = ['toss', 'kakaopay', 'coupang', 'woowahan'] as const;
async function getHeroExampleRow() {
  const rows = await db.all<{ slug: string; name_ko: string; cell_summary: string }>(sql`
    SELECT co.slug AS slug, co.name_ko AS name_ko, ce.cell_summary AS cell_summary
    FROM cells ce
    JOIN axes a ON a.id = ce.axis_id
    JOIN companies co ON co.id = ce.company_id
    WHERE a.slug = 'concurrency-control'
      AND co.slug IN ('toss', 'kakaopay', 'coupang', 'woowahan')
  `);
  const bySlug = new Map(rows.map((r) => [r.slug, r] as const));
  return HERO_EXAMPLE_COMPANIES.map((s) => bySlug.get(s)).filter((r): r is NonNullable<typeof r> => !!r);
}

export default async function Home() {
  const [domainList, stats, recent, overall, myCells, heroRow] = await Promise.all([
    db.select().from(domains).orderBy(desc(domains.priority)),
    getDomainStats(),
    getRecentArticles(8),
    getOverallStats(),
    getMyProjectCells('payment-settlement'),
    getHeroExampleRow(),
  ]);

  const statsBySlug: Record<string, typeof stats[number]> = Object.fromEntries(
    stats.map((s) => [s.domain, s] as const),
  );

  return (
    <>
      <section className="container-wide pt-24 sm:pt-32 lg:pt-36 pb-12 hero-glow">
        <div className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="gradient-text">한국·글로벌</span> 빅테크의<br />
            기술 결정을 <span className="gradient-text">한 줄에 비교</span>
          </h1>
          <p className="mt-7 text-lg text-fg/70 leading-relaxed max-w-2xl">
            토스·카카오페이·쿠팡·우아한·라인·당근 + Netflix·YouTube·Spotify·Uber·Stripe.
            <br className="hidden sm:block" />
            <strong className="text-fg">제목 모음이 아니라, 본문에서 추출한 의사결정 비교표.</strong>
          </p>
          {includeMyProject() && (
            <div className="mt-8 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-accent/20 to-fuchsia-500/15 border border-accent/40 shadow-sm shadow-accent/20">
              <span className="text-accent font-bold">★</span>
              <span className="text-sm">
                <strong className="text-accent">내 정산 MSA</strong>
                <span className="text-fg/75">도 같은 비교축에 함께 노출됩니다</span>
              </span>
            </div>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/compare/payment-settlement" className="btn-primary shadow-lg shadow-accent/20">
              결제·정산 비교 보기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/search" className="btn">
              <Search className="w-4 h-4" /> 키워드로 검색
            </Link>
          </div>
        </div>
      </section>

      {/* AI 챗봇 강조 — 메인 페이지 hero 바로 아래 */}
      {chatBackendEnabled() && <HeroChatCTA />}

      {/* 첫 화면 예시 — 실제 비교 한 줄 그대로 */}
      {heroRow.length > 0 && (
        <section className="container-wide pb-14">
          <Link
            href="/compare/payment-settlement"
            className="block group rounded-2xl border border-border bg-gradient-to-br from-bg via-muted/30 to-bg hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10 transition-all overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-accent/10 via-accent/5 to-transparent flex items-baseline gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-white text-[11px] uppercase tracking-wider font-bold">
                예시
              </span>
              <span className="text-base font-semibold text-fg">결제 동시성, 다른 회사는 어떻게 풀었나</span>
              <span className="ml-auto text-xs text-fg/45 group-hover:text-accent group-hover:translate-x-1 transition-all">
                전체 88개 비교 셀 보기 →
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
              {heroRow.map((c, i) => (
                <div key={c.slug} className="p-5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold tabular-nums">
                      {i + 1}
                    </span>
                    <div className="text-xs uppercase tracking-wider text-fg/60 font-bold">
                      {c.name_ko}
                    </div>
                  </div>
                  <div className="text-[15px] font-medium leading-snug text-fg">
                    {c.cell_summary}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-border bg-bg/40 text-xs text-fg/55 leading-relaxed flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-accent" />
              본문에서 의사결정만 추출 → 같은 비교축에 회사별로 나란히. 셀마다 인용·원문 링크가 붙습니다.
            </div>
          </Link>
        </section>
      )}

      <section className="container-wide pb-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/55 font-semibold">
              <Building2 className="w-4 h-4 text-fg/40" /> 인덱싱된 회사
            </div>
            <div className="stat-number">{overall.companyCount}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/55 font-semibold">
              <FileText className="w-4 h-4 text-fg/40" /> 분석된 글
            </div>
            <div className="stat-number">{overall.articleCount}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg/55 font-semibold">
              <Layers className="w-4 h-4 text-fg/40" /> 비교 셀
            </div>
            <div className="stat-number">{overall.totalCells}</div>
          </div>
          <div className="stat-card ring-2 ring-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent font-semibold">
              <CheckCircle2 className="w-4 h-4" /> 검증된 셀 ≥ 85%
            </div>
            <div className="stat-number gradient-text">
              {overall.verifiedCells}
              <span className="text-lg font-normal text-fg/40 ml-1">
                / {overall.totalCells}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* my-project 5축 미리보기 */}
      {myCells.length > 0 && (
        <section className="container-wide pb-14">
          <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-accent flex items-center gap-2 font-bold">
                <Star className="w-4 h-4 fill-current" />
                내 프로젝트 · settlement-msa
              </h2>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                결제·정산 <span className="gradient-text">핵심 5가지</span>를 빅테크와 한 줄에
              </p>
            </div>
            <Link
              href="/compare/payment-settlement"
              className="text-sm text-accent hover:text-fg inline-flex items-center gap-1 font-medium group"
            >
              전체 비교 보기
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {myCells.map((c) => (
              <Link
                key={c.cellId}
                href="/compare/payment-settlement"
                className="relative rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-4 hover:border-accent hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 transition-all block overflow-hidden"
              >
                <span className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-accent/10 blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-accent text-white text-xs font-bold tabular-nums">
                      {c.axisSortOrder ?? 0}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-accent font-bold">
                      {c.axisName}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold leading-snug text-fg min-h-[3.5rem]">
                    {c.cellSummary}
                  </p>
                  <div className="mt-4 pt-3 border-t border-accent/15 flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-accent font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {Math.round((c.confidence ?? 0) * 100)}%
                    </span>
                    <span className="text-fg/30">·</span>
                    <span className="text-fg/55">근거 {c.evidence?.length ?? 0}건</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-sm text-fg/60 leading-relaxed">
            ★ 위 5개가 비교 페이지의 첫 컬럼 — 토스·카카오페이·쿠팡·우아한이 같은 문제를 어떻게 풀었는지 한 줄 옆에서 즉시 비교.
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
