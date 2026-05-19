/**
 * Feature flags driven by environment variables.
 * **함수 형태**로 노출해 production 런타임에 매번 process.env를 읽는다 —
 * 같은 빌드 산출물을 두 Vercel 프로젝트(공개/포트폴리오)가 공유 가능.
 */

export const MY_PROJECT_SLUG = 'my-project';

/**
 * 'true' (기본) — 포트폴리오 모드: my-project 노출 + robots disallow /
 * 'false'        — 공개 SEO 모드: my-project 제외 + robots allow /
 */
export function includeMyProject(): boolean {
  return (process.env.INCLUDE_MY_PROJECT ?? 'true').toLowerCase() !== 'false';
}

export function shouldHideMyProject(): boolean {
  return !includeMyProject();
}

/**
 * Whether the /chat page should run as a real RAG chatbot backed by a local
 * Ollama server. Must stay off in Vercel production (no Ollama there) — the
 * /chat page falls back to its FAQ-card stub when this is false.
 */
export function localLlmEnabled(): boolean {
  return (process.env.LOCAL_LLM_ENABLED ?? 'false').toLowerCase() === 'true';
}

/**
 * Whether `/api/chat` should reach out to a Tailscale-Funnel-exposed Ollama
 * (via a Caddy reverse proxy with Bearer auth) instead of localhost.
 * Activates the cloud path: `OLLAMA_URL` should point to the Funnel URL and
 * `LLM_BEARER_TOKEN` must be set.
 */
export function cloudLlmEnabled(): boolean {
  return (process.env.CLOUD_LLM_ENABLED ?? 'false').toLowerCase() === 'true';
}

/** Either local or cloud mode active. */
export function chatBackendEnabled(): boolean {
  return localLlmEnabled() || cloudLlmEnabled();
}

