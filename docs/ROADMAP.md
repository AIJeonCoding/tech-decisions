# 로드맵 (V1 완료 → V2 계획)

> 초기 6주 풀스펙 계획에서 **V1은 외부 의존성 0의 SQLite 정적 시드** 형태로 좁혔다.
> 자동화/RAG/임베딩 인프라는 V2로 이동.

## ✅ V1 (완료)

- SQLite + FTS5 한국어 검색 (외부 의존성 0)
- **4개 V1 도메인**:
  - 결제·정산 5축 × 5개사 = 21셀
  - 검색 5축 × 4개사 = 16셀
  - 추천 5축 × 4개사 = 12셀
  - MSA 전환 5축 × 4개사 = 10셀
- 기사 37편 시드 + FTS5 인덱싱
- 비교 셀 59개 중 **20개가 실제 한국 블로그 인용으로 검증됨** (≥0.85)
- `/compare/[domain]` 비교페이지 + 셀 클릭 사이드 패널
- `/search` BM25 + 한국어 prefix wildcard
- `/admin/cells` 셀 검수 콘솔
- `/chat` V2 placeholder
- SEO (sitemap, robots, OG image)
- Next.js 빌드 통과 + 모든 워크스페이스 typecheck OK
- **vitest 단위 테스트 13개** (web 8 + crawler 5)

## V2 (계획)

---

## Week 1 — 데이터 기반 + 첫 크롤러
**산출물**: 토스/카카오페이 블로그 글이 DB에 본문까지 들어간다.

- [ ] 모노레포 셋업 (`pnpm` workspaces, `web/` `crawler/` `db/`)
- [ ] Postgres + pgvector 인스턴스 (Supabase free tier)
- [ ] Drizzle 스키마 v0 — `sources`, `articles`, `chunks`, `tags`, `companies`
- [ ] `crawler/sources/toss.ts` — RSS → 본문 추출 (cheerio + readability)
- [ ] `crawler/sources/kakaopay.ts`
- [ ] CLI: `pnpm crawl <source>` (idempotent — 이미 본 URL 스킵)

**완료 기준**: 두 회사 합쳐 100+ 글 본문이 `articles.body_md`에 markdown으로 저장됨.

---

## Week 2 — LLM 파이프라인 (요약 · 태깅 · 의사결정 추출)
**산출물**: 글마다 1줄 요약 + 도메인 태그 + 핵심 의사결정 3개가 자동 채워진다.

- [ ] `crawler/pipeline/summarize.ts` — Claude Haiku 4.5로 1줄 요약
- [ ] `crawler/pipeline/tag.ts` — 도메인 분류 (`payment`, `settlement`, `search`, `recommendation`, `msa`, `infra`, `frontend` 등) — Haiku 단일 호출
- [ ] `crawler/pipeline/decisions.ts` — 핵심 의사결정 3개 추출 (Sonnet 4.6, JSON schema 강제)
  - 형식: `{ axis: "동시성 제어", choice: "분산락(Redis)", rationale: "..." }`
- [ ] 비용 캡 — 글당 $0.01 미만, 재실행 방지 (해시 기반 캐시)
- [ ] 프롬프트 캐싱 — 시스템 프롬프트 + few-shot 예시 캐시

**완료 기준**: 100글 처리 비용 $1 이하, 결과 컬럼 채움률 95%+.

---

## Week 3 — 임베딩 + RAG 챗봇 백엔드
**산출물**: pgvector 검색이 동작하고, Claude API가 출처와 함께 답한다.

- [ ] 청킹 전략 — 헤딩 기준 + 500토큰 슬라이딩
- [ ] 임베딩 — Voyage AI `voyage-3` 또는 OpenAI `text-embedding-3-small`
- [ ] `chunks.embedding vector(1024)` + IVFFlat 인덱스
- [ ] `web/app/api/chat/route.ts` — 하이브리드 검색(BM25 + vector) → Claude Sonnet 4.6 답변
- [ ] 인용 강제 — 답변에 `[1][2]` 형식 + 하단 출처 카드
- [ ] Anthropic SDK + 프롬프트 캐싱 (검색된 청크 묶음 캐시)

**완료 기준**: "토스는 정산 동시성을 어떻게 처리해?" 질문에 토스 출처 글 2~3개 인용한 답변 5초 이내.

---

## Week 4 — 결제·정산 비교 페이지 (메인 데모)
**산출물**: 면접에서 보여줄 페이지. 같은 축으로 회사 4~5곳을 나란히.

- [ ] `web/app/compare/payment-settlement/page.tsx`
- [ ] 비교축 정의 (DOMAIN_MODEL.md 참조):
  - 동시성 제어 (분산락 / 낙관적락 / 멱등키)
  - 정산 시점 (실시간 / 일배치 / 하이브리드)
  - 대사·정합성 (이중기장 / 이벤트소싱)
  - 수수료/정산 분배 (PG 모델 / 마켓플레이스 모델)
  - 장애 대응 (재처리 / DLQ / 보상 트랜잭션)
- [ ] 각 셀 → 출처 글 링크 + 1줄 인용
- [ ] 셀 클릭 → 사이드 패널에 LLM 요약 + 원문 링크
- [ ] LLM 자동 채움 + 사람이 검수 가능한 어드민(간이)

**완료 기준**: 토스/카카오페이/쿠팡/배민 4개사 5축 = 20셀 모두 채워짐, 80% 이상 출처 인용 정확.

---

## Week 5 — 검색 UX + 챗봇 UI + SEO
**산출물**: 채팅창과 검색창이 각자 가치 있는 도구로 동작한다.

- [ ] `web/app/page.tsx` — 메인: 도메인 카드 (`결제·정산`, `MSA`, `검색`...) + 검색바
- [ ] `web/app/search/page.tsx` — 키워드 + 도메인 필터 + 회사 필터
- [ ] `web/app/chat/page.tsx` — 스트리밍 + 출처 카드 사이드바
- [ ] OpenGraph 이미지(비교표 미리보기), `sitemap.xml`, `robots.txt`
- [ ] 도메인 페이지마다 SEO 메타 (`결제 시스템 아키텍처 비교 - 토스, 카카오페이...`)

**완료 기준**: Lighthouse 90+, 모바일 동작.

---

## Week 6 — 배포 + 자동화 + 포트폴리오 마감
**산출물**: 면접관에게 보낼 수 있는 URL + GitHub README.

- [ ] Vercel 배포 (`tech-decisions.app` 또는 `*.vercel.app`)
- [ ] Supabase/Neon 프로덕션 DB
- [ ] GitHub Actions 일일 크롤 cron — 새 글 발견 → LLM 파이프라인 자동 실행
- [ ] 어드민 대시보드 — 크롤 상태, 비용, 실패 글 재시도
- [ ] README 보강 — 아키텍처 다이어그램, 데모 GIF 3개 (비교페이지 / 검색 / 챗봇)
- [ ] `docs/PORTFOLIO.md` — 면접용 talking point 정리
  - 의사결정 1: 왜 RAG를 비교표와 분리했나
  - 의사결정 2: 청킹 전략과 임베딩 모델 선택 근거
  - 의사결정 3: 프롬프트 캐싱으로 비용 80% 절감

**완료 기준**: 모르는 사람이 URL만 받고 30초 안에 가치 이해 + 5분 안에 결제도메인 비교페이지로 인사이트 1개 얻음.

---

## V2 후보 (6주 이후)
- 영상 자막 인덱싱 (토스 SLASH, IF kakao, DEVIEW, FEConf, AWSKRUG)
- 도메인 추가: 검색·추천·실시간 데이터 파이프라인·MSA 전환
- GitHub Awesome 리스트 자동 동기화
- 글로벌 확장 (Netflix, Uber, Stripe 엔지니어링 블로그)
- 뉴스레터 — 주간 "이번 주 업데이트된 비교표"
