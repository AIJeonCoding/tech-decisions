import { createHash } from 'node:crypto';

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function shortHash(s: string): string {
  return sha256(s).slice(0, 16);
}
