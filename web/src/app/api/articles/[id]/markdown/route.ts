import { NextRequest } from 'next/server';
import { getArticleById } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return new Response('Invalid article id', { status: 400 });
  }

  const article = await getArticleById(numericId);
  if (!article) {
    return new Response('Article not found', { status: 404 });
  }

  const company = article.companyNameKo ?? article.companyName;
  const frontmatterLines: string[] = [
    '---',
    `title: ${yamlString(article.title)}`,
    `company: ${yamlString(company)}`,
  ];
  if (article.author) frontmatterLines.push(`author: ${yamlString(article.author)}`);
  if (article.publishedAt) frontmatterLines.push(`publishedAt: ${article.publishedAt}`);
  if (article.domains?.length) frontmatterLines.push(`domains: [${article.domains.join(', ')}]`);
  if (article.tags?.length) frontmatterLines.push(`tags: [${article.tags.join(', ')}]`);
  frontmatterLines.push(`source: ${article.url}`);
  frontmatterLines.push('---', '', '');
  const frontmatter = frontmatterLines.join('\n');

  const body = frontmatter + article.bodyMd;

  const safeAscii = `article-${numericId}.md`;
  const utf8Name = `${sanitizeForFilename(article.title)}-${numericId}.md`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function yamlString(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function sanitizeForFilename(name: string): string {
  const cleaned = name.replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, '-');
  return cleaned.slice(0, 80) || 'article';
}
