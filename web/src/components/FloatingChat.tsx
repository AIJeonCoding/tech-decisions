'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, Sparkles, X, Loader2, RotateCcw } from 'lucide-react';

interface Citation {
  source: 'article' | 'cell';
  id: number;
  title: string;
  url?: string;
  companySlug?: string;
  companyName?: string;
  axisName?: string;
  domainSlug?: string;
}

interface Turn {
  user: string;
  answer: string;
  citations: Citation[];
  streaming: boolean;
  error?: string;
}

const QUICK_PROMPTS = [
  '토스의 결제 동시성 처리 방식은?',
  '하이퍼커넥트의 영상통화 인프라는?',
  'Outbox 패턴 도입한 회사 정리해줘',
  '한국 빅테크 검색 엔진 비교',
];

/**
 * Right-bottom floating chatbot widget — RAG over the tech-decisions DB.
 * Same two-stage HMAC flow as /chat: Vercel /api/chat-init → Funnel direct.
 * Mounted globally from layout.tsx; renders only when chatBackendEnabled().
 */
export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        inputRef.current?.focus();
      });
    }
  }, [open, turns.length]);

  // External components (HeroChatCTA, etc.) open the panel via a custom event.
  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true);
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) {
        // Auto-fire the question if a prompt was passed in
        setTimeout(() => ask(detail.prompt!), 350);
      }
    }
    window.addEventListener('open-chat', onOpen);
    return () => window.removeEventListener('open-chat', onOpen);
  }, []);

  async function ask(question: string) {
    if (!question.trim()) return;
    const turnIdx = turns.length;
    setTurns((t) => [...t, { user: question, answer: '', citations: [], streaming: true }]);
    setInput('');

    try {
      const initRes = await fetch('/api/chat-init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      if (!initRes.ok) {
        const txt = await initRes.text();
        setTurns((t) =>
          t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false, error: txt || `HTTP ${initRes.status}` } : tr)),
        );
        return;
      }
      const init = (await initRes.json()) as {
        funnelUrl: string;
        token: string;
        model: string;
        prompt: string;
        system: string;
        think?: boolean;
        options?: Record<string, unknown>;
        citations: Citation[];
      };
      setTurns((t) => t.map((tr, i) => (i === turnIdx ? { ...tr, citations: init.citations } : tr)));

      const genRes = await fetch(`${init.funnelUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${init.token}` },
        body: JSON.stringify({
          model: init.model,
          prompt: init.prompt,
          system: init.system,
          stream: true,
          think: init.think ?? false,
          options: init.options,
        }),
      });
      if (!genRes.ok || !genRes.body) {
        const txt = await genRes.text().catch(() => '');
        setTurns((t) =>
          t.map((tr, i) =>
            i === turnIdx ? { ...tr, streaming: false, error: txt || `funnel HTTP ${genRes.status}` } : tr,
          ),
        );
        return;
      }
      await consumeNdjson(genRes.body, (obj) => {
        if (typeof obj.response === 'string') {
          setTurns((t) => t.map((tr, i) => (i === turnIdx ? { ...tr, answer: tr.answer + obj.response } : tr)));
        }
        if (obj.done) {
          setTurns((t) => t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false } : tr)));
        }
      });
    } catch (e) {
      setTurns((t) =>
        t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false, error: (e as Error).message } : tr)),
      );
    }
  }

  const busy = turns.some((t) => t.streaming);

  return (
    <>
      {/* Toggle FAB — visible only when closed */}
      {!open && (
        <button
          aria-label="AI 챗봇 열기"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-accent text-bg shadow-lg shadow-accent/30 flex items-center justify-center hover:scale-105 hover:shadow-xl hover:shadow-accent/40 transition-all duration-200 group"
        >
          <MessageCircle className="w-6 h-6" strokeWidth={2.2} />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-bg animate-pulse" />
          <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-md bg-card border border-border text-fg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow">
            AI에게 물어보기
          </span>
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(580px,calc(100vh-2rem))] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-right ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="dialog"
        aria-label="tech-decisions AI 챗봇"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">AI에게 물어보기</div>
              <div className="text-[10px] text-fg/50">
                qwen3:1.7b · 노트북 RAG · 응답 ~20초
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {turns.length > 0 && (
              <button
                aria-label="새 대화 시작"
                onClick={() => {
                  if (busy) return;
                  setTurns([]);
                  setInput('');
                }}
                disabled={busy}
                title="새 대화"
                className="px-2 h-8 rounded-md hover:bg-muted text-fg/60 hover:text-fg flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                새 대화
              </button>
            )}
            <button
              aria-label="닫기"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-md hover:bg-muted text-fg/60 hover:text-fg flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
          {turns.length === 0 && (
            <div className="flex flex-col items-center text-center pt-6 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium mb-1">한국 빅테크 비교에 물어보세요</p>
              <p className="text-[11px] text-fg/55 leading-relaxed max-w-[260px]">
                28개 회사 / 77 글 / 123 비교 셀에서 RAG로 답합니다.
                <br />
                응답은 노트북에서 도는 LLM이 직접 만듭니다.
              </p>
            </div>
          )}

          {turns.length === 0 && (
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left text-[12px] px-3 py-2 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 text-fg/75 hover:text-fg transition-colors"
                >
                  <span className="text-accent mr-1.5">→</span>
                  {q}
                </button>
              ))}
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent text-bg text-[13px] px-3 py-2 leading-relaxed">
                  {t.user}
                </div>
              </div>

              {/* AI bubble */}
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-muted/40 border border-border text-[13px] px-3 py-2 leading-relaxed">
                  {t.error ? (
                    <span className="text-red-500">{t.error}</span>
                  ) : t.answer ? (
                    <p className="whitespace-pre-wrap">{t.answer}</p>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-fg/55">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      검색 + 추론 중…
                    </span>
                  )}
                  {t.streaming && t.answer && (
                    <span className="inline-block w-1 h-3 ml-0.5 bg-accent animate-pulse rounded-sm align-middle" />
                  )}

                  {t.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/60">
                      <div className="text-[9px] uppercase tracking-wider text-fg/45 mb-1">근거</div>
                      <ul className="space-y-0.5">
                        {t.citations.slice(0, 4).map((c, j) => (
                          <li key={`${c.source}-${c.id}`} className="text-[11px] text-fg/70">
                            <span className="text-fg/35 mr-1">{j + 1}.</span>
                            {citationLink(c)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="border-t border-border bg-bg p-2"
        >
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="질문을 입력하세요…"
              disabled={busy}
              className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent/60 focus:bg-bg transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="shrink-0 w-9 h-9 rounded-lg bg-accent text-bg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[9px] text-fg/40 text-center">
            응답은 노트북에서 도는 로컬 LLM이 만듭니다. 첫 답은 20~30초 소요.
          </p>
        </form>
      </div>
    </>
  );
}

function citationLink(c: Citation) {
  if (c.source === 'article' && c.url) {
    return (
      <a
        href={c.url}
        target="_blank"
        rel="noreferrer"
        className="hover:text-accent underline-offset-2 hover:underline"
      >
        {c.title}
      </a>
    );
  }
  if (c.source === 'cell' && c.domainSlug) {
    return (
      <Link href={`/compare/${c.domainSlug}`} className="hover:text-accent underline-offset-2 hover:underline">
        {c.title}
      </Link>
    );
  }
  if (c.companySlug) {
    return (
      <Link href={`/companies/${c.companySlug}`} className="hover:text-accent underline-offset-2 hover:underline">
        {c.title}
      </Link>
    );
  }
  return <span>{c.title}</span>;
}

async function consumeNdjson(
  body: ReadableStream<Uint8Array>,
  onObj: (obj: { response?: string; done?: boolean }) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onObj(JSON.parse(line));
      } catch {
        // ignore partial json
      }
    }
  }
}
