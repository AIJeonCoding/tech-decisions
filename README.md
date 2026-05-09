# tech-decisions

> 한국 빅테크의 엔지니어링 의사결정을 비교·검색·질의하는 서비스.
> "다른 회사는 이 문제를 어떻게 풀었지?"에 30초 안에 답한다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Ftech-decisions&project-name=tech-decisions&repository-name=tech-decisions)
**5분 만에 면접용 URL 만들기**: [docs/DEPLOY_5MIN.md](./docs/DEPLOY_5MIN.md)

[![status](https://img.shields.io/badge/status-MVP-blue)]() [![stack](https://img.shields.io/badge/stack-Next.js%2015-black)]() [![db](https://img.shields.io/badge/db-pgvector-336791)]() [![llm](https://img.shields.io/badge/llm-Claude%204-orange)]()

---

## 차별화 — Velopers/코드너리와 무엇이 다른가

| 축 | Velopers / 코드너리 | tech-decisions V1 |
|---|---|---|
| 본문 분석 | ❌ 제목·태그만 | ✅ 핵심 의사결정 3~5개 추출 (수기 + V2 자동화) |
| 도메인 비교 | ❌ 회사별로 흩어짐 | ✅ "결제 시스템: 토스 vs 카카오페이 vs 쿠팡" 비교표 (5축 × 5개사) |
| 자연어 질의 | ❌ 키워드 검색만 | ⏳ V2 RAG 챗봇 (V1은 SQLite FTS5 키워드 검색) |
| 영상 통합 | ❌ 블로그만 | ⏳ V2: 토스 SLASH·IF kakao·DEVIEW 자막 인덱싱 |

> **한 줄 가치 제안**: Velopers가 도서관 색인이라면, tech-decisions는 동일 주제로 묶어주는 **비교 큐레이터**.

## 데모 (V1)

**5개 V1 도메인** (모두 즉시 동작):

| 도메인 | 5축 × 회사 |
|---|---|
| `/compare/payment-settlement` | 5축 × 5개사 (토스/카카오페이/쿠팡/우아한형제들/뱅크샐러드) |
| `/compare/search` | 5축 × 4개사 (네이버 D2/쿠팡/당근/우아한형제들) |
| `/compare/recommendation` | 5축 × 4개사 |
| `/compare/msa-migration` | 5축 × 4개사 |
| `/compare/realtime-data` | 5축 × 4개사 |

**도구**:
- `/search` — SQLite FTS5 키워드 검색 (한국어 prefix 지원)
- `/admin/cells` — 셀 검수 콘솔 (read-only)
- `/chat` — V2 RAG 챗봇 placeholder

**총**: 25개 비교축 · 68개 셀 · 37편 article · **26개 검증된 셀(≥0.85)** — 모두 실제 한국 블로그 인용

데모 GIF 가이드: [docs/DEMO_GUIDE.md](./docs/DEMO_GUIDE.md)

## 기술 스택

### V1 (현재 — 외부 의존성 0)

```
Frontend:  Next.js 15 (App Router) + TS + Tailwind + Radix UI
Backend:   Next.js API Routes (Node runtime)
DB:        SQLite (better-sqlite3) + FTS5 한국어 검색
ORM:       Drizzle 0.36 (sqlite-core)
데이터:    Claude Code로 직접 큐레이션한 시드 (37개 셀 + 37편 article)
Hosting:   Vercel (web) — 외부 인프라 0
```

### V2 (자동화 트랙 — `crawler/`에 코드 준비됨)

```
Crawler:   Node + cheerio + Mozilla Readability + rss-parser
LLM:       Claude Haiku 4.5 (요약·태깅) / Sonnet 4.6 (의사결정 추출)
RAG:       임베딩 + 벡터 검색 + 출처 강제 인용
Cron:      GitHub Actions (매일 03 KST)
```

## 디렉토리

```
tech-decisions/
├── README.md                    이 파일
├── docs/
│   ├── ARCHITECTURE.md          시스템·기술스택·데이터흐름
│   ├── DOMAIN_MODEL.md          비교축·태그 분류 체계
│   ├── ROADMAP.md               V1 완료 / V2 계획
│   ├── SOURCES.md               크롤 대상 10개 회사
│   ├── SETUP.md                 ★ 로컬 셋업 (30초)
│   ├── DEMO_GUIDE.md            면접 시연 시나리오 6개
│   ├── DEPLOYMENT.md            Vercel · Turso · CF Pages 배포 가이드
│   └── PORTFOLIO.md             ★ 면접 talking points + 의사결정 5개
├── web/                         Next.js 앱
│   └── src/
│       ├── app/
│       │   ├── page.tsx         홈 (도메인 카드 + 최근 글)
│       │   ├── compare/[domain]/  비교표
│       │   ├── chat/            RAG 챗봇
│       │   ├── search/          하이브리드 검색
│       │   └── api/{chat,search}/ 서버 API
│       ├── components/          CompareTable, EvidencePanel
│       └── lib/                 db, search, anthropic, embed, queries
├── crawler/                     크롤러 + LLM 파이프라인
│   └── src/
│       ├── adapters/            rss-readability / medium-rss
│       ├── pipeline/            summarize · tag · decisions · embed · cells
│       ├── lib/                 anthropic · embed · chunk · fetch · extract
│       ├── crawl.ts             크롤 루프
│       └── cli.ts               pnpm crawl/summarize/tag/...
├── db/                          Drizzle 스키마 + 시드
│   ├── src/
│   │   ├── schema.ts            테이블 정의
│   │   ├── seed.ts              회사·소스·도메인·축
│   │   └── seed-cells.ts        결제·정산 비교 셀 20개 수기
│   └── migrations/0000_init.sql  pgvector + tsvector 포함 풀 스키마
├── .github/workflows/
│   ├── crawl.yml                일일 크롤 cron
│   └── web-deploy.yml           PR 빌드 검증
└── package.json                 pnpm workspaces 루트
```

## 빠른 시작 (V1, 30초)

```bash
pnpm install
pnpm db:reset    # SQLite 생성 + 모든 시드 (37 cells + 37 articles)
pnpm dev          # → http://localhost:3000
```

`/compare/payment-settlement` 진입 → 5축 × 5개사 비교표가 보이면 OK.
키워드 검색은 `/search`에서 즉시 동작 (예: "Outbox", "정산", "BM25").

자세한 가이드는 [docs/SETUP.md](./docs/SETUP.md).

## 명령어

```bash
pnpm dev                  # web dev server
pnpm build                # web prod build
pnpm db:reset             # DB 새로 만들기 (전체 시드 포함)
pnpm db:seed-cells        # 비교 셀만 다시 시드
pnpm db:seed-articles     # articles + FTS 재시드
pnpm db:studio            # Drizzle Studio (DB 시각화)
```

## V2 — 자동 LLM 인덱싱 (코드 준비됨, 비활성)

`crawler/` 안에 다음이 이미 구현되어 있습니다:

```bash
pnpm crawl <slug|all> [--limit N]        # RSS → 본문 추출 → DB
pnpm --filter @td/crawler summarize       # Haiku 1줄 요약
pnpm --filter @td/crawler tag             # 도메인·태그 분류
pnpm --filter @td/crawler decisions       # Sonnet 핵심 의사결정 추출
pnpm --filter @td/crawler cells           # 비교 셀 집계
pnpm --filter @td/crawler all             # 위 5개 순차 실행
```

활성화 조건: `ANTHROPIC_API_KEY` 환경변수 + 외부 Postgres 마이그레이션 (V2에서 SQLite → Postgres 이전 또는 SQLite 그대로 유지). 활성화 시 시드 데이터를 자동으로 덮어쓰고 매일 신규 글을 추가합니다.

## 한계 (V2 예정)

- RAG 챗봇 — 임베딩 + 벡터 검색 + 출처 인용 (`web/src/app/chat`은 placeholder)
- 영상 자막 인덱싱 — 토스 SLASH·IF kakao·DEVIEW
- 도메인 추가 — 추천·MSA 전환·실시간 데이터
- 어드민 콘솔 — 셀 검수, 크롤 상태
- 글로벌 확장 — Netflix·Uber·Stripe

## 라이선스

코드: MIT. 인덱싱된 글의 저작권은 각 원저작자에게 있으며, 본 서비스는 출처와 함께 인용·요약을 제공합니다.
