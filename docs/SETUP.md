# 로컬 셋업 가이드

V1은 SQLite 임베디드 DB + 정적 시드 데이터로 동작합니다. 외부 인프라(Postgres·Voyage·Anthropic API)가 **없어도** 비교 페이지·검색이 즉시 동작합니다.

## 0. 사전 요구사항

- Node.js 20+
- pnpm 9+ (없으면 `corepack enable && corepack prepare pnpm@9 --activate`)

## 1. 의존성 설치

```bash
cd /Users/ijeon-yeong/tech-decisions
pnpm install
```

## 2. DB 초기화 + 시드

```bash
pnpm db:reset
```

이 한 줄로:
1. `tech-decisions.db` 생성 (프로젝트 루트)
2. 스키마 + FTS5 가상 테이블 + 트리거 생성
3. 회사 10개 + 소스 10개 + 도메인 5개 + 비교축 10개(결제·정산 5 + 검색 5) 시드
4. 비교 셀 37개 시드 (4개사 × 5축 + 검색 도메인)
5. 기사 37편 시드 (각 셀의 evidence가 articles 테이블로도 적재됨)
6. 셀의 `evidence.articleId`를 실제 articles.id 와 연결

## 3. 개발 서버

```bash
pnpm dev
```

`http://localhost:3000` 접속:
- `/` — 도메인 카드 + 최근 글
- `/compare/payment-settlement` — 결제·정산 5축 × 5개사 비교
- `/compare/search` — 검색 시스템 5축 × 4개사 비교
- `/search` — 키워드 검색 (FTS5 + Korean prefix)
- `/chat` — V2 placeholder (RAG는 V2)

## 4. (선택) DB 직접 탐색

```bash
sqlite3 tech-decisions.db
.tables
SELECT slug, name FROM companies;
SELECT cell_summary FROM cells LIMIT 5;
SELECT title FROM articles_fts WHERE articles_fts MATCH 'Outbox' LIMIT 5;
```

## 5. (선택) Vercel 배포

`crawler/` 워크스페이스는 V2 자동화용이라 web 배포에는 불필요합니다.
DB 파일은 빌드시 동봉되도록 설정합니다.

```bash
pnpm --filter @td/web build  # 로컬 빌드 검증
```

Vercel 대시보드:
1. Import Git Repository → 루트 선택
2. Build command: `pnpm install --frozen-lockfile && pnpm db:reset && pnpm --filter @td/web build`
3. Output directory: `web/.next`
4. Environment Variables: 없음 (V1은 외부 의존성 0)

> SQLite 파일을 Vercel의 read-only 파일시스템에서 쓰려면, 빌드 시 한 번만 시드하고 런타임은 read-only 모드로 동작합니다. 추가 시드는 GitHub Actions로 정기 갱신해도 좋습니다.

## 6. (선택) V2 자동화 (Anthropic + 외부 DB)

`crawler/` 워크스페이스의 LLM 파이프라인은 V2에서 활성화 예정입니다:

```bash
# .env 추가
ANTHROPIC_API_KEY=sk-ant-...
LLM_DAILY_BUDGET_USD=2

# 명령
pnpm crawl all --limit 30          # 실제 RSS → 본문 추출
pnpm --filter @td/crawler summarize --limit 50
pnpm --filter @td/crawler tag --limit 50
pnpm --filter @td/crawler decisions --limit 30
pnpm --filter @td/crawler cells --domain payment-settlement
```

V2가 동작하면 시드 데이터를 자동으로 덮어쓰고 새 글을 매일 추가합니다.

## 트러블슈팅

**`better-sqlite3` 빌드 실패 (Apple Silicon)**
→ `pnpm rebuild better-sqlite3` 또는 `pnpm install --force`.

**DB 파일을 다른 워크스페이스에서 못 찾음**
→ `db/src/index.ts`가 `import.meta.url` 기반으로 monorepo root를 계산.
   환경변수 `SQLITE_PATH=/abs/path/to/file.db`로 강제 가능.

**FTS5 검색 결과 없음 (한국어)**
→ `db:reset` 다시 실행. articles 시드가 비었을 가능성. `sqlite3 tech-decisions.db "SELECT count(*) FROM articles_fts"`로 확인.
