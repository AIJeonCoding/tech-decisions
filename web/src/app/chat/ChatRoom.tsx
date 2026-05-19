'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { MessageSquareText, Send, Loader2, Sparkles } from 'lucide-react';

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
  '토스랑 카카오페이의 결제 동시성 처리 차이는?',
  'Outbox 패턴은 어떤 회사들이 어떻게 도입했어?',
  '이중기장 + 시산표를 자동으로 검증하는 사례가 있어?',
  '한국 빅테크 검색은 무슨 엔진을 써?',
  'MSA 분산 트랜잭션 — Saga 채택한 회사 정리해줘',
];

export default function ChatRoom() {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    const turnIdx = turns.length;
    setTurns((t) => [...t, { user: question, answer: '', citations: [], streaming: true }]);
    setInput('');
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text();
        setTurns((t) =>
          t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false, error: txt || `HTTP ${res.status}` } : tr)),
        );
        return;
      }
      await consumeSse(res.body, (event, data) => {
        if (event === 'citations') {
          setTurns((t) => t.map((tr, i) => (i === turnIdx ? { ...tr, citations: data as Citation[] } : tr)));
        } else if (event === 'token') {
          setTurns((t) =>
            t.map((tr, i) => (i === turnIdx ? { ...tr, answer: tr.answer + (data as string) } : tr)),
          );
        } else if (event === 'done') {
          setTurns((t) => t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false } : tr)));
        } else if (event === 'error') {
          setTurns((t) =>
            t.map((tr, i) =>
              i === turnIdx ? { ...tr, streaming: false, error: (data as { message: string }).message } : tr,
            ),
          );
        }
      });
    } catch (e) {
      setTurns((t) =>
        t.map((tr, i) => (i === turnIdx ? { ...tr, streaming: false, error: (e as Error).message } : tr)),
      );
    }
  }

  return (
    <>
      <header className="mb-6">
        <span className="chip mb-3 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> V2 — 로컬 Gemma RAG 챗봇
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          빅테크는 이 문제를<br /> 어떻게 풀었지?
        </h1>
        <p className="mt-3 text-fg/65 text-sm leading-relaxed">
          모든 추론은 노트북에서 도는 <code className="text-xs bg-muted px-1 py-0.5 rounded">gemma3n:e2b</code> +
          <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">nomic-embed-text</code>로 처리합니다. API 키 0개.
        </p>
      </header>

      {turns.length === 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-fg/55 mb-2">빠른 질문</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent/50 hover:bg-accent/5 text-fg/70"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <div className="card p-4 bg-muted/30">
              <div className="text-[11px] uppercase tracking-wider text-fg/55 mb-1">질문</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.user}</p>
            </div>
            <div className="card p-4">
              <div className="text-[11px] uppercase tracking-wider text-fg/55 mb-1 flex items-center gap-1">
                <MessageSquareText className="w-3 h-3" /> Gemma E2B 응답
                {t.streaming && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </div>
              {t.error ? (
                <p className="text-sm text-red-500">{t.error}</p>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.answer || '…'}</p>
              )}
              {t.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-fg/55 mb-1.5">근거</div>
                  <ul className="space-y-1">
                    {t.citations.slice(0, 6).map((c, j) => (
                      <li key={`${c.source}-${c.id}`} className="text-xs text-fg/70">
                        <span className="text-fg/40 mr-1">{j + 1}.</span>
                        {citationLink(c)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-4 mt-8"
      >
        <div className="flex gap-2 card p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 토스의 멱등키 처리 방식은?"
            className="flex-1 bg-transparent px-3 py-2 outline-none text-sm"
            disabled={turns.some((t) => t.streaming)}
          />
          <button
            type="submit"
            disabled={!input.trim() || turns.some((t) => t.streaming)}
            className="px-3 py-2 rounded-md bg-accent text-bg text-sm font-medium inline-flex items-center gap-1 disabled:opacity-40"
          >
            <Send className="w-4 h-4" /> 물어보기
          </button>
        </div>
      </form>
    </>
  );
}

function citationLink(c: Citation) {
  if (c.source === 'article' && c.url) {
    return (
      <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-accent underline-offset-2 hover:underline">
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

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      try {
        onEvent(event, data ? JSON.parse(data) : null);
      } catch {
        onEvent(event, data);
      }
    }
  }
}
