import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'tech-decisions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.6 }}>tech-decisions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            다른 회사는<br /> 어떻게 풀었지?
          </div>
          <div style={{ fontSize: 28, opacity: 0.7 }}>
            한국·글로벌 빅테크는 같은 문제를 어떻게 풀었나
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 22, opacity: 0.6, flexWrap: 'wrap' }}>
          <span>토스</span>·<span>카카오페이</span>·<span>Netflix</span>·<span>Stripe</span>·<span>Spotify</span>·<span>+10</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
