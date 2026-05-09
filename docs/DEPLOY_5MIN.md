# Vercel 5분 배포 (포트폴리오용)

> 이 가이드는 **5분 안에 GitHub + Vercel에 올려서 면접관에게 보낼 수 있는 URL**을 만드는 게 목적입니다.

## 0단계: GitHub 리포 만들기 (1분)

```bash
# 1. https://github.com/new 에서 새 리포 만들기
#    이름: tech-decisions (private 또는 public)
#    Initialize 옵션 모두 OFF (이미 로컬에 git 있음)

# 2. 로컬 → GitHub 푸시
cd /Users/ijeon-yeong/tech-decisions
git remote add origin https://github.com/<your-username>/tech-decisions.git
git branch -M main
git push -u origin main
```

✅ 확인: GitHub에서 코드 보임

---

## 1단계: Vercel 프로젝트 생성 (2분)

1. https://vercel.com/new 접속
2. **Add New → Project**
3. **Import Git Repository** → `tech-decisions` 선택 → Import
4. 설정 화면:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `./` (모노레포라서 루트 그대로)
   - **Build & Development Settings**: 그대로 두기 (vercel.json이 처리)
   - **Environment Variables**:
     ```
     NEXT_PUBLIC_SITE_URL = https://[프로젝트명].vercel.app
     ```
     (배포 후 실제 URL을 받으면 다시 업데이트)
5. **Deploy** 클릭

✅ 확인: 빌드 로그 따라가다가 "Ready" 나오면 성공 (~3분)

---

## 2단계: 배포 검증 (1분)

배포 직후 Visit 버튼 클릭해서 다음 페이지가 모두 200 응답인지 확인:

| URL | 확인할 것 |
|---|---|
| `/` | 통계 박스 + 강조 카드 + 5개 도메인 |
| `/compare/payment-settlement` | 비교표 (sticky 비교축) |
| `/articles/19` | 우아한 카프카 글 + JSON-LD |
| `/companies/my-project` | 내 프로젝트 프로필 |
| `/sitemap.xml` | 64+ URL |

---

## 3단계: 도메인 설정 (선택, 30초)

도메인이 있다면:
1. Vercel 프로젝트 → **Settings** → **Domains**
2. `tech-decisions.app` 같은 도메인 추가
3. 도메인 DNS에 CNAME 또는 A 레코드 추가
4. `NEXT_PUBLIC_SITE_URL` 환경변수도 새 도메인으로 업데이트 → Redeploy

---

## 4단계: Google Search Console 등록 (30초)

검색 노출을 빨리 시작하려면:

1. https://search.google.com/search-console
2. **속성 추가** → URL prefix → `https://[your-domain]`
3. 인증: HTML 메타 태그 방식 추천 (head에 한 줄 추가)
4. 인증 후 **Sitemaps** → `sitemap.xml` 제출

✅ 24~72시간 안에 첫 인덱싱 시작

---

## 5단계: 면접 답변 준비 — 면접관에게 보낼 메시지

```
정산 시스템 포트폴리오 + 한국 빅테크 비교 큐레이터를 만들었습니다.
https://tech-decisions.vercel.app

특히 결제·정산 비교 페이지에서 제 프로젝트(★ 내 프로젝트 컬럼)가
토스/카카오페이/쿠팡/우아한형제들과 같은 비교축에 나란히 노출됩니다.
시연 가이드: docs/DEMO_GUIDE.md
```

---

## 트러블슈팅

### `better-sqlite3` 빌드 실패
- Vercel은 Node 20을 기본 사용 → 호환됨. 필요시 `package.json`에:
  ```json
  "engines": { "node": "20.x" }
  ```

### sitemap이 404
- DB 시드가 빌드 시 안 돌아간 케이스. `vercel.json`의 `buildCommand`에 `pnpm db:reset` 포함되어야 함 (이미 포함되어 있음).

### 비교 페이지가 빈 화면
- 빌드 시 `tech-decisions.db`가 함수 번들에 포함 안 됨. Vercel Functions 빌드 로그에서 `tech-decisions.db` 검색 → 없으면 `next.config.mjs`에 `outputFileTracingIncludes` 추가:
  ```js
  outputFileTracingIncludes: { '**/*': ['../tech-decisions.db'] }
  ```

### 환경변수가 비교 페이지에 안 적용됨
- `NEXT_PUBLIC_*`이 클라이언트로 빌드 시점에 박힘. 환경변수 변경 후 반드시 **Redeploy** (Cmd+Shift+R로는 안 됨)

---

## V2 (자동 인덱싱) 활성화 시점

지금 V1은 SQLite + 정적 시드. 사용자 트래픽이 쌓이고 V2 자동 인덱싱이 필요해지면:
1. `ANTHROPIC_API_KEY` 환경변수 추가
2. Postgres 또는 Turso 마이그레이션 (DEPLOYMENT.md 참조)
3. `crawler/` GitHub Actions cron 활성화
