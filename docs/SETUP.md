# 로컬 셋업 가이드

처음부터 비교 페이지가 떠오르기까지의 5단계.

## 1. 의존성 설치

```bash
cd /Users/ijeon-yeong/tech-decisions
pnpm install
```

> Node 20+, pnpm 9+ 필요. nvm/volta 설치 권장.

## 2. Postgres + pgvector 준비

### 옵션 A: Supabase (권장, 무료)
1. https://supabase.com/dashboard → New project
2. Database → Connection string → URI 복사
3. SQL Editor에서:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

### 옵션 B: Docker로 로컬
```bash
docker run -d --name td-pg \
  -e POSTGRES_PASSWORD=local \
  -e POSTGRES_DB=tech_decisions \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```
DATABASE_URL: `postgresql://postgres:local@localhost:5432/tech_decisions`

## 3. 환경 변수

```bash
cp .env.example .env
```

채워야 할 값:
- `ANTHROPIC_API_KEY`: https://console.anthropic.com/ → API keys
- `VOYAGE_API_KEY`: https://www.voyageai.com/ → API keys (free $100 크레딧)
- `DATABASE_URL`: 위 2번에서 받은 연결 문자열
- `LLM_DAILY_BUDGET_USD`: `2` 권장 (실수로 비용 폭주 방지)

`.env`를 `db/`, `crawler/`, `web/`에 모두 심볼릭 링크하거나 복사:
```bash
ln -sf $PWD/.env db/.env
ln -sf $PWD/.env crawler/.env
ln -sf $PWD/.env web/.env.local
```

## 4. DB 마이그레이션 + 시드

```bash
# 스키마 적용
psql "$DATABASE_URL" -f db/migrations/0000_init.sql

# 회사·소스·도메인·축 시드
pnpm --filter @td/db seed

# 비교 셀 수기 시드 (LLM 없이도 데모 가능)
pnpm --filter @td/db seed:cells
```

확인:
```bash
psql "$DATABASE_URL" -c "SELECT slug, name FROM companies"
```

## 5. 웹 실행

```bash
pnpm dev
# → http://localhost:3000
```

`/compare/payment-settlement` 진입 → 4개사 5축 비교표가 보이면 성공.

## 6. (선택) 실제 크롤링 시작

```bash
# 토스만 50개
pnpm --filter @td/crawler crawl toss --limit 50

# 모든 소스 30개씩 + LLM 파이프라인 풀로
pnpm --filter @td/crawler all --limit 30
```

비용 모니터:
```sql
SELECT day, sum(cost_usd)::numeric(10,4) FROM llm_costs GROUP BY day ORDER BY day DESC LIMIT 7;
```

## 7. (선택) Vercel 배포

```bash
pnpm --filter @td/web build  # 로컬 빌드 검증
```

Vercel 대시보드:
1. Import Git Repository
2. Root: `web/`
3. Build command: `cd .. && pnpm install --frozen-lockfile && pnpm --filter @td/web build`
4. Environment Variables: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`

## 8. (선택) GitHub Actions cron 활성화

`Settings → Secrets and variables → Actions`:
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`

`Variables → New repository variable`:
- `LLM_DAILY_BUDGET_USD = 3`

확인:
```bash
gh workflow run crawl.yml -f target=toss -f limit=10
```

## 트러블슈팅

**`pgvector` extension not found**
→ Supabase Dashboard → Database → Extensions에서 vector 토글 ON.

**Voyage 401 Unauthorized**
→ API key가 `pa-`로 시작하는지 확인. trial 계정도 충분.

**`@td/db` not resolved**
→ `pnpm install`을 root에서 다시 실행. workspace 링크 갱신.

**Type error on Drizzle**
→ Drizzle 버전 0.36+ 필수. `pnpm --filter @td/db update drizzle-orm`.
