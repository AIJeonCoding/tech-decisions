# tech-decisions

> 한국 빅테크의 엔지니어링 의사결정을 비교·검색·질의하는 서비스.
> "다른 회사는 이 문제를 어떻게 풀었지?"에 30초 안에 답한다.

[![status](https://img.shields.io/badge/status-MVP-blue)]() [![stack](https://img.shields.io/badge/stack-Next.js%2015-black)]() [![db](https://img.shields.io/badge/db-pgvector-336791)]() [![llm](https://img.shields.io/badge/llm-Claude%204-orange)]()

---

## 차별화 — Velopers/코드너리와 무엇이 다른가

| 축 | Velopers / 코드너리 | tech-decisions |
|---|---|---|
| 본문 분석 | ❌ 제목·태그만 | ✅ LLM 1줄 요약 + 핵심 의사결정 3개 추출 |
| 도메인 비교 | ❌ 회사별로 흩어짐 | ✅ "결제 시스템: 토스 vs 카카오페이 vs 쿠팡" 비교표 |
| 자연어 질의 | ❌ 키워드 검색만 | ✅ RAG 챗봇 + 출처 강제 인용 |
| 영상 통합 | ❌ 블로그만 | ⏳ V2: 토스 SLASH·IF kakao·DEVIEW 자막 인덱싱 |

> **한 줄 가치 제안**: Velopers가 도서관 색인이라면, tech-decisions는 동일 주제로 묶어주는 **비교 큐레이터**.

## 데모

3개 핵심 화면:

- `/compare/payment-settlement` — 결제·정산 비교표 (5축 × 4사 = 20셀)
- `/chat` — RAG 챗봇 ("토스는 정산 동시성을 어떻게 처리해?")
- `/search` — 하이브리드 검색 (BM25 + vector RRF 머지)

데모 GIF 가이드: [docs/DEMO_GUIDE.md](./docs/DEMO_GUIDE.md)

## 기술 스택

```
Frontend:  Next.js 15 (App Router) + TS + Tailwind + Radix UI
Backend:   Next.js API Routes (edge + nodejs)
DB:        Postgres 16 + pgvector + tsvector
ORM:       Drizzle 0.36
Crawler:   Node + cheerio + Mozilla Readability + rss-parser
LLM:       Claude Haiku 4.5 (요약·태깅) / Sonnet 4.6 (의사결정·답변)
Embedding: Voyage AI voyage-3 (1024d)
Hosting:   Vercel (web) + Supabase (db)
Cron:      GitHub Actions (매일 03 KST)
```

## 디렉토리

```
tech-decisions/
├── README.md                    이 파일
├── docs/
│   ├── ARCHITECTURE.md          시스템·기술스택·데이터흐름
│   ├── DOMAIN_MODEL.md          비교축·태그 분류 체계
│   ├── ROADMAP.md               6주 일정
│   ├── SOURCES.md               크롤 대상 10개 회사
│   ├── SETUP.md                 ★ 로컬 셋업 5단계
│   ├── DEMO_GUIDE.md            면접 시연 시나리오 4개
│   └── PORTFOLIO.md             ★ 면접 talking points + 의사결정 4개
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

## 빠른 시작

자세한 가이드는 [docs/SETUP.md](./docs/SETUP.md). 5분 요약:

```bash
pnpm install
cp .env.example .env  # ANTHROPIC_API_KEY, VOYAGE_API_KEY, DATABASE_URL 채우기
psql "$DATABASE_URL" -f db/migrations/0000_init.sql
pnpm --filter @td/db seed:all  # 회사+도메인+비교셀 수기 시드
pnpm dev                        # http://localhost:3000
```

`/compare/payment-settlement` 진입 → 비교표가 보이면 OK.

실제 크롤 시작:
```bash
pnpm --filter @td/crawler all --limit 30
```

## CLI 명령어

```bash
pnpm crawl <slug|all> [--limit N]      # RSS → 본문 → DB
pnpm summarize [--limit N]              # Haiku 1줄 요약
pnpm tag [--limit N]                    # 도메인·태그 분류
pnpm decisions [--limit N]              # Sonnet 핵심 의사결정 추출
pnpm embed [--limit N]                  # Voyage 임베딩 + pgvector
pnpm cells [--domain payment-settlement] # 비교 셀 집계
pnpm all [--limit N]                    # 위 6개 순차 실행
```

## 비용 가드

```sql
-- 일별 LLM 비용 확인
SELECT day, model, sum(cost_usd)::numeric(10,4) FROM llm_costs
GROUP BY day, model ORDER BY day DESC;
```

`LLM_DAILY_BUDGET_USD` 환경변수로 일일 한도. 초과 시 파이프라인 자동 차단.

월 운영비 ~$25 예상 (Anthropic $20 + Voyage $2 + Supabase $0 + Vercel $0).

## 한계 (V2 예정)

- 영상 자막 인덱싱 — youtube-transcript-api + Whisper
- 도메인 추가 — 검색·추천·MSA 전환·실시간 데이터
- 어드민 콘솔 — 셀 검수, 크롤 상태, 비용
- 글로벌 확장 — Netflix·Uber·Stripe

## 라이선스

코드: MIT. 인덱싱된 글의 저작권은 각 원저작자에게 있으며, 본 서비스는 출처와 함께 인용·요약을 제공합니다.
