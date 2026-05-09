// Heading-based chunking for markdown, with token-budget sliding window.
// Approximation: 1 token ≈ 1.5 chars for Korean+English mix.
// We aim ~500 tokens per chunk, ~50 token overlap.

const TARGET_TOKENS = 500;
const MAX_TOKENS = 700;
const OVERLAP_TOKENS = 50;
const CHARS_PER_TOKEN = 1.5;

const TARGET_CHARS = Math.floor(TARGET_TOKENS * CHARS_PER_TOKEN);
const MAX_CHARS = Math.floor(MAX_TOKENS * CHARS_PER_TOKEN);
const OVERLAP_CHARS = Math.floor(OVERLAP_TOKENS * CHARS_PER_TOKEN);

export interface Chunk {
  idx: number;
  heading: string | null;
  text: string;
  estimatedTokens: number;
}

/** Split markdown body into heading-aware chunks of ~500 tokens each. */
export function chunkMarkdown(md: string): Chunk[] {
  // Step 1: split by H1/H2/H3 boundaries; preserve heading text per section.
  const sections = splitByHeadings(md);

  const chunks: Chunk[] = [];
  let idx = 0;
  for (const sec of sections) {
    if (sec.text.length <= MAX_CHARS) {
      chunks.push({
        idx: idx++,
        heading: sec.heading,
        text: sec.text.trim(),
        estimatedTokens: Math.ceil(sec.text.length / CHARS_PER_TOKEN),
      });
      continue;
    }
    // Step 2: section is too long → sliding window over paragraphs.
    const paragraphs = sec.text.split(/\n{2,}/);
    let buf = '';
    for (const p of paragraphs) {
      if ((buf.length + p.length + 2) > TARGET_CHARS && buf.length > 0) {
        chunks.push({
          idx: idx++,
          heading: sec.heading,
          text: buf.trim(),
          estimatedTokens: Math.ceil(buf.length / CHARS_PER_TOKEN),
        });
        // Sliding overlap: keep last OVERLAP_CHARS of buf
        buf = buf.slice(-OVERLAP_CHARS) + '\n\n' + p;
      } else {
        buf = buf ? buf + '\n\n' + p : p;
      }
    }
    if (buf.trim().length > 0) {
      chunks.push({
        idx: idx++,
        heading: sec.heading,
        text: buf.trim(),
        estimatedTokens: Math.ceil(buf.length / CHARS_PER_TOKEN),
      });
    }
  }
  // Drop tiny chunks (<60 tokens) by merging into previous if possible
  return mergeTiny(chunks);
}

interface Section {
  heading: string | null;
  text: string;
}

function splitByHeadings(md: string): Section[] {
  const lines = md.split('\n');
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let buf: string[] = [];
  for (const line of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line);
    if (m) {
      if (buf.length > 0) {
        sections.push({ heading: currentHeading, text: buf.join('\n') });
        buf = [];
      }
      currentHeading = m[2]?.trim() ?? null;
    } else {
      buf.push(line);
    }
  }
  if (buf.length > 0) {
    sections.push({ heading: currentHeading, text: buf.join('\n') });
  }
  return sections.filter((s) => s.text.trim().length > 20);
}

function mergeTiny(chunks: Chunk[]): Chunk[] {
  const result: Chunk[] = [];
  for (const c of chunks) {
    const last = result[result.length - 1];
    if (
      c.estimatedTokens < 60 &&
      last &&
      last.estimatedTokens + c.estimatedTokens < MAX_TOKENS &&
      last.heading === c.heading
    ) {
      last.text = last.text + '\n\n' + c.text;
      last.estimatedTokens += c.estimatedTokens;
    } else {
      result.push({ ...c });
    }
  }
  return result.map((c, i) => ({ ...c, idx: i }));
}
