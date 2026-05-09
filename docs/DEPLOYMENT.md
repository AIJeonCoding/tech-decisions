# 배포 가이드

V1은 SQLite 기반이라 일반 Next.js 앱과 다른 고려사항이 몇 가지 있습니다.

## 추천 경로 — Vercel + 빌드 시점 SQLite 동봉

V1의 데이터는 정적이라 빌드 시점에 SQLite를 만들어 함수 번들에 포함시키면 런타임 read-only로 동작합니다.

### 1단계: GitHub 리포 푸시

```bash
cd /Users/ijeon-yeong/tech-decisions
git remote add origin https://github.com/<your-id>/tech-decisions.git
git push -u origin main
```

### 2단계: Vercel 프로젝트 생성

1. https://vercel.com/new → Import Git Repository
2. **Root Directory**를 `web/`로 지정 (모노레포)
3. **Framework Preset**: Next.js (자동 감지)
4. **Build Command**: 빌드 전 db:reset이 돌도록 override
   ```
   cd .. && pnpm install --frozen-lockfile && pnpm db:reset && pnpm --filter @td/web build
   ```
5. **Output Directory**: `.next` (기본값)
6. **Install Command**: `echo 'skip'` (위 build에서 처리)

### 3단계: Environment Variables (선택)

V1은 외부 키 없이 동작하지만, NEXT_PUBLIC_SITE_URL은 sitemap·OG 이미지에 쓰입니다:

```
NEXT_PUBLIC_SITE_URL=https://tech-decisions.vercel.app
```

### 4단계: better-sqlite3 + Vercel 호환

better-sqlite3는 native module이라 Vercel의 Node 18 환경에서 빌드되어야 합니다.
`web/next.config.mjs`에 이미 transpilePackages가 들어가 있고 추가 설정 불필요.

빌드 실패하면 `package.json`의 dependencies에서 `better-sqlite3` 버전을 11.x로 고정:
```json
"better-sqlite3": "11.5.0"
```

### 5단계: SQLite 파일 위치

`db/src/index.ts`가 `import.meta.url` 기반으로 monorepo root를 찾습니다. Vercel 빌드시:
- 빌드 단계에서 `pnpm db:reset`이 `<repo-root>/tech-decisions.db` 생성
- Next.js가 `.next/server` 안에 db 파일 동봉
- 런타임에 read-only로 열림

⚠️ Vercel의 `/tmp` 외 파일시스템은 read-only. 위 빌드 명령은 빌드 시점에만 db를 채우고, 런타임에 추가 쓰기를 시도하면 안 됩니다. 현재 코드는 select만 하므로 문제 없음.

## 대안 1 — Turso (SQLite 클라우드)

런타임에 쓰기가 필요해지면 Turso로 전환:

```bash
# 1. Turso CLI 설치
brew install tursodatabase/tap/turso

# 2. DB 생성 + 데이터 임포트
turso db create tech-decisions
turso db shell tech-decisions < db/dump.sql

# 3. 환경변수
TURSO_DATABASE_URL=libsql://tech-decisions-<id>.turso.io
TURSO_AUTH_TOKEN=...
```

`db/src/index.ts`만 `@libsql/client`로 교체. 코드 95% 그대로.

## 대안 2 — Cloudflare Pages + D1

Cloudflare D1도 SQLite. Vercel과 같은 방식이지만 edge runtime이라 더 빠름:
- `wrangler.toml`에 D1 binding
- `web/src/lib/db.ts`를 D1 client로 교체
- `next-on-pages` 플러그인으로 빌드

V2 자동 인덱싱이 들어오면 D1 + Cloudflare Workers가 정합성·비용 모두 유리합니다.

## 대안 3 — 정적 export

DB를 빌드시 JSON으로 변환하면 모든 페이지를 static하게 export 가능:

```ts
// scripts/extract-static-data.ts
import { db, cells, axes } from '@td/db';
const data = { cells: await db.select().from(cells), axes: await db.select().from(axes) };
fs.writeFileSync('web/src/data/static.json', JSON.stringify(data));
```

이후 `next build`가 모든 페이지를 prerender. 검색은 Fuse.js 같은 클라이언트 검색으로 변환. 트래픽은 무제한 무료지만 검색 품질 ↓.

## 권장 결정 매트릭스

| 상황 | 추천 |
|---|---|
| 면접용 데모 URL이 필요하고 V2는 나중 | **Vercel + SQLite 동봉** |
| V2 자동 인덱싱이 곧 들어옴 | **Cloudflare Pages + D1** |
| 운영 안정성·동시 트래픽 보장 필요 | **Turso + Vercel** |
| 정적이면 충분하고 비용 0이면 좋음 | **정적 export + Vercel/CF Pages** |

V1 면접용이면 1번이 가장 간단. 약 5분 안에 배포 가능.

## 빌드 검증 (배포 전)

배포 전에 로컬에서 production build가 통과하는지 확인:

```bash
cd /Users/ijeon-yeong/tech-decisions
pnpm db:reset
pnpm --filter @td/web build
pnpm --filter @td/web start  # http://localhost:3000
```

위 절차가 통과하면 Vercel에서도 동일하게 동작합니다.
