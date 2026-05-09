import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndown.addRule('preserveCodeBlocks', {
  filter: ['pre'],
  replacement(content, node) {
    const codeNode = (node as Element).querySelector('code');
    const lang = codeNode?.getAttribute('class')?.match(/language-(\w+)/)?.[1] ?? '';
    const text = (codeNode?.textContent ?? content).replace(/\n+$/, '');
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
  },
});

export interface ExtractedArticle {
  title: string;
  byline: string | null;
  excerpt: string | null;
  content: string;
  textContent: string;
  length: number;
}

export function extractFromHtml(html: string, url: string): ExtractedArticle | null {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const result = reader.parse();
  if (!result) return null;
  const md = turndown.turndown(result.content ?? '');
  return {
    title: result.title ?? '',
    byline: result.byline,
    excerpt: result.excerpt,
    content: md,
    textContent: result.textContent ?? '',
    length: result.length,
  };
}
