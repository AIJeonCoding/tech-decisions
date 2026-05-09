import Link from 'next/link';
import { CheckCircle2, AlertCircle, ExternalLink, Layers } from 'lucide-react';
import { getAdminCells, getAdminStats } from '@/lib/admin-queries';
import { formatDate, cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '셀 검수 콘솔',
  robots: { index: false, follow: false },
};

function confidenceBadgeClass(c: number): string {
  if (c >= 0.85) return 'bg-green-50 text-green-700 border-green-200';
  if (c >= 0.7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

export default async function AdminCellsPage() {
  const [cells, stats] = await Promise.all([getAdminCells(), getAdminStats()]);

  // group cells by domain → axis for readable table
  type RowGroup = { domainName: string; axisName: string; rows: typeof cells };
  const groups: RowGroup[] = [];
  for (const c of cells) {
    const last = groups[groups.length - 1];
    const key = `${c.domainName}|${c.axisName}`;
    if (last && `${last.domainName}|${last.axisName}` === key) {
      last.rows.push(c);
    } else {
      groups.push({ domainName: c.domainName, axisName: c.axisName, rows: [c] });
    }
  }

  return (
    <div className="container-wide py-10">
      <Breadcrumbs items={[{ href: '/admin/cells', label: '셀 검수 콘솔' }]} />
      <header className="mb-8">
        <div className="text-sm text-fg/50 flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4" /> Admin
        </div>
        <h1 className="text-3xl font-bold tracking-tight">셀 검수 콘솔</h1>
        <p className="mt-2 text-fg/60">
          시드 또는 V2 LLM 자동 추출본을 사람이 직접 확인하는 read-only 대시보드.
          신뢰도 0.85 이상이거나 운영자가 검증한 셀만 비교 페이지에서 강조됩니다.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-fg/50">전체 셀</div>
          <div className="mt-1 text-3xl font-bold">{stats.totalCells}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-fg/50">신뢰도 ≥ 0.85</div>
          <div className="mt-1 text-3xl font-bold text-green-600">
            {stats.highConfidenceCells}
            <span className="text-base font-normal text-fg/40 ml-1">
              / {stats.totalCells}
            </span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-fg/50">사람 검증됨</div>
          <div className="mt-1 text-3xl font-bold">{stats.verifiedCells}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-3">도메인별 평균 신뢰도</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.byDomain.map((d) => (
            <div key={d.slug} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.name}</div>
                <span className="text-xs text-fg/50">{d.count}셀</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.round(d.avgConfidence * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-fg/50">
                평균 {Math.round(d.avgConfidence * 100)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-3">전체 셀 목록</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-fg/60">도메인 / 축</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">회사</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">요약</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">신뢰도</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">검증</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">출처</th>
                <th className="text-left px-4 py-3 font-medium text-fg/60">갱신일</th>
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((g, gi) =>
                g.rows.map((c, ri) => (
                  <tr
                    key={c.cellId}
                    className={cn(
                      'border-b border-border align-top',
                      gi % 2 === 0 ? '' : 'bg-muted/20',
                    )}
                  >
                    {ri === 0 && (
                      <td
                        className="px-4 py-3 align-top"
                        rowSpan={g.rows.length}
                      >
                        <div className="text-xs text-fg/50">{g.domainName}</div>
                        <div className="font-medium leading-snug mt-1">{g.axisName}</div>
                      </td>
                    )}
                    <td className="px-4 py-3">{c.companyName}</td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium leading-snug">
                        {c.cellSummary || <span className="text-fg/40 italic">없음</span>}
                      </div>
                      <div className="text-xs text-fg/50 mt-1">
                        근거 {c.evidenceCount}건
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs border',
                          confidenceBadgeClass(c.confidence),
                        )}
                      >
                        {Math.round(c.confidence * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.isVerified ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-fg/30" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.firstUrl ? (
                        <a
                          href={c.firstUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent text-xs hover:underline"
                        >
                          원문 <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-fg/30 text-xs">없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg/50">
                      {formatDate(c.lastVerifiedAt)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-8 text-xs text-fg/50">
        <Link href="/" className="hover:underline">← 메인으로</Link>
        <span className="mx-2">·</span>
        <span>이 페이지는 robots noindex 처리됩니다.</span>
      </footer>
    </div>
  );
}
