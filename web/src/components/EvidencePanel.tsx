'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { CellWithCompany } from '@/lib/queries';

interface Props {
  cell: CellWithCompany | null;
  onClose: () => void;
}

export function EvidencePanel({ cell, onClose }: Props) {
  return (
    <Dialog.Root open={cell !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content
          className="fixed right-0 top-0 h-full w-full sm:max-w-xl bg-bg border-l border-border z-50 overflow-y-auto p-6 shadow-xl"
        >
          {cell && (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <Dialog.Title className="text-xl font-semibold tracking-tight">
                    {cell.companyNameKo ?? cell.companyName} · {cell.axisName}
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-fg/60 mt-1">
                    {cell.cellSummary || '확인된 사례 없음'}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-2 hover:bg-muted rounded">
                  <X className="w-4 h-4" />
                </Dialog.Close>
              </div>

              {cell.confidence !== null && cell.evidence && cell.evidence.length > 0 && (
                <div className="mb-4 text-xs text-fg/50 flex items-center gap-3">
                  <span>신뢰도: {Math.round((cell.confidence ?? 0) * 100)}%</span>
                  <span>·</span>
                  <span>마지막 검증: {formatDate(cell.lastVerifiedAt)}</span>
                  {cell.isVerified === 1 && <span className="chip text-accent">✓ 검수됨</span>}
                </div>
              )}

              {cell.evidence && cell.evidence.length > 0 ? (
                <div className="space-y-4">
                  {cell.evidence.map((e, i) => (
                    <article key={i} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-sm leading-snug">{e.title}</h3>
                        <span className="text-xs text-fg/50 whitespace-nowrap">
                          {formatDate(e.publishedAt)}
                        </span>
                      </div>
                      {e.quote && (
                        <blockquote className="mt-3 pl-3 border-l-2 border-accent/40 text-sm text-fg/80 italic">
                          {e.quote}
                        </blockquote>
                      )}
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        원문 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-fg/60 p-4 bg-muted/50 rounded">
                  이 셀은 아직 인덱싱된 근거 글이 없습니다. 새 글이 수집되면 자동으로 채워집니다.
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
