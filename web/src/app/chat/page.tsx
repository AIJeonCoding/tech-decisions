import Link from 'next/link';
import { MessageSquareText, Search, Layers } from 'lucide-react';

export const metadata = {
  title: '챗봇',
  description: 'RAG 챗봇은 V2에서 출시 예정입니다. 지금은 검색과 비교 페이지를 사용해주세요.',
};

export default function ChatPage() {
  return (
    <div className="container-narrow py-16">
      <div className="card p-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-4">
          <MessageSquareText className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">챗봇은 V2 예정</h1>
        <p className="mt-3 text-fg/60 max-w-md mx-auto leading-relaxed">
          자연어로 묻고 출처와 함께 답하는 RAG 챗봇은 인덱싱이 충분히 쌓인 뒤 V2에서 활성화할 예정입니다.
          지금은 키워드 검색과 비교 페이지로도 의사결정에 필요한 사례를 충분히 찾을 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/compare/payment-settlement" className="btn-primary">
            <Layers className="w-4 h-4" /> 비교 페이지로
          </Link>
          <Link href="/search" className="btn">
            <Search className="w-4 h-4" /> 검색으로
          </Link>
        </div>
      </div>
    </div>
  );
}
