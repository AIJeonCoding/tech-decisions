import { Suspense } from 'react';
import { ChatClient } from './ChatClient';

export const metadata = { title: '챗봇' };

const SUGGESTIONS = [
  '토스는 정산 시점에서 동시성을 어떻게 처리해?',
  '카카오페이의 결제 멱등성 설계는?',
  '쿠팡은 대규모 트래픽에서 데이터 정합성을 어떻게 검증해?',
  '모놀리스에서 MSA로 전환할 때 어떤 사가 패턴이 유효했어?',
  'Outbox 패턴을 실제로 도입한 한국 회사 사례는?',
];

export default function ChatPage() {
  return (
    <div className="container-narrow py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">챗봇</h1>
        <p className="text-fg/60">
          인덱싱된 모든 글에서 출처와 함께 답합니다. 자료 밖 정보는 추측하지 않으니, 답이 부족할 땐
          비교 페이지를 같이 보세요.
        </p>
      </div>
      <Suspense fallback={<div className="text-fg/50">로딩…</div>}>
        <ChatClient suggestions={SUGGESTIONS} />
      </Suspense>
    </div>
  );
}
