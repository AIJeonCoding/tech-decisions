import { ImageResponse } from 'next/og';
import { getCompanyBySlug, getArticlesByCompanySlug } from '@/lib/queries';

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

export default async function Image({ params }: { params: { slug: string } }) {
  const [company, articles] = await Promise.all([
    getCompanyBySlug(params.slug),
    getArticlesByCompanySlug(params.slug),
  ]);
  if (!company) return new ImageResponse(<div>not found</div>, { ...size });

  const name = company.nameKo ?? company.name;
  const isMine = params.slug === 'my-project';
  const domainSet = new Set<string>();
  for (const a of articles) for (const d of a.domains ?? []) domainSet.add(d);
  const domains = Array.from(domainSet);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          background: isMine
            ? 'linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, opacity: 0.5 }}>
          <div style={{ display: 'flex' }}>tech-decisions / companies</div>
          {isMine && <div style={{ display: 'flex', color: '#fde047' }}>내 정산 MSA 포트폴리오</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 32, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>회사 프로필</div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {name}
          </div>
          {company.description && (
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                fontSize: 24,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.5,
                maxHeight: 100,
                overflow: 'hidden',
              }}
            >
              {company.description.length > 130
                ? company.description.slice(0, 128) + '…'
                : company.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {domains.slice(0, 5).map((d) => (
              <div
                key={d}
                style={{
                  display: 'flex',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  fontSize: 22,
                  color: '#a5b4fc',
                }}
              >
                {DOMAIN_LABELS[d] ?? d}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.7 }}>{articles.length}편 분석</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
