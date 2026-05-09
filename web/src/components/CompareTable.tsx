'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { cn, truncate } from '@/lib/utils';
import { EvidencePanel } from './EvidencePanel';
import type { CellWithCompany } from '@/lib/queries';

interface Axis {
  id: number;
  slug: string;
  name: string;
  question: string | null;
  sortOrder?: number;
}

interface Company {
  id: number;
  slug: string;
  name: string;
  nameKo: string | null;
}

interface Props {
  axes: Axis[];
  companies: Company[];
  cells: CellWithCompany[];
}

/**
 * Default-on companies per domain.
 * 페이지 로드 시 가장 의미 있는 회사 셋만 켜둠 — 좁은 화면에서 가독성 ↑.
 * 그 외 회사는 토글로 추가 가능.
 */
function defaultOnSlugs(axes: Axis[], cells: CellWithCompany[]): Set<string> {
  // my-project는 항상 ON
  const result = new Set<string>(['my-project']);
  // 셀이 있는 회사 우선
  const slugsWithCells = new Set(cells.map((c) => c.companySlug));
  // 가장 자주 등장하는 5개 회사 + my-project = 최대 6개
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(c.companySlug, (counts.get(c.companySlug) ?? 0) + 1);
  const top = Array.from(counts.entries())
    .filter(([s]) => slugsWithCells.has(s) && s !== 'my-project')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);
  for (const s of top) result.add(s);
  return result;
}

export function CompareTable({ axes, companies, cells }: Props) {
  const [selected, setSelected] = useState<CellWithCompany | null>(null);
  const [filteredCompanies, setFilteredCompanies] = useState<Set<number>>(() => {
    const onSlugs = defaultOnSlugs(axes, cells);
    return new Set(companies.filter((c) => onSlugs.has(c.slug)).map((c) => c.id));
  });

  const cellMap = useMemo(() => {
    const m = new Map<string, CellWithCompany>();
    for (const c of cells) m.set(`${c.axisId}::${c.companyId}`, c);
    return m;
  }, [cells]);

  // Sort companies so my-project is always first, then others by company.id
  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((a, b) => {
        if (a.slug === 'my-project') return -1;
        if (b.slug === 'my-project') return 1;
        return a.id - b.id;
      }),
    [companies],
  );

  const visibleCompanies = sortedCompanies.filter((c) => filteredCompanies.has(c.id));

  function toggleCompany(id: number) {
    const next = new Set(filteredCompanies);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFilteredCompanies(next);
  }

  return (
    <div className="space-y-4">
      {/* 회사 토글 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-fg/50 uppercase tracking-wider">비교 대상 회사</div>
          <div className="text-xs text-fg/50">
            <span className="font-medium text-fg">{visibleCompanies.length}개 표시</span>
            <span className="mx-1.5">·</span>
            <span>{sortedCompanies.length - visibleCompanies.length}개 숨김</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedCompanies.map((c) => {
            const on = filteredCompanies.has(c.id);
            const isMine = c.slug === 'my-project';
            return (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors',
                  on
                    ? isMine
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-muted border-border text-fg/40 hover:bg-muted/70 line-through decoration-fg/30',
                )}
              >
                {isMine && <Star className="w-3 h-3 fill-current" />}
                {c.nameKo ?? c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-fg/55">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/50 font-medium">
          ← 가로 스크롤 →
        </span>
        <span>모든 회사를 비교하려면 좌우로 스크롤 · 셀 클릭하면 출처 패널이 열립니다</span>
      </div>

      {/* 비교 테이블 */}
      <div className="card overflow-hidden relative">
        <ScrollableTable visibleCount={visibleCompanies.length}>
          <table
            className="text-sm border-collapse"
            style={{
              tableLayout: 'fixed',
              minWidth: `${260 + visibleCompanies.length * 300}px`,
              width: '100%',
            }}
          >
            <colgroup>
              <col style={{ width: 260 }} />
              {visibleCompanies.map((c) => (
                <col key={c.id} style={{ width: 300 }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th
                  className="sticky left-0 z-20 bg-muted/90 backdrop-blur text-left px-5 py-4 font-medium text-fg/70 text-xs uppercase tracking-wider border-r border-border"
                >
                  비교축
                </th>
                {visibleCompanies.map((c) => {
                  const isMine = c.slug === 'my-project';
                  return (
                    <th
                      key={c.id}
                      className={cn(
                        'text-left px-5 py-4 font-semibold border-r border-border last:border-r-0',
                        isMine && 'bg-accent/10 text-accent',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isMine && <Star className="w-4 h-4 fill-current" />}
                        <span className="text-base">{c.nameKo ?? c.name}</span>
                      </div>
                      {isMine && (
                        <div className="mt-0.5 text-[11px] font-normal text-accent/70 tracking-wide">
                          내 정산 MSA 포트폴리오
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {axes.map((ax, i) => (
                <tr
                  key={ax.id}
                  className={cn('border-b border-border last:border-b-0', i % 2 === 0 ? 'bg-bg' : 'bg-muted/10')}
                >
                  {/* 비교축 셀 — sticky left, 충분한 너비 */}
                  <td
                    className={cn(
                      'sticky left-0 z-10 backdrop-blur align-top px-5 py-5 border-r border-border',
                      i % 2 === 0 ? 'bg-bg/95' : 'bg-muted/30',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-accent/60 font-mono mt-0.5">
                        {String(ax.sortOrder ?? i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold leading-snug">{ax.name}</div>
                        {ax.question && (
                          <div className="text-xs text-fg/55 mt-1.5 leading-relaxed">{ax.question}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {visibleCompanies.map((co) => {
                    const cell = cellMap.get(`${ax.id}::${co.id}`);
                    const isMine = co.slug === 'my-project';
                    return (
                      <td
                        key={co.id}
                        className={cn(
                          'align-top px-5 py-5 border-r border-border last:border-r-0',
                          isMine && 'bg-accent/5',
                        )}
                      >
                        {cell?.cellSummary ? (
                          <button
                            onClick={() => setSelected(cell)}
                            className="text-left w-full group block"
                          >
                            <div className="font-medium leading-snug group-hover:text-accent transition-colors">
                              {cell.cellSummary}
                            </div>
                            {cell.evidence && cell.evidence[0]?.quote && (
                              <blockquote className="mt-2.5 pl-2.5 border-l-2 border-fg/15 group-hover:border-accent/40 transition-colors text-xs text-fg/65 leading-relaxed italic">
                                "{truncate(cell.evidence[0].quote, 110)}"
                              </blockquote>
                            )}
                            <div className="text-[11px] text-fg/45 mt-3 flex items-center gap-2 group-hover:text-accent/70 transition-colors">
                              <span className="font-medium">신뢰도 {Math.round((cell.confidence ?? 0) * 100)}%</span>
                              <span>·</span>
                              <span>근거 {cell.evidence?.length ?? 0}건</span>
                              <ChevronRight className="w-3 h-3 ml-auto" />
                            </div>
                          </button>
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[80px]">
                            <span className="text-fg/25 text-xs italic">사례 미수집</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      <EvidencePanel cell={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * 가로 스크롤 컨테이너. 좌·우에 fade gradient + 스크롤 가능 인디케이터를 표시해
 * 화면 밖에 추가 회사가 더 있다는 사실을 시각적으로 알린다.
 */
function ScrollableTable({ children, visibleCount }: { children: React.ReactNode; visibleCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeft(scrollLeft > 8);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [visibleCount]);

  return (
    <div className="relative">
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {/* 좌측 fade — 비교축 sticky 컬럼 뒤로 스크롤이 진행됐다는 신호 */}
      <div
        className={cn(
          'pointer-events-none absolute top-0 bottom-0 left-[260px] w-8',
          'bg-gradient-to-r from-bg/95 to-transparent transition-opacity duration-200',
          showLeft ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* 우측 fade — 추가 회사가 화면 밖에 있다는 신호 */}
      <div
        className={cn(
          'pointer-events-none absolute top-0 bottom-0 right-0 w-12',
          'bg-gradient-to-l from-bg via-bg/80 to-transparent transition-opacity duration-200',
          showRight ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* 우측 floating 인디케이터 */}
      {showRight && (
        <div
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2
                     px-2 py-1.5 rounded-md bg-accent text-white text-xs font-medium shadow-lg
                     flex items-center gap-1 animate-pulse"
        >
          더 보기 <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
