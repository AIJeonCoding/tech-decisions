'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Send, ExternalLink } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface Citation {
  index: number;
  title: string;
  url: string;
  company: string;
  companySlug: string;
  publishedAt: string | null;
  heading: string | null;
}

interface ChatClientProps {
  suggestions: string[];
}

export function ChatClient({ suggestions }: ChatClientProps) {
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranInitial = useRef(false);

  async function ask(q: string) {
    if (!q.trim() || streaming) return;
    setQuestion(q);
    setAnswer('');
    setCitations([]);
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const ev of events) {
          if (!ev.startsWith('data: ')) continue;
          const payload = ev.slice(6);
          try {
            const msg = JSON.parse(payload) as
              | { type: 'citations'; data: Citation[] }
              | { type: 'delta'; text: string }
              | { type: 'done' }
              | { type: 'error'; message: string };
            if (msg.type === 'citations') setCitations(msg.data);
            else if (msg.type === 'delta') setAnswer((a) => a + msg.text);
            else if (msg.type === 'error') setError(msg.message);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  useEffect(() => {
    if (initialQ && !ranInitial.current) {
      ranInitial.current = true;
      setInput(initialQ);
      ask(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요"
            className="flex-1 px-3 py-2.5 rounded-md border border-border bg-bg focus:outline-none focus:border-accent"
            disabled={streaming}
          />
          <button type="submit" disabled={streaming || !input.trim()} className="btn-primary disabled:opacity-50">
            <Send className="w-4 h-4" /> 보내기
          </button>
        </form>

        {!question && !streaming && (
          <div className="space-y-2">
            <div className="text-sm text-fg/50 mb-2">예시 질문</div>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s);
                  ask(s);
                }}
                className="block w-full text-left px-4 py-3 rounded-md border border-border hover:bg-muted/50 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {question && (
          <div className="card p-5">
            <div className="text-xs text-fg/50 mb-2">질문</div>
            <div className="font-medium">{question}</div>
          </div>
        )}

        {(answer || streaming) && (
          <div className="card p-5">
            <div className="text-xs text-fg/50 mb-3">답변</div>
            <article className={cn('prose prose-sm max-w-none', streaming && 'streaming')}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                  code: ({ children }) => (
                    <code className="px-1 py-0.5 bg-muted rounded text-[0.85em]">{children}</code>
                  ),
                }}
              >
                {answer}
              </ReactMarkdown>
            </article>
          </div>
        )}

        {error && <div className="text-red-500 text-sm">{error}</div>}
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-4">
          <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-3">
            출처 ({citations.length})
          </h2>
          <div className="space-y-3">
            {citations.length === 0 && !streaming && (
              <p className="text-sm text-fg/40">질문하면 인용한 글이 여기 표시됩니다.</p>
            )}
            {citations.map((c) => (
              <a
                key={c.index}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-md border border-border hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-semibold">
                    {c.index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-fg/50 mb-0.5">{c.company}</div>
                    <div className="text-sm font-medium leading-snug">{c.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-fg/40">
                      <span>{formatDate(c.publishedAt)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
