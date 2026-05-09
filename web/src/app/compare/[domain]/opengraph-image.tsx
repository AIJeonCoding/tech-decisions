import { ImageResponse } from 'next/og';
import { getDomain, getCompaniesWithDecisions } from '@/lib/queries';

export const runtime = 'nodejs';
export const alt = '';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { domain: string } }) {
  const [domain, companies] = await Promise.all([
    getDomain(params.domain),
    getCompaniesWithDecisions(params.domain),
  ]);
  const name = domain?.name ?? params.domain;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.5 }}>tech-decisions / compare</div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 32, color: '#a5b4fc', marginBottom: 12 }}>도메인 비교</div>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {name}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 26,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
            }}
          >
            5개 비교축 × {companies.length}개 회사를 한 페이지에 나란히
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 22 }}>
          {companies.slice(0, 6).map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                padding: '8px 16px',
                background: c.slug === 'my-project' ? '#6366f1' : 'rgba(255,255,255,0.1)',
                borderRadius: 999,
                fontWeight: c.slug === 'my-project' ? 600 : 400,
              }}
            >
              {c.slug === 'my-project' ? '내 프로젝트' : (c.nameKo ?? c.name)}
            </div>
          ))}
          {companies.length > 6 && (
            <div style={{ display: 'flex', padding: '8px 16px', fontSize: 20, opacity: 0.6, alignSelf: 'center' }}>
              +{companies.length - 6}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
