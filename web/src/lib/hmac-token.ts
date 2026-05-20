import crypto from 'node:crypto';

/**
 * HMAC-SHA256 bearer token used by `/api/chat-init` to grant the browser a
 * short-lived (60-second) credential for direct Funnel calls.
 *
 * Format:  base64url(JSON payload).base64url(HMAC-SHA256(payload, secret))
 * Payload: { exp, iat, jti, aud:'ollama' }
 *
 * The Mac-side `auth-proxy.js` verifies the same secret, expiry, and
 * single-use jti, then streams to Ollama.
 */

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export interface IssuedToken {
  token: string;
  exp: number;
  jti: string;
}

export function issueOllamaToken(secret: string, ttlSeconds = 60): IssuedToken {
  if (!secret || secret.length < 32) {
    throw new Error('HMAC_SECRET must be at least 32 hex chars');
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const jti = crypto.randomUUID();
  const payload = Buffer.from(JSON.stringify({ exp, iat: now, jti, aud: 'ollama' }));
  const sig = crypto.createHmac('sha256', secret).update(payload).digest();
  return { token: `${b64url(payload)}.${b64url(sig)}`, exp, jti };
}
