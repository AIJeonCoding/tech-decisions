# 두 개의 URL 분리 배포 — 공개 SEO + 비공개 포트폴리오

같은 GitHub 리포에서 **두 개의 Vercel 프로젝트**를 만들어, 환경변수 하나로 분리합니다.

| 용도 | URL 예시 | INCLUDE_MY_PROJECT | 어디에 노출 |
|---|---|---|---|
| **공개 SEO** | `tech-decisions.app` 또는 `tech-decisions.vercel.app` | `false` | Google · 일반 사용자 · 검색 결과 |
| **비공개 포트폴리오** | `tech-decisions-portfolio.vercel.app` (또는 비밀 도메인) | `true` (기본값) | 면접관에게만 직접 URL 공유 |

---

## 동작 원리

`INCLUDE_MY_PROJECT=false` 환경변수가 설정되면:

- ✅ **DB에는 my-project 시드가 그대로 있음** (코드/시드 통일성 유지)
- ❌ 모든 query가 `companies.slug != 'my-project'` 필터 추가
- ❌ `/companies/my-project` 페이지는 404
- ❌ `/articles/[id]` 중 my-project article은 404
- ❌ `/compare/[domain]` 비교표에서 my-project 컬럼 제거
- ❌ 검색 결과·메인 최근 글에서 my-project article 제거
- ❌ sitemap에서 my-project URL 제거
- ❌ 메인 페이지 ★ 강조 카드 + 5축 미리보기 숨김
- ❌ /about 페이지 hero·5축 매핑·시연 흐름 → 일반 큐레이터 소개로 변경
- ❌ 비교 페이지 강조 배너 숨김

**결과**: 같은 코드베이스, 같은 시드 데이터로 두 가지 사이트 운영.

---

## 단계별 배포

### 1. 공개 SEO 사이트 (Google 검색 노출)

1. https://vercel.com/new → Import `tech-decisions`
2. **Project name**: `tech-decisions-public`
3. **Environment Variables**:
   ```
   INCLUDE_MY_PROJECT = false
   NEXT_PUBLIC_SITE_URL = https://tech-decisions-public.vercel.app
   ```
4. Deploy → 공유 가능한 일반 큐레이터 사이트
5. **Google Search Console**에 등록 → sitemap 제출
6. (선택) 도메인 연결 — `tech-decisions.app` 같은 곳

이 URL이 Google에 인덱싱됩니다. 일반 개발자가 검색해서 들어옴.

### 2. 비공개 포트폴리오 사이트 (면접관용)

1. 같은 리포로 **새 Vercel 프로젝트** 추가
2. **Project name**: `tech-decisions-portfolio`
3. **Environment Variables**:
   ```
   INCLUDE_MY_PROJECT = true   (또는 미설정 — 기본값이 true)
   NEXT_PUBLIC_SITE_URL = https://tech-decisions-portfolio.vercel.app
   ```
4. Deploy → my-project가 모든 페이지에 노출되는 포트폴리오 사이트
5. **검색엔진 차단** (선택):
   - Settings → Deployment Protection → Vercel Authentication 켜기 (팀 멤버만)
   - 또는 Password Protection
   - 또는 그냥 URL을 면접관에게만 공유 (실질적으로는 robots.txt가 일반 사용자를 막음)

이 URL은 직접 받은 사람만 접근. Google 검색에는 안 잡힘.

### 3. 검색엔진 차단 강화 (포트폴리오 URL)

포트폴리오 사이트가 우연히 인덱싱되지 않도록:

`web/src/app/robots.ts`에 분기 추가 (이미 코드에 반영됨):
```ts
if (!INCLUDE_MY_PROJECT) {
  // 공개 사이트 — 일반 indexing
  rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] }]
} else {
  // 포트폴리오 사이트 — Google indexing 차단
  rules: [{ userAgent: '*', disallow: '/' }]
}
```

(다음 커밋에서 자동 반영)

---

## 검증 체크리스트

### 공개 사이트 (`INCLUDE_MY_PROJECT=false`)
- [ ] `/` — ★ 강조 카드 + 5축 미리보기 안 보임
- [ ] `/compare/payment-settlement` — 첫 컬럼이 토스 (my-project 없음)
- [ ] `/companies/my-project` — 404
- [ ] `/sitemap.xml` — my-project URL 0개
- [ ] `/about` — 일반 큐레이터 소개 (5축 매핑 없음)

### 포트폴리오 사이트 (`INCLUDE_MY_PROJECT=true`)
- [ ] `/` — ★ 강조 카드 + 5축 미리보기 노출
- [ ] `/compare/payment-settlement` — 첫 컬럼이 ★ 내 프로젝트
- [ ] `/companies/my-project` — 200, 회사 프로필 + 7셀 노출
- [ ] `/sitemap.xml` — my-project article·company URL 포함
- [ ] `/about` — 5축 매핑 + 시연 흐름 노출

---

## 면접 답변 메시지 (포트폴리오 URL)

```
정산 시스템 포트폴리오 + 한국 빅테크 비교 큐레이터를 만들었습니다.
[비공개 URL — 면접용]

이 URL은 비공개라 Google에 안 잡힙니다.
공개 URL([공개 URL])에는 빅테크 비교만 노출되고 제 프로젝트는 빠져 있어요.
```

이 분리 덕분에:
- 공개 URL은 진짜 일반 큐레이터처럼 동작 → SEO/유입 효과
- 포트폴리오 URL은 면접관에게만 → my-project 강조 + talking point 풍부
