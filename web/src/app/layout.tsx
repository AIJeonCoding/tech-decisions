import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'tech-decisions — 한국 빅테크 엔지니어링 의사결정 비교',
    template: '%s · tech-decisions',
  },
  description:
    '토스, 카카오페이, 쿠팡, 우아한형제들 등 한국 빅테크가 같은 문제를 어떻게 다르게 풀었는지 비교·검색·질의하는 서비스. 결제·정산·검색·추천·MSA 전환·실시간 데이터 5개 도메인 비교축.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tech-decisions.app'),
  keywords: [
    '한국 빅테크', '엔지니어링 비교', '아키텍처 비교', '토스', '카카오페이', '쿠팡',
    '우아한형제들', '결제 시스템', '정산 시스템', 'MSA', '동시성', 'Outbox', '이중기장',
    'Saga', 'Kafka', 'Elasticsearch', '검색 시스템', '추천 시스템',
  ],
  openGraph: {
    title: 'tech-decisions',
    description: '한국 빅테크 엔지니어링 의사결정을 한 페이지에서 비교한다',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'tech-decisions',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } as Metadata['robots'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="container-wide flex items-center justify-between h-14">
            <Link href="/" className="font-semibold tracking-tight">
              tech-decisions<span className="text-accent">.</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/compare/payment-settlement" className="px-3 py-1.5 rounded hover:bg-muted">
                비교
              </Link>
              <Link href="/search" className="px-3 py-1.5 rounded hover:bg-muted">
                검색
              </Link>
              <Link href="/chat" className="px-3 py-1.5 rounded hover:bg-muted">
                질의
              </Link>
              <a
                href="https://github.com/"
                className="px-3 py-1.5 rounded hover:bg-muted text-fg/60"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border mt-16">
          <div className="container-wide py-8 text-sm text-fg/60">
            <p>
              © {new Date().getFullYear()} tech-decisions. 모든 글의 저작권은 원저작자에게 있으며,
              본 서비스는 출처와 함께 인용·요약을 제공합니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
