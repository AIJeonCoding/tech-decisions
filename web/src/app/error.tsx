'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-narrow py-16">
      <div className="card p-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">문제가 발생했습니다</h1>
        <p className="mt-3 text-fg/60 leading-relaxed">
          페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          문제가 계속되면 브라우저 콘솔의 오류를 확인해 주세요.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-fg/40 font-mono">에러 ID: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={reset} className="btn-primary">
            <RotateCcw className="w-4 h-4" /> 다시 시도
          </button>
          <Link href="/" className="btn">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
