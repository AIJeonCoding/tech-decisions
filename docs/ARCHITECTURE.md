# 시스템 아키텍처

## V1 — 한눈에 보기

```
                ┌──────────────────────────────────────┐
                │  데이터 큐레이션 (Claude Code, 수동)  │
                │  · 한국 빅테크 블로그 직접 분석       │
                │  · 비교축마다 인용 + 출처 작성        │
                └──────────────────┬───────────────────┘
                                   ▼
                ┌──────────────────────────────────────┐
                │  db/src/seed-*.ts                    │
                │  (companies/sources/domains/axes/    │
                │   cells/articles + FTS5 트리거)      │
                └──────────────────┬───────────────────┘
                                   ▼
                ┌──────────────────────────────────────┐
                │  SQLite (tech-decisions.db, ~600KB)  │
                │  · companies(10) · sources(10)       │
                │  · domains(5) · axes(10)             │
                │  · cells(37) · articles(37)          │
                │  · articles_fts (FTS5 가상테이블)    │
                └──────────────────┬───────────────────┘
                                   ▼
                ┌──────────────────────────────────────┐
                │  web/ Next.js 15 (Vercel)            │
                │  · /                홈 + 5축 미리보기   │
                │  · /about           면접 진입 통합      │
                │  · /compare/[domain] 비교표 5개         │
                │  · /companies/[slug] 회사 프로필 11개   │
                │  · /articles/[id]    글 상세 48편       │
                │  · /search           FTS5 + 도메인 그룹 │
                │  · /chat             자주 묻는 질문 8개 │
                │  · /admin/cells      셀 검수 콘솔       │
                │  · /sitemap.xml 67 URL + 동적 OG 62개  │
                └──────────────────────────────────────┘
```

## V2 — 자동화 트랙 (코드 준비됨, 비활성)

```
        ┌──────────────────────────┐
        │  GitHub Actions cron     │  (수동 dispatch만 활성)
        │  매일 03:00 KST          │
        └──────────┬───────────────┘
                   │
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
        │  · 프롬프트 캐싱으로 시스템 입력 토큰 절감 │
        │  · 일일 비용 가드 (LLM_DAILY_BUDGET_USD) │
        └─────────────────────┬────────────────────┘
                              ▼
        SQLite 시드를 자동 분석본으로 덮어쓰고
        cells.is_verified = 0으로 마킹 → 사람 검수 후 1로 승격
```

## V1 기술 스택 결정

| 레이어 | 선택 | 근거 |
|---|---|---|
| Frontend | Next.js 15 App Router + TS + Tailwind + shadcn-style + Radix Dialog | SSR로 SEO + 간단한 UX |
| Hosting | Vercel | 무료, 인프라 0 |
| DB | **SQLite (better-sqlite3) + FTS5** | 외부 인프라 0, 30초 셋업, 한국어 prefix 검색 가능 |
| ORM | Drizzle 0.36 sqlite-core | TS 타입 안전, mode:'json' 자동 (de)serialize |
| 데이터 | **Claude Code 수동 큐레이션 (37+37)** | LLM 자동 인덱싱 인프라 없이도 데모 품질 확보 |
| 검색 | SQLite FTS5 (`unicode61 + prefix '2 3 4'`) | 한국어 어절 토크나이저 + prefix로 부분 매칭 |

## V2 추가 결정

| 레이어 | 선택 | 근거 |
|---|---|---|
| Crawler | Node + cheerio + readability | 본문 추출은 readability가 사실상 표준 |
| LLM 요약/태깅 | Claude Haiku 4.5 | 글당 비용 $0.001, 단순 분류·요약에 충분 |
| LLM 의사결정 추출 | Claude Sonnet 4.6 | JSON schema 강제 + 추론 깊이 |
| Cron | GitHub Actions | 무료, 별도 인프라 X |

## 데이터 모델 (V1)

```sql
companies(id, slug, name, name_ko, blog_url, github_url)
sources(id, company_id, type, feed_url, adapter)
articles(id, source_id, url, url_hash, title, body_md, summary,
         decisions JSON, tags JSON, domains JSON, ...)
articles_fts (virtual table)  -- FTS5 동기화 트리거
domains(slug, name, description, priority)
axes(id, domain_slug, slug, name, question, options JSON, sort_order)
cells(id, axis_id, company_id, cell_summary, evidence JSON,
      confidence, is_verified, last_verified_at)
```

상세는 [DOMAIN_MODEL.md](./DOMAIN_MODEL.md).

## V1 검색 구현 — SQLite FTS5

- 가상 테이블: `articles_fts(title, summary, body)` with `tokenize='unicode61 remove_diacritics 2', prefix='2 3 4'`
- 트리거: articles INSERT/UPDATE/DELETE → fts 자동 동기화
- 쿼리: 사용자 입력 → 토큰 분리 → 각 토큰을 `("토큰" OR 토큰*)`로 묶어 OR 결합 → BM25 정렬
- 하이라이트: `snippet(articles_fts, 2, '<mark>', '</mark>', '…', 24)`

한국어 어절 토크나이저는 "Outbox 패턴 도입기" → ["Outbox", "패턴", "도입기"]로 자른다. prefix 옵션으로 "패턴" 입력만으로도 "패턴" 토큰 hit, "도입" 입력으로도 "도입기" 매칭.

## 비용 (V1)

| 항목 | 월 비용 |
|---|---|
| Anthropic | $0 (V1은 수동 큐레이션) |
| Vercel free tier | $0 |
| **합계** | **$0/월** |

V2 활성화 시 ~$25/월 (이전 설계의 비용 가드 그대로 유지).
