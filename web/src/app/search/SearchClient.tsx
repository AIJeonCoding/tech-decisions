'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { formatRelative, truncate } from '@/lib/utils';

interface SearchResult {
  articleId: number;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
  companySlug: string;
  companyName: string;
  companyNameKo: string | null;
  snippet: string;
  rank: number;
}

const DOMAINS = [
  { slug: '', name: '전체' },
  { slug: 'payment-settlement', name: '결제·정산' },
  { slug: 'search', name: '검색' },
  { slug: 'recommendation', name: '추천' },
  { slug: 'msa-migration', name: 'MSA 전환' },
  { slug: 'realtime-data', name: '실시간 데이터' },
];

export function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const initialDomain = params.get('domain') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [domain, setDomain] = useState(initialDomain);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(q: string, d: string) {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/search?q=${encodeURIComponent(q)}${d ? `&domain=${d}` : ''}`;
      const res = await fetch(url);
      const json = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (json.error) throw new Error(json.error);
      setResults(json.results ?? []);
    } catch (e) {
      setError((e as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQ) runSearch(initialQ, initialDomain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    sp.set('q', query);
    if (domain) sp.set('domain', domain);
    router.replace(`/search?${sp.toString()}`);
    runSearch(query, domain);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예) 정산 동시성 멱등키"
            className="w-full pl-9 pr-3 py-2.5 rounded-md border border-border bg-bg focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="px-3 py-2.5 rounded-md border border-border bg-bg"
        >
          {DOMAINS.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">검색</button>
      </form>

      {loading && <div className="text-fg/50 text-sm">검색 중…</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="space-y-3">
        {results.map((r) => (
          <a
            key={r.articleId}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="block card p-4 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-fg/50">
              <span>{r.companyNameKo ?? r.companyName}</span>
              <span>·</span>
              <span>{formatRelative(r.publishedAt)}</span>
              <span className="ml-auto text-fg/30">rank {r.rank.toFixed(2)}</span>
            </div>
            <h3 className="mt-1 font-medium">{r.title}</h3>
            {r.summary && (
              <p className="mt-1 text-sm text-fg/60 line-clamp-1">{r.summary}</p>
            )}
            <p
              className="mt-2 text-sm text-fg/70 leading-relaxed line-clamp-3"
              // FTS5 snippet returns HTML with <mark> tags around matched terms
              dangerouslySetInnerHTML={{ __html: r.snippet || truncate(r.summary ?? '', 200) }}
            />
          </a>
        ))}
        {!loading && results.length === 0 && initialQ && (
          <div className="text-fg/50 text-sm">검색 결과가 없습니다.</div>
        )}
      </div>
    </>
  );
}
