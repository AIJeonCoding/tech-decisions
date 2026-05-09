'use client';

import { useMemo, useState } from 'react';
import { cn, truncate } from '@/lib/utils';
import { EvidencePanel } from './EvidencePanel';
import type { CellWithCompany } from '@/lib/queries';

interface Axis {
  id: number;
  slug: string;
  name: string;
  question: string | null;
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

export function CompareTable({ axes, companies, cells }: Props) {
  const [selected, setSelected] = useState<CellWithCompany | null>(null);
  const [filteredCompanies, setFilteredCompanies] = useState<Set<number>>(
    new Set(companies.map((c) => c.id)),
  );

  const cellMap = useMemo(() => {
    const m = new Map<string, CellWithCompany>();
    for (const c of cells) m.set(`${c.axisId}::${c.companyId}`, c);
    return m;
  }, [cells]);

  const visibleCompanies = companies.filter((c) => filteredCompanies.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => {
          const on = filteredCompanies.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => {
                const next = new Set(filteredCompanies);
                if (on) next.delete(c.id);
                else next.add(c.id);
                setFilteredCompanies(next);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-xs border transition-colors',
                on
                  ? 'bg-accent/10 border-accent/50 text-accent'
                  : 'bg-muted border-border text-fg/50',
              )}
            >
              {c.nameKo ?? c.name}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-fg/60 w-48">비교축</th>
              {visibleCompanies.map((c) => (
                <th key={c.id} className="text-left px-4 py-3 font-medium min-w-[200px]">
                  {c.nameKo ?? c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {axes.map((ax, i) => (
              <tr key={ax.id} className={cn('border-b border-border', i % 2 === 0 ? '' : 'bg-muted/20')}>
                <td className="px-4 py-4 align-top">
                  <div className="font-medium">{ax.name}</div>
                  {ax.question && (
                    <div className="text-xs text-fg/50 mt-1 leading-snug">{ax.question}</div>
                  )}
                </td>
                {visibleCompanies.map((co) => {
                  const cell = cellMap.get(`${ax.id}::${co.id}`);
                  return (
                    <td key={co.id} className="px-4 py-4 align-top">
                      {cell?.cellSummary ? (
                        <button
                          onClick={() => setSelected(cell)}
                          className="text-left w-full group"
                        >
                          <div className="font-medium leading-snug group-hover:text-accent transition-colors">
                            {cell.cellSummary}
                          </div>
                          {cell.evidence && cell.evidence[0]?.quote && (
                            <div className="text-xs text-fg/60 mt-2 leading-snug italic">
                              "{truncate(cell.evidence[0].quote, 100)}"
                            </div>
                          )}
                          <div className="text-[11px] text-fg/40 mt-2 flex items-center gap-2">
                            <span>{cell.evidence?.length ?? 0}건 근거</span>
                            <span>·</span>
                            <span>신뢰도 {Math.round((cell.confidence ?? 0) * 100)}%</span>
                          </div>
                        </button>
                      ) : (
                        <span className="text-fg/30 text-xs italic">확인된 사례 없음</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EvidencePanel cell={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
