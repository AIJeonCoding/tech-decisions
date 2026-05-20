'use client';

import { MessageCircle, Sparkles, ArrowRight } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  '토스랑 카카오페이의 결제 동시성 처리 차이는?',
  '하이퍼커넥트의 영상통화 인프라는 어떻게 구축됐어?',
  'Outbox 패턴은 어떤 회사들이 어떻게 도입했어?',
];

function openChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent('open-chat', { detail: { prompt } }));
}

/**
 * Main-page hero card highlighting the RAG chatbot. Click → dispatches the
 * 'open-chat' window event which FloatingChat listens for.
 */
export default function HeroChatCTA() {
  return (
    <section className="container-wide pb-14">
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-fuchsia-500/5 to-violet-500/10 px-6 sm:px-10 py-10 sm:py-12">
        {/* Background glow blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1.3fr,1fr] gap-8 items-center">
          {/* Left — copy + CTA */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-accent">
                AI 챗봇 · 라이브
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="gradient-text">28개 회사</span>의 의사결정에<br />
              <span className="gradient-text">한국어로</span> 물어보세요
            </h2>

            <p className="mt-5 text-base sm:text-lg text-fg/75 leading-relaxed max-w-xl">
              검색에 부족함을 느꼈다면 챗봇으로 물어보세요. 77개 글·123개 비교 셀에서
              <strong className="text-fg"> 출처와 함께</strong> 답합니다.
              <br />
              모든 추론은 <strong className="text-fg">노트북에서 도는 로컬 LLM</strong>이 직접 처리 — API 키 0개.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => openChat()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-bg font-semibold text-sm shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                지금 챗봇 열기
                <ArrowRight className="w-4 h-4 opacity-70" />
              </button>
              <span className="inline-flex items-center text-[12px] text-fg/55 px-2">
                또는 우측 하단의 둥근 버튼을 눌러주세요
              </span>
            </div>
          </div>

          {/* Right — example prompts */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-fg/45 mb-2 ml-1">
              이런 질문을 던져보세요
            </div>
            {EXAMPLE_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => openChat(q)}
                className="w-full text-left text-sm px-4 py-3 rounded-xl bg-card border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors group"
              >
                <span className="text-accent mr-2 group-hover:translate-x-0.5 inline-block transition-transform">
                  →
                </span>
                <span className="text-fg/85 group-hover:text-fg">{q}</span>
              </button>
            ))}
            <div className="text-[10px] text-fg/40 mt-3 text-center">
              첫 응답은 약 20초. 두 번째부터 더 빠릅니다.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
