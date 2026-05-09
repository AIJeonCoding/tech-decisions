import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: '페이지를 찾을 수 없습니다',
};

export default function NotFound() {
  return (
    <div className="container-narrow py-20">
      <div className="card p-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-fg/60 mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-fg/60">
          요청하신 주소가 잘못됐거나, 도메인이 아직 V1에 포함되지 않았을 수 있습니다.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            <ArrowLeft className="w-4 h-4" /> 홈으로
          </Link>
          <Link href="/compare/payment-settlement" className="btn">
            결제·정산 비교 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
