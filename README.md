# tech-decisions

> 한국 빅테크의 엔지니어링 의사결정을 비교·검색·질의하는 큐레이터.
> 위에 **내 정산 MSA 포트폴리오**(★ `settlement-msa`)도 같은 비교축에 같이 노출.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Ftech-decisions&project-name=tech-decisions&repository-name=tech-decisions)

**5분 만에 면접용 URL 만들기** → [docs/DEPLOY_5MIN.md](./docs/DEPLOY_5MIN.md)

---

## V1 통계

| 항목 | 값 |
|---|---|
| V1 도메인 | **5개** (결제·정산 / 검색 / 추천 / MSA 전환 / 실시간 데이터) |
| 인덱싱된 회사 | **11개** (네카라쿠배당토 + 뱅크샐러드 + my-project) |
| 분석된 article | **48편** |
| 비교 셀 | **86개** |
| 검증된 셀 (≥85% 신뢰도) | **41개** (실제 한국 블로그 인용) |
| 비교축 | **25개** (도메인당 5축) |
| sitemap URL | **67개** (Google 검색 진입점) |
| 동적 OG 이미지 | **62개** (자동 생성) |
| 단위 테스트 | **19개** (web 14 + crawler 5) |

## 차별화 — Velopers/코드너리와 무엇이 다른가

| 축 | 기존 큐레이션 | tech-decisions V1 |
|---|---|---|
| 본문 분석 | ❌ 제목·태그만 | ✅ 핵심 의사결정 추출 (수기 + V2 자동화) |
| 도메인 비교 | ❌ 회사별 분산 | ✅ "결제 시스템: 토스 vs 카카오 vs 쿠팡" 비교표 |
| 자체 포트폴리오 | ❌ | ✅ **★ my-project가 빅테크와 같은 비교축에 노출** |
| 자연어 질의 | ❌ 키워드만 | ⏳ V2 RAG 챗봇 (V1은 8개 Q&A로 대체) |
| 영상 통합 | ❌ 블로그만 | ⏳ V2: SLASH·IF kakao·DEVIEW |

## 페이지 (12개 라우트)

```
/                          홈 — 통계 박스 + ★ my-project 5축 미리보기 + 도메인 카드
/about                     소개 — 면접관 첫 진입점 (5축 매핑 + 시연 흐름)
/articles/[id]             글 상세 — JSON-LD Article + 의사결정 추출 카드 (45개)
/companies/[slug]          회사 프로필 — 비교 셀 + 인덱싱된 글 (11개)
/compare/[domain]          비교표 — 5축 × 회사 (5개 도메인)
/search                    검색 — SQLite FTS5 한국어 prefix + 도메인 그룹핑
/chat                      자주 묻는 질문 8개 (V2 RAG 자리)
/admin/cells               셀 검수 콘솔 — 도메인별 평균 신뢰도 막대그래프
+ /sitemap.xml /robots.txt /opengraph-image  + 동적 OG (3개 라우트)
```

## 차별점 — settlement-msa × 빅테크 5축

`/compare/payment-settlement` 한 페이지가 모든 talking point의 시각적 증거.

| 축 | 내 프로젝트 | 토스 | 카카오페이 | 우아한 | talking point |
|---|---|---|---|---|---|
| 동시성 | @Version + 멱등키 4중 | Redis Global Lock + JPA @Lock | putIfAbsent | Outbox | 분산락 없이 코드 정합성 |
| 정산 시점 | PROVISIONAL→FINAL→REVISED | 거래 단위 병렬 배치 | Kafka 지연이체 | T+1 일배치 | 발생주의 시스템 내장 |
| **대사·정합성** | **이중기장 + 시산표 + 대차대조 자동 가드** ⭐ | StarRocks+CDC | 이벤트 스토어 | 이중기장 + PG 전문 | **빅테크에 없는 차별점** |
| 수수료 분배 | AR Clearing FIFO + Chargeback + 충당금 + 세금계산서 | split payment | DSL 룰 엔진 | 룰 엔진 + 역분배 | 회계적 안전망 풀스택 |
| **장애 복구** | **Outbox + Admin redrive + Zipkin + 12 alert + RUNBOOK 7 INC** ⭐ | 상태머신 + DLQ | 멱등성 + ActResult | Outbox + Debezium | **SRE-ready 운영 도구** |

## 기술 스택

```
Frontend   Next.js 15 (App Router) + TS + Tailwind + Radix UI
Backend    Next.js Server Components + Route Handlers
DB         SQLite (better-sqlite3) + FTS5 한국어 prefix 검색
ORM        Drizzle 0.36 (sqlite-core)
데이터    Claude Code 직접 큐레이션 (V1) → V2 자동 LLM 인덱싱 준비됨
SEO        JSON-LD (Article/Organization/BreadcrumbList) + 동적 OG + sitemap
배포        Vercel + 빌드 시점 SQLite 동봉 (외부 DB 0)
```

## 디렉토리

```
tech-decisions/
├── README.md                   이 파일
├── docs/
│   ├── ARCHITECTURE.md         시스템·기술스택·데이터흐름
│   ├── DOMAIN_MODEL.md         비교축·태그 분류 체계
│   ├── ROADMAP.md              V1 완료 / V2 계획
│   ├── SETUP.md                ★ 로컬 셋업 (30초)
│   ├── DEPLOY_5MIN.md          ★ 5분 만에 면접용 URL 만들기
│   ├── DEPLOYMENT.md           Vercel · Turso · CF Pages 가이드
│   ├── DEMO_GUIDE.md           면접 시연 시나리오 (5분 흐름표 포함)
│   ├── PORTFOLIO.md            ★ 면접 talking points + 의사결정 5개
│   └── SOURCES.md              크롤 대상 회사 리스트
├── web/                        Next.js 앱
│   └── src/{app,components,lib}
├── crawler/                    V2 자동 LLM 인덱싱 코드 (비활성)
│   └── src/{adapters,pipeline,lib}
├── db/                         Drizzle 스키마 + 시드
│   └── src/{schema,init,seed,seed-cells,seed-articles}
├── .github/workflows/
│   ├── crawl.yml               V2 일일 cron (수동 dispatch만)
│   └── web-deploy.yml          PR/push 빌드 검증
└── vercel.json                 빌드시 db:reset + 보안 헤더
```

## 빠른 시작 (V1, 30초)

```bash
pnpm install
pnpm db:reset    # SQLite 생성 + 모든 시드 (86 cells + 48 articles)
pnpm dev          # → http://localhost:3000
```

[/compare/payment-settlement](http://localhost:3000/compare/payment-settlement) 진입 → 첫 컬럼이 **★ 내 프로젝트**.

자세한 가이드는 [docs/SETUP.md](./docs/SETUP.md).

## 명령어

```bash
pnpm dev                  # web dev server
pnpm build                # web prod build
pnpm db:reset             # DB 새로 만들기 (전체 시드)
pnpm test                 # 단위 테스트 (19개)
pnpm db:studio            # Drizzle Studio (DB 시각화)
```

## V2 — 자동 LLM 인덱싱 (코드 준비됨, 비활성)

`crawler/` 안에 다음이 이미 구현되어 있습니다:

```bash
pnpm crawl <slug|all>                     # RSS → 본문 → DB
pnpm --filter @td/crawler summarize       # Haiku 1줄 요약
pnpm --filter @td/crawler tag             # 도메인·태그 분류
pnpm --filter @td/crawler decisions       # Sonnet 의사결정 추출
pnpm --filter @td/crawler all             # 위 4개 순차
```

활성화 조건: `ANTHROPIC_API_KEY` + 외부 Postgres 마이그레이션 (선택). V1 시드 위에 LLM 자동 추출본을 덮어쓰는 구조.

## 한계 (V2 예정)

- RAG 챗봇 — 임베딩 + 벡터 검색 (`web/src/app/chat`은 V1.5 Q&A로 임시)
- 영상 자막 인덱싱 — 토스 SLASH·IF kakao·DEVIEW
- 어드민 셀 검수 워크플로우
- 글로벌 빅테크 (Netflix·Uber·Stripe)

## 라이선스

MIT. 인덱싱된 글의 저작권은 원저작자에게 있으며, 본 서비스는 출처와 함께 인용·요약을 제공합니다.

## 문서

- [docs/SETUP.md](./docs/SETUP.md) — 30초 로컬 셋업
- [docs/DEPLOY_5MIN.md](./docs/DEPLOY_5MIN.md) — 5분 Vercel 배포
- [docs/PORTFOLIO.md](./docs/PORTFOLIO.md) — 면접 talking points
- [docs/DEMO_GUIDE.md](./docs/DEMO_GUIDE.md) — 시연 시나리오
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 시스템 설계
- [docs/DOMAIN_MODEL.md](./docs/DOMAIN_MODEL.md) — 비교축
- [docs/ROADMAP.md](./docs/ROADMAP.md) — V1/V2 일정
