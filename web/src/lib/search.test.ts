import { describe, it, expect } from 'vitest';
import { buildFtsQuery } from './search';

describe('buildFtsQuery', () => {
  it('wraps a single Korean token in phrase + prefix match', () => {
    expect(buildFtsQuery('정산')).toBe('("정산" OR 정산*)');
  });

  it('wraps a single English token in phrase + prefix match', () => {
    expect(buildFtsQuery('Outbox')).toBe('("Outbox" OR Outbox*)');
  });

  it('joins multiple tokens with OR', () => {
    expect(buildFtsQuery('정산 동시성')).toBe(
      '("정산" OR 정산*) OR ("동시성" OR 동시성*)',
    );
  });

  it('strips punctuation but keeps Unicode letters and digits', () => {
    expect(buildFtsQuery('BM25, 검색!')).toBe(
      '("BM25" OR BM25*) OR ("검색" OR 검색*)',
    );
  });

  it('collapses excess whitespace', () => {
    expect(buildFtsQuery('  결제   정산  ')).toBe(
      '("결제" OR 결제*) OR ("정산" OR 정산*)',
    );
  });

  it('returns null when input is empty', () => {
    expect(buildFtsQuery('')).toBeNull();
    expect(buildFtsQuery('   ')).toBeNull();
  });

  it('returns null when all tokens are pure punctuation', () => {
    expect(buildFtsQuery('!!! ??? ...')).toBeNull();
  });

  it('handles mixed Korean+English tokens', () => {
    expect(buildFtsQuery('Saga 보상')).toBe(
      '("Saga" OR Saga*) OR ("보상" OR 보상*)',
    );
  });
});
