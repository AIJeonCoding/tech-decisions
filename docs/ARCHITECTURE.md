# 시스템 아키텍처

## 한눈에 보기

```
                  ┌──────────────────────────┐
                  │  GitHub Actions cron     │
                  │  (매일 03:00 KST)        │
                  └──────────┬───────────────┘
                             │ pnpm crawl --all
                             ▼
        ┌──────────────────────────────────────────┐
        │  crawler/ (Node + TS)                    │
        │  ┌──────────┐  ┌────────────┐  ┌───────┐ │
        │  │ RSS/HTML │→ │  본문 추출 │→ │ 정규화│ │
        │  │ fetcher  │  │ (readability)│ │ markdown│
        │  └──────────┘  └────────────┘  └───┬───┘ │
        └─────────────────────────────────────┼────┘
                                              ▼
        ┌──────────────────────────────────────────┐
        │  LLM 파이프라인 (Anthropic SDK)          │
        │  ① 1줄 요약  (Haiku 4.5)                │
        │  ② 도메인 태깅 (Haiku 4.5, JSON)        │
        │  ③ 핵심 의사결정 3개 (Sonnet 4.6, JSON) │
        │  ④ 청킹 + 임베딩 (Voyage voyage-3)      │
        │  * 프롬프트 캐싱으로 시스템/few-shot 재사용 │
        └─────────────────────┬────────────────────┘
                              ▼
        ┌──────────────────────────────────────────┐
        │  Postgres + pgvector (Supabase/Neon)     │
        │  articles · chunks · tags · decisions    │
        │  IVFFlat on chunks.embedding             │
        └─────────────────────┬────────────────────┘
                              ▼
        ┌──────────────────────────────────────────┐
        │  web/ Next.js 15 (Vercel)                │
        │  · /compare/payment-settlement (비교표)  │
        │  · /search (BM25 + vector hybrid)        │
        │  · /chat (RAG, streaming, citations)     │
        └──────────────────────────────────────────┘
```

## 기술 스택 결정

| 레이어 | 선택 | 근거 |
|---|---|---|
| Frontend | Next.js 15 App Router + TS + Tailwind + shadcn/ui | SSR이 SEO에 필요 (도메인 페이지가 검색 진입점), 스트리밍 RSC가 챗봇 UX와 자연스러움 |
| Hosting | Vercel | Next.js 친화 + 무료 한도 충분 + 면접에서 URL 공유 즉시 |
| DB | Postgres 16 + pgvector | 관계형 + 벡터 검색을 한 DB로. RAG 단순화. Supabase 무료 → Neon 이전 옵션 |
| ORM | Drizzle | TS 타입 안전, 마이그레이션 간단, edge runtime 호환 |
| 크롤러 | Node + cheerio + @mozilla/readability | 본문 추출은 readability가 사실상 표준. 동적 페이지 만나면 Playwright 추가 |
| LLM 요약/태깅 | Claude Haiku 4.5 | 글당 비용 $0.001, 단순 분류·요약에 충분 |
| LLM 의사결정 추출 | Claude Sonnet 4.6 | JSON schema 강제 + 추론 깊이 필요 (axis/choice/rationale) |
| LLM RAG 답변 | Claude Sonnet 4.6 | 인용 정확도 + 한국어 자연스러움 |
| 임베딩 | Voyage `voyage-3` (1024d) | 한국어 성능 OpenAI 대비 우위, 비용 동등 |
| 검색 | Postgres BM25 (`pg_search` 또는 `tsvector`) + pgvector hybrid | 외부 ES 운영 부담 회피 |
| Cron | GitHub Actions (`schedule: '0 18 * * *'` UTC = 03 KST) | 무료, 별도 인프라 X |

## 데이터 모델 (요약)

```sql
companies(id, name, slug, blog_url, github_url)
sources(id, company_id, type='blog'|'video', feed_url)
articles(id, source_id, url, title, body_md, published_at,
         summary, decisions jsonb, tags text[], hash, last_crawled_at)
chunks(id, article_id, idx, text, embedding vector(1024))
domains(slug, name, description)
article_domains(article_id, domain_slug)
comparisons(domain_slug, axis_slug, company_id, cell_text, source_article_id)
```

상세는 [DOMAIN_MODEL.md](./DOMAIN_MODEL.md).

## 프롬프트 캐싱 전략 (비용 80% 절감)

- 태깅·요약 시스템 프롬프트 + few-shot 예시 → `cache_control: ephemeral` 마킹
- 동일 시스템 프롬프트로 100글 연속 처리 시 input 토큰 90% 캐시 히트
- 의사결정 추출은 도메인별로 다른 schema → 도메인별 캐시 키 분리
- RAG 답변은 검색된 청크 묶음을 캐시 (같은 질의 재사용 시)

## RAG 정확도 가드레일

1. **하이브리드 검색**: vector top-20 + BM25 top-20 → RRF 머지 → top-8을 컨텍스트로
2. **인용 강제**: 답변 본문에 `[1]`, `[2]` 인라인 인용 + 하단 출처 카드 미생성 시 답변 거부
3. **불충분 신호**: top-1 유사도 < 0.6일 때 "확인된 사례가 없다"고 응답
4. **출처 신뢰도**: 공식 블로그(`source.type='blog'`) > 영상 자막 (V2)

## 비용 가드 (월 한도)

| 항목 | 월 예상 |
|---|---|
| Anthropic API (1000글 처리 + 챗봇 100쿼리/일) | $15~20 |
| Voyage 임베딩 | $2 |
| Supabase | $0 (무료 티어) |
| Vercel | $0 |
| **합계** | **~$25/월** |

비용 초과 시 환경변수 `LLM_DAILY_BUDGET_USD`로 차단.
