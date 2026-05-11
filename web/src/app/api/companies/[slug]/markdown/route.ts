import { NextRequest } from 'next/server';
import {
  getCompanyBySlug,
  getArticlesByCompanySlug,
  getCellsByCompanySlug,
  getArticleById,
} from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN_LABELS: Record<string, string> = {
  'payment-settlement': '결제·정산',
  search: '검색',
  recommendation: '추천',
  'msa-migration': 'MSA 전환',
  'realtime-data': '실시간 데이터',
};

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return new Response('Company not found', { status: 404 });

  const [articleStubs, cells] = await Promise.all([
    getArticlesByCompanySlug(slug),
    getCellsByCompanySlug(slug),
  ]);

  const name = company.nameKo ?? company.name;
  const generated = new Date().toISOString();

  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${yamlString(`${name} · tech-decisions`)}`);
  lines.push(`company: ${yamlString(name)}`);
  lines.push(`slug: ${slug}`);
  if (company.blogUrl) lines.push(`blog_url: ${company.blogUrl}`);
  lines.push(`article_count: ${articleStubs.length}`);
  lines.push(`cell_count: ${cells.length}`);
  lines.push(`generated_at: ${generated}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${name} — 엔지니어링 의사결정 요약`);
  lines.push('');
  if (company.description) {
    lines.push(company.description);
    lines.push('');
  }
  lines.push(
    'tech-decisions가 한국 빅테크 기술 블로그 글에서 의사결정만 추출해 정리한 자료입니다. ' +
      '이 파일 하나를 LLM에 그대로 입력하면 회사 전체 엔지니어링 결정을 한 번에 비교·요약할 수 있습니다.',
  );
  lines.push('');

  // 비교축 의사결정 (도메인별 그룹핑)
  if (cells.length > 0) {
    lines.push('## 비교축 의사결정');
    lines.push('');
    const byDomain = new Map<string, typeof cells>();
    for (const c of cells) {
      const list = byDomain.get(c.domainSlug) ?? [];
      list.push(c);
      byDomain.set(c.domainSlug, list);
    }
    for (const [domain, dcells] of byDomain) {
      lines.push(`### ${DOMAIN_LABELS[domain] ?? domain}`);
      lines.push('');
      const sorted = [...dcells].sort(
        (a, b) => (a.axisSortOrder ?? 0) - (b.axisSortOrder ?? 0),
      );
      for (const c of sorted) {
        lines.push(`**${c.axisName}** — ${c.cellSummary ?? '(미입력)'}`);
        if (typeof c.confidence === 'number') {
          lines.push(`*신뢰도: ${Math.round((c.confidence ?? 0) * 100)}%*`);
        }
        if (c.evidence && c.evidence.length > 0) {
          for (const ev of c.evidence) {
            const quote = ev.quote
              ? ev.quote.replace(/\s+/g, ' ').trim().slice(0, 240)
              : '';
            if (quote) lines.push(`> ${quote}`);
            lines.push(`  — [${ev.title}](${ev.url})`);
          }
        }
        lines.push('');
      }
    }
  }

  // 인덱싱된 글 본문
  if (articleStubs.length > 0) {
    lines.push('## 인덱싱된 블로그 글 본문');
    lines.push('');
    for (const stub of articleStubs) {
      const article = await getArticleById(stub.id);
      if (!article) continue;
      lines.push(`### ${article.title}`);
      lines.push('');
      const meta: string[] = [];
      if (article.publishedAt) meta.push(`발행 ${article.publishedAt}`);
      if (article.author) meta.push(`저자 ${article.author}`);
      if (article.domains?.length)
        meta.push(`도메인 ${article.domains.join(', ')}`);
      if (meta.length) {
        lines.push(`*${meta.join(' · ')}*`);
        lines.push('');
      }
      lines.push(`원문: ${article.url}`);
      lines.push('');
      lines.push(article.bodyMd);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  const body = lines.join('\n');
  const safeAscii = `${slug}.md`;
  const utf8Name = `${sanitizeForFilename(name)}-tech-decisions.md`;

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
  return cleaned.slice(0, 80) || 'company';
}
