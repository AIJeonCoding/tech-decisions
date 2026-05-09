import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from './chunk';

describe('chunkMarkdown', () => {
  it('returns at least one chunk for a short paragraph', () => {
    const md = '결제 시스템에서 멱등성을 처리하는 가장 흔한 방법은 Idempotency-Key를 사용하는 것이다.';
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]?.text).toContain('Idempotency-Key');
  });

  it('respects heading boundaries — each H2 starts a new chunk when content is sufficient', () => {
    // splitByHeadings drops sections where the trimmed body is < 20 characters,
    // so each section here gets enough content to survive that filter.
    const md = `# 결제 시스템

## 동시성
분산락을 사용해서 동시 결제 충돌을 방지하는 구현 방식이다.

## 정산
거래 데이터를 일배치로 처리하는 시점은 새벽이다.`;
    const chunks = chunkMarkdown(md);
    const headings = chunks.map((c) => c.heading).filter(Boolean);
    expect(headings).toContain('동시성');
    expect(headings).toContain('정산');
  });

  it('splits long sections into multiple chunks via sliding window', () => {
    // ~3000 chars across many paragraphs — should exceed TARGET_CHARS (~750).
    const longSection = Array.from({ length: 30 })
      .map((_, i) => `문단 ${i + 1}: 결제 트랜잭션의 동시성과 정합성 처리 방법에 대한 설명을 상세하게 다룬다. ${'토큰'.repeat(8)}`)
      .join('\n\n');
    const md = `## 긴 섹션\n\n${longSection}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThan(1);
    // All chunks under the same heading
    chunks.forEach((c) => expect(c.heading).toBe('긴 섹션'));
  });

  it('assigns sequential idx starting from 0', () => {
    const md = `## A
첫 번째 섹션 내용입니다. 충분히 긴 내용을 갖도록 작성합니다.

## B
두 번째 섹션 내용입니다. 충분히 길게 작성합니다.

## C
세 번째 섹션도 마찬가지로 작성합니다.`;
    const chunks = chunkMarkdown(md);
    chunks.forEach((c, i) => expect(c.idx).toBe(i));
  });

  it('drops sections with text under 20 characters', () => {
    const md = `## 짧음
1줄

## 충분
이 섹션은 길이가 일정 임계값을 넘어 청크로 만들어진다.`;
    const chunks = chunkMarkdown(md);
    expect(chunks.find((c) => c.heading === '짧음')).toBeUndefined();
    expect(chunks.find((c) => c.heading === '충분')).toBeDefined();
  });
});
