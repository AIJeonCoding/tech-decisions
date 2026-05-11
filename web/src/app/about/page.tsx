import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Layers, Search, MessageSquareText, ShieldCheck, ArrowRight,
  Star, ExternalLink, BookOpen, Github,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { includeMyProject } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: '소개 — 왜 만들었고 어떻게 쓰는가',
  description:
    'tech-decisions는 토스·카카오페이·쿠팡·우아한 등 한국 빅테크가 같은 문제를 어떻게 풀었는지 본문에서 핵심 의사결정을 추출해 회사별 비교축에 나란히 정렬한 비교 사이트입니다.',
  keywords: ['포트폴리오', '면접 데모', '한국 빅테크', '엔지니어링 비교', '결제 시스템', 'MSA'],
  alternates: { canonical: '/about' },
};

export const dynamic = 'force-dynamic';

const FIVE_AXES = [
  {
    n: '01',
    name: '동시성·정합성 제어',
    mine: '@Version 낙관적 락 + Idempotency-Key 4중 가드 + Pessimistic IT',
    others: [
      ['토스', 'Redis Global Lock + JPA @Lock'],
      ['카카오페이', 'putIfAbsent + Redis/Local 캐시'],
      ['우아한', 'Transactional Outbox + 5분 자동 재발행'],
    ],
    insight: '분산락 없이 코드 레벨 정합성 — 카카오페이 철학에 가까움',
  },
  {
    n: '02',
    name: '정산 시점',
    mine: 'PROVISIONAL → FINAL → REVISED 3단계 인식 + Pipeline 11 step',
    others: [
      ['토스 페이먼츠', '거래 단위 독립 처리 + 병렬 배치 + 카나리'],
      ['카카오페이', 'Kafka 지연이체 + 동일 Consumer 라우팅'],
      ['쿠팡', 'Kafka + Flink 스트리밍 (분 단위)'],
    ],
    insight: '발생주의 회계 표준을 시스템에 내장 — 우아한 단순함 + 토스 추적성',
  },
  {
    n: '03',
    name: '대사·정합성 검증',
    mine: '이중기장 + 시산표 + 대차대조 항등식 자동 회귀 가드',
    others: [
      ['토스 페이먼츠', 'StarRocks + CDC 실시간 정합성'],
      ['카카오페이', '이벤트 스토어 + 일일 리컨실'],
      ['우아한', '이중기장 + PG 전문 자동 매칭'],
    ],
    insight: '⭐ 빅테크 어디에도 없는 차별점 — 내부 원장 항등식 자동 검증',
    star: true,
  },
  {
    n: '04',
    name: '수수료·정산금 분배',
    mine: 'AR Clearing FIFO + Chargeback 상태머신 + 충당금 + 세금계산서',
    others: [
      ['토스 페이먼츠', '통합 approve 테이블 + split payment'],
      ['카카오페이', 'DSL 룰 엔진'],
      ['쿠팡', '4단계 분배 + BigDecimal 정밀도'],
    ],
    insight: '회계적 안전망까지 갖춘 핀테크 풀스택',
  },
  {
    n: '05',
    name: '장애 복구·재처리',
    mine: 'Outbox + Admin redrive + Zipkin + Prometheus 12 alert + RUNBOOK 7 INC',
    others: [
      ['토스', '상태머신 + DLQ 자동 재시도'],
      ['카카오페이', '멱등성 + ActResult + 자동 재시도'],
      ['우아한', 'Outbox + Debezium MySQL connector'],
    ],
    insight: '⭐ 패턴 도입을 넘어 SRE-ready 운영 도구 풀스택',
    star: true,
  },
];

export default function AboutPage() {
  return (
    <div className="container-narrow py-12">
      <Breadcrumbs items={[{ href: '/about', label: '소개' }]} />
      {/* Hero — my-project 노출 모드에 따라 메시지 분기 */}
      <header className="mb-12">
        <span className="chip mb-3">about</span>
        {includeMyProject() ? (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              빅테크 엔지니어링 비교 위에<br /> 내 정산 MSA를 같이 노출했습니다
            </h1>
            <p className="mt-5 text-lg text-fg/65 leading-relaxed">
              토스/카카오페이/쿠팡/우아한형제들의 공개 글을 도메인별 비교축으로 묶고,
              그 위에 <strong className="text-fg">제 정산 MSA 포트폴리오</strong>를 같은 비교축에 함께 노출했습니다.
              제목 모음이 아니라, 본문에서 <strong className="text-fg">핵심 의사결정을 추출</strong>한 비교표입니다.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              한국·글로벌 빅테크는<br /> 같은 문제를 어떻게 풀었나
            </h1>
            <p className="mt-5 text-lg text-fg/65 leading-relaxed">
              토스·카카오페이·쿠팡·우아한·네이버·카카오·라인·당근 +
              Netflix·YouTube·Spotify·Uber·Stripe의 공개 기술 글에서
              <strong className="text-fg"> 핵심 의사결정을 본문에서 직접 추출</strong>해,
              결제·정산·검색·추천·MSA 전환·실시간 데이터 5개 도메인의 같은 비교축에 회사별로 나란히 정렬합니다.
            </p>
          </>
        )}
      </header>

      {/* 차별점 */}
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 inline-flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> 이 사이트가 다른 이유
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-fg/50 mb-1">기존 기술 블로그 모음</div>
            <p className="font-medium leading-relaxed">
              글 목록·태그·날짜를 모아주는 데서 끝. <span className="text-fg/55">같은 문제를 회사별로 어떻게 풀었는지 한 줄에 비교할 수 없습니다.</span>
            </p>
          </div>
          <div className="card p-5 ring-1 ring-accent/30 bg-accent/5">
            <div className="text-xs uppercase tracking-wider text-accent mb-1">tech-decisions</div>
            <p className="font-medium leading-relaxed">
              본문에서 <strong>의사결정을 직접 추출</strong>해 도메인별 비교축에 회사를 같은 줄로 정렬. <span className="text-fg/65">셀마다 인용 근거 + 원문 링크로 검증 가능.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 5축 매핑 — my-project 모드 전용 */}
      {includeMyProject() && (
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-1 inline-flex items-center gap-2">
          <Layers className="w-4 h-4" /> 결제·정산 핵심 5가지 — 빅테크와 어디서 같고 어디서 다른가
        </h2>
        <p className="text-fg/60 mb-6 text-sm">
          내 프로젝트(<code className="text-xs bg-muted px-1 rounded">settlement-msa</code>)를
          토스·카카오페이·쿠팡·우아한과 같은 비교축에 올려, 같은 문제 다섯 가지에 대한 선택을 한 화면에 정리했습니다.
        </p>
        <div className="space-y-4">
          {FIVE_AXES.map((ax) => (
            <article key={ax.n} className="card p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs font-mono text-accent/70">{ax.n}</span>
                <h3 className="text-lg font-bold tracking-tight">{ax.name}</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div className={`p-3 rounded-lg ${ax.star ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-accent/5'}`}>
                  <div className="text-[11px] text-accent uppercase tracking-wider mb-1 font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> 내 프로젝트
                  </div>
                  <div className="text-sm font-medium leading-snug">{ax.mine}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-sm leading-snug space-y-1">
                  {ax.others.map(([co, desc]) => (
                    <div key={co}>
                      <span className="text-fg/50 font-medium">{co}:</span>{' '}
                      <span className="text-fg/75">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`text-sm leading-relaxed ${ax.star ? 'text-accent font-medium' : 'text-fg/65'}`}>
                → {ax.insight}
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      {/* 시연 흐름 — my-project 모드 전용 */}
      {includeMyProject() && (
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4 inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> 면접 시연 흐름 (5분)
        </h2>
        <ol className="space-y-3">
          {(
            [
              ['0:00~0:30', '메인 통계 박스 → 강조 카드 (★ 내 프로젝트가 비교축에 노출)', '/'],
              ['0:30~3:30', '결제·정산 비교 — 내 프로젝트 셀 5개 차례 클릭 + 빅테크와 비교', '/compare/payment-settlement'],
              ['3:30~4:30', 'MSA 전환 보조 시연 + 검색 도구', '/compare/msa-migration'],
              ['4:30~5:00', '어드민 통계 → 신뢰도 강조', '/admin/cells'],
            ] as const
          ).map(([time, desc, url]) => (
            <li key={url} className="card p-4 flex items-start gap-4">
              <span className="text-xs font-mono text-accent shrink-0 w-20">{time}</span>
              <div className="flex-1">
                <div className="font-medium leading-snug">{desc}</div>
                <Link href={url} className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  {url} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>
      )}

      {/* 도구 한눈에 */}
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-fg/50 mb-4">제공 도구</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/compare/payment-settlement" className="card p-5 hover:border-accent/50 transition-colors">
            <Layers className="w-5 h-5 text-accent mb-2" />
            <div className="font-semibold">비교 페이지</div>
            <p className="mt-1 text-sm text-fg/60 leading-snug">5개 도메인 × 비교축. 내 프로젝트가 같은 행에 노출.</p>
          </Link>
          <Link href="/search" className="card p-5 hover:border-accent/50 transition-colors">
            <Search className="w-5 h-5 text-accent mb-2" />
            <div className="font-semibold">키워드 검색</div>
            <p className="mt-1 text-sm text-fg/60 leading-snug">SQLite FTS5 + 한국어 prefix. 도메인 chip 자동 표시.</p>
          </Link>
          <Link href="/admin/cells" className="card p-5 hover:border-accent/50 transition-colors">
            <ShieldCheck className="w-5 h-5 text-accent mb-2" />
            <div className="font-semibold">셀 검수 콘솔</div>
            <p className="mt-1 text-sm text-fg/60 leading-snug">신뢰도 색상 배지. 도메인별 평균 막대그래프.</p>
          </Link>
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <Link href="/chat" className="card p-5 opacity-70 hover:opacity-100 transition-opacity">
            <MessageSquareText className="w-5 h-5 text-fg/50 mb-2" />
            <div className="font-semibold">RAG 챗봇 <span className="ml-1 chip text-xs">V2</span></div>
            <p className="mt-1 text-sm text-fg/60 leading-snug">"토스는 정산 동시성을 어떻게 처리해?"에 출처와 함께 답변. V2 예정.</p>
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="card p-5 hover:border-accent/50 transition-colors"
          >
            <Github className="w-5 h-5 text-accent mb-2" />
            <div className="font-semibold inline-flex items-center gap-1">GitHub <ExternalLink className="w-3 h-3" /></div>
            <p className="mt-1 text-sm text-fg/60 leading-snug">코드·시드·문서 모두 공개. settlement-msa는 별도 리포.</p>
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="card p-8 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/20">
        {includeMyProject() ? (
          <>
            <h2 className="text-xl font-bold tracking-tight">바로 시연을 시작하시려면</h2>
            <p className="mt-2 text-fg/65 leading-relaxed">
              결제·정산 비교 페이지에서 첫 컬럼이 ★ <strong className="text-accent">내 프로젝트</strong> 입니다.
              5개 셀을 차례로 클릭하면 사이드 패널에 인용 근거 + 원문 링크가 나옵니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/compare/payment-settlement" className="btn-primary">
                결제·정산 비교 시작 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/companies/my-project" className="btn">
                내 프로젝트 프로필 보기
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold tracking-tight">5개 도메인 중 어디부터 보시겠어요?</h2>
            <p className="mt-2 text-fg/65 leading-relaxed">
              결제·정산이 가장 풍부한 비교축 데이터를 갖고 있습니다. 검색·추천·MSA·실시간 데이터도 같은 형식.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/compare/payment-settlement" className="btn-primary">
                결제·정산 비교 시작 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/search" className="btn">
                키워드로 검색
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
