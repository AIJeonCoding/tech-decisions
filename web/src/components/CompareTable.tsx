'use client';

import { useMemo, useState } from 'react';
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
        <div className="text-xs text-fg/50 uppercase tracking-wider mb-2">비교 대상 회사</div>
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
                    : 'bg-muted border-border text-fg/50 hover:bg-muted/70',
                )}
              >
                {isMine && <Star className="w-3 h-3 fill-current" />}
                {c.nameKo ?? c.name}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-fg/50">
        ← 좌우로 스크롤하여 모든 회사 비교 · 셀 클릭하면 출처 패널이 열립니다
      </p>

      {/* 비교 테이블 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col className="w-[260px]" />
              {visibleCompanies.map((c) => (
                <col key={c.id} className="min-w-[280px]" />
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
        </div>
      </div>

      <EvidencePanel cell={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
