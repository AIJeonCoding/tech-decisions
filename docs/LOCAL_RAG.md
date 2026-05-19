# 로컬 RAG 챗봇 (Ollama + Gemma E2B + sqlite-vec)

`/chat` 페이지를 사용자 노트북에서 도는 **Gemma 3n E2B + nomic-embed-text + sqlite-vec** 하이브리드 RAG 챗봇으로 켜는 가이드. 모든 추론이 로컬에서 일어나므로 API 키가 필요 없다.

대상: M1/M2/M3 Mac, RAM 8GB 이상, 디스크 6GB 여유.

## 1. Ollama 설치 + 모델 다운로드

```bash
brew install ollama
brew services start ollama          # 백그라운드로 서버 기동

ollama pull gemma3n:e2b              # ~1.6GB. 태그 없으면: ollama pull gemma3:2b
ollama pull nomic-embed-text          # ~270MB

curl -s http://localhost:11434/api/tags | python3 -m json.tool
```

`/api/tags`에 두 모델이 보이면 OK.

## 2. sqlite-vec 의존성 + DB 재생성

```bash
pnpm install                          # 새로 추가된 sqlite-vec 설치
pnpm db:reset                         # 시드 + vec0 가상 테이블 생성
```

`vec0 tables created.` 로그가 보이면 정상. `vec0 DDL skipped` 가 뜨면 sqlite-vec 로드 실패 — `pnpm --filter @td/db why sqlite-vec` 로 설치 확인.

## 3. 임베딩 인덱싱 (1회성)

```bash
pnpm embed                            # cells 235 + articles 65 → ~15초
pnpm embed --force                    # 모델 바꿨거나 시드 갱신 후 재인덱싱
```

확인:

```bash
sqlite3 tech-decisions.db \
  "SELECT (SELECT COUNT(*) FROM cell_embeddings) AS cells,
          (SELECT COUNT(*) FROM article_embeddings) AS articles"
```

## 4. 챗봇 활성화 + 서버 기동

`.env.local` (또는 `.env`):

```env
LOCAL_LLM_ENABLED=true
INCLUDE_MY_PROJECT=true               # 포트폴리오 모드
```

```bash
pnpm dev                              # http://localhost:3000/chat
```

`LOCAL_LLM_ENABLED=false`이면 `/chat`은 기존 FAQ 카드 페이지로 폴백 (Vercel 배포 안전).

## 5. 첫 응답 워밍업

```bash
curl http://localhost:11434/api/generate \
  -d '{"model":"gemma3n:e2b","prompt":"안녕","stream":false}' | python3 -m json.tool
```

처음 한 번 모델이 메모리에 올라오는 데 5~10초. 면접/시연 직전에 한 번 호출해두면 첫 채팅이 부드러워진다.

## 메모리 운영 팁 (8GB Mac)

- Activity Monitor에서 `ollama` 프로세스가 ~2.2GB, `node` (Next dev) ~700MB. Chrome/Slack 절반 닫아두면 여유.
- `OLLAMA_KEEP_ALIVE=5m` 환경변수로 모델을 메모리에 5분만 유지 → 미사용 시 자동 언로드.
- BGE-M3 (1024-dim, 한국어 강함)로 업그레이드하려면:
  1. `db/src/init.ts`의 `EMBED_DIM=1024`로 변경
  2. `pnpm db:reset && pnpm embed --force`
  3. `.env`에 `OLLAMA_EMBED_MODEL=bge-m3`

## 디버깅

| 증상 | 원인 / 해결 |
|---|---|
| `/api/chat` 503 `LOCAL_LLM_ENABLED=true 필요` | env 파일 누락. `.env.local` 새로 만들고 서버 재시작 |
| `embed HTTP 404` | 모델 미설치. `ollama pull nomic-embed-text` |
| `vec0 DDL skipped` | sqlite-vec 미설치 또는 macOS arm64 prebuilt 없음. `pnpm rebuild sqlite-vec` 시도 |
| 첫 토큰 30초 이상 | 모델 콜드스타트. 사전 워밍업 호출 |
| 한국어 답변이 어색 | `OLLAMA_GENERATE_MODEL=gemma3:4b-it-q4` (~3.3GB)로 업그레이드 또는 시스템 프롬프트에 인용 강제 |

## Vercel 배포 영향

- 공개/포트폴리오 두 URL 모두 `LOCAL_LLM_ENABLED` 기본값 `false` 유지 — `/chat`이 자동 폴백.
- 로컬 챗봇은 어디까지나 면접 시연 + 채널 콘텐츠용. 외부 공개하려면 Tailscale 같은 별도 노출 수단 필요.
