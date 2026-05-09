import { ImageResponse } from 'next/og';
import { getArticleById } from '@/lib/queries';

export const runtime = 'nodejs';
export const alt = '';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DOMAIN_LABELS: Record<string, string> = {
  'payment-settlement': '결제·정산',
  'search': '검색',
  'recommendation': '추천',
  'msa-migration': 'MSA 전환',
  'realtime-data': '실시간 데이터',
};

export default async function Image({ params }: { params: { id: string } }) {
  const article = await getArticleById(Number(params.id));
  if (!article) {
    return new ImageResponse(<div>not found</div>, { ...size });
  }

  const company = article.companyNameKo ?? article.companyName;
  const domains = article.domains ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 24, opacity: 0.5 }}>tech-decisions / articles</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {domains.slice(0, 3).map((d) => (
              <div
                key={d}
                style={{
                  display: 'flex',
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  fontSize: 18,
                  color: '#a5b4fc',
                }}
              >
                {DOMAIN_LABELS[d] ?? d}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 28, color: '#a5b4fc', marginBottom: 16 }}>{company}</div>
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              maxHeight: 280,
              overflow: 'hidden',
            }}
          >
            {article.title.length > 80 ? article.title.slice(0, 78) + '…' : article.title}
          </div>
          {article.summary && (
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                fontSize: 24,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.4,
                maxHeight: 100,
                overflow: 'hidden',
              }}
            >
              {article.summary.length > 110 ? article.summary.slice(0, 108) + '…' : article.summary}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 20, opacity: 0.5 }}>
          <div style={{ display: 'flex' }}>한국 빅테크 엔지니어링 비교 큐레이터</div>
          <div style={{ display: 'flex' }}>{article.publishedAt ? article.publishedAt.slice(0, 10) : ''}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
