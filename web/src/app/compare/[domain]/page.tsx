import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getDomain,
  getAxesForDomain,
  getCellsForDomain,
  getCompaniesWithDecisions,
  getAllCompanies,
} from '@/lib/queries';
import { CompareTable } from '@/components/CompareTable';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const d = await getDomain(domain);
  if (!d) return {};
  return {
    title: `${d.name} 아키텍처 비교`,
    description: `${d.name} 도메인을 한국 빅테크가 어떻게 다르게 풀었는지 5개 축으로 비교한 표.`,
    openGraph: {
      title: `${d.name} 아키텍처 비교`,
      description: d.description ?? undefined,
    },
  };
}

export default async function ComparePage({ params }: Props) {
  const { domain } = await params;
  const d = await getDomain(domain);
  if (!d) notFound();

  const [axes, cells, withDecisions, all] = await Promise.all([
    getAxesForDomain(domain),
    getCellsForDomain(domain),
    getCompaniesWithDecisions(domain),
    getAllCompanies(),
  ]);

  // 도메인별로 관련 회사만 노출. 셀이 있는 회사 + my-project를 기본으로,
  // 결제·정산·MSA에는 핵심 핀테크 5사를 추가로 채운다.
  const PER_DOMAIN_PINS: Record<string, string[]> = {
    'payment-settlement': ['my-project', 'toss', 'kakaopay', 'coupang', 'woowahan', 'banksalad'],
    'msa-migration':      ['my-project', 'toss', 'kakaopay', 'coupang', 'woowahan'],
    'realtime-data':      ['my-project', 'toss', 'kakaopay', 'coupang', 'woowahan'],
    'search':             ['naver-d2', 'coupang', 'daangn', 'woowahan'],
    'recommendation':     ['daangn', 'coupang', 'woowahan', 'naver-d2', 'kakaopay', 'toss'],
  };
  const pins = PER_DOMAIN_PINS[domain] ?? ['my-project'];
  const slugsWithCells = new Set(withDecisions.map((c) => c.slug));
  const allowed = new Set([...pins, ...slugsWithCells]);
  const companyList = all
    .filter((c) => allowed.has(c.slug))
    .sort((a, b) => {
      const ai = pins.indexOf(a.slug);
      const bi = pins.indexOf(b.slug);
      if (ai === -1 && bi === -1) return a.id - b.id;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return (
    <div className="container-wide py-10">
      <header className="mb-8 max-w-3xl">
        <div className="text-sm text-accent mb-2">도메인 비교</div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{d.name} 아키텍처 비교</h1>
        {d.description && (
          <p className="mt-3 text-fg/60 leading-relaxed">{d.description}</p>
        )}
        <p className="mt-4 text-sm text-fg/50 leading-relaxed">
          같은 문제를 한국 빅테크가 어떻게 다르게 풀었는지 {axes.length}개 비교축으로 정리했습니다.
          셀을 클릭하면 원문 근거와 인용 문장을 확인할 수 있습니다.
        </p>
      </header>

      <CompareTable axes={axes} companies={companyList} cells={cells} />

      <section className="mt-12 p-6 card bg-muted/20">
        <h2 className="font-semibold mb-2">자연어로 직접 물어볼 수 있어요</h2>
        <p className="text-sm text-fg/70 mb-4">
          비교축이 부족하다면 챗봇이 인덱싱된 모든 글에서 직접 답을 찾아줍니다.
        </p>
        <a href={`/chat?q=${encodeURIComponent(`${d.name}을 토스/카카오페이/쿠팡은 각각 어떻게 처리해?`)}`}
           className="btn-primary">
          챗봇에게 물어보기 →
        </a>
      </section>
    </div>
  );
}
