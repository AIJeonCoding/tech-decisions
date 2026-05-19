import Link from 'next/link';
import type { Metadata } from 'next';
import { MessageSquareText, Search, Layers, Sparkles } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { localLlmEnabled } from '@/lib/feature-flags';
import ChatRoom from './ChatRoom';

export const metadata: Metadata = {
  title: '자주 묻는 질문 — 빅테크는 이 문제를 어떻게 풀었나',
  description:
    '결제·정산·검색·추천·MSA·실시간 데이터 도메인의 자주 묻는 엔지니어링 질문에 대한 비교 사례. RAG 챗봇은 V2 예정.',
  keywords: ['엔지니어링 FAQ', '한국 빅테크', '결제 시스템 비교', 'MSA 비교'],
  alternates: { canonical: '/chat' },
};

interface QA {
  q: string;
  /** 검색에 던질 키워드 (FTS5 grouped 결과로 답변) */
  keywords: string;
  /** 비교 페이지 deep link */
  domain?: string;
  /** 한 줄 요약 답변 */
  hint: string;
}

const QUESTIONS: QA[] = [
  {
    q: '토스/카카오페이/우아한은 결제 동시성을 어떻게 처리해?',
    keywords: '동시성 멱등 분산락',
    domain: 'payment-settlement',
    hint: '토스는 Redis Global Lock + JPA @Lock, 카카오페이는 putIfAbsent 캐시 정합성, 우아한은 Transactional Outbox + 5분 자동 재발행. 비교 페이지에서 한 줄에 비교.',
  },
  {
    q: 'Outbox 패턴은 어떤 회사들이 어떻게 도입했어?',
    keywords: 'Outbox',
    domain: 'msa-migration',
    hint: '우아한형제들이 Debezium MySQL connector + 토픽별 outbox 분리, 토스 페이먼츠가 결제 원장 마이그레이션, settlement-msa가 OutboxAdminController 운영 도구까지.',
  },
  {
    q: '회계 정합성/대사는 빅테크에서 어떻게 검증해?',
    keywords: '이중기장 시산표 정합성',
    domain: 'payment-settlement',
    hint: '우아한과 토스가 이중기장 + PG 전문 일일 매칭. settlement-msa는 시산표 + 대차대조 항등식 자동 회귀 가드(고유 차별점).',
  },
  {
    q: '한국 빅테크 검색은 무슨 엔진/랭킹을 써?',
    keywords: 'Elasticsearch BM25 색인',
    domain: 'search',
    hint: '네이버 D2는 자체 검색엔진, 쿠팡은 ES product-query 비정규화, 우아한은 ES + keyword 타입 최적화 P99 20% 개선, 당근은 ECK on Kubernetes.',
  },
  {
    q: '추천 시스템 — 빅테크 후보 생성·재정렬은?',
    keywords: '추천 후보 reranker',
    domain: 'recommendation',
    hint: '카카오 Rubix(Kafka+Spark), 당근 시맨틱(ANN+cross-encoder), 쿠팡 Multi-task DNN, 네이버 D2 BM25+LightGBM+신경 reranker.',
  },
  {
    q: 'MSA 분산 트랜잭션은 어떤 패턴들?',
    keywords: 'Saga 분산 트랜잭션 멱등',
    domain: 'msa-migration',
    hint: '카카오페이 Saga Pattern + ActResult 함수형, 쿠팡 Saga + 명시적 상태머신, 우아한 RDBMS Outbox + 5분 재발행.',
  },
  {
    q: '실시간 데이터 — Kafka/Flink/CDC 누가 어떻게?',
    keywords: 'Kafka Flink CDC',
    domain: 'realtime-data',
    hint: '쿠팡 Kafka+Flink 분 단위 정산, 카카오페이 RabbitMQ→Kafka 8배 빠르게, 우아한 Debezium MySQL CDC, 토스페이먼츠 StarRocks+CDC.',
  },
  {
    q: '캐시 정합성 — 분산 환경에서 어떻게 잡아?',
    keywords: '캐시 Redis 정합성',
    hint: '토스 Look-Aside + Circuit Breaker (TPS 1만), 카카오페이 Local + Redis Pub/Sub 무효화.',
  },
];

export default function ChatPage() {
  const enableLocalLlm = localLlmEnabled();

  return (
    <div className="container-narrow py-10">
      <Breadcrumbs items={[{ href: '/chat', label: enableLocalLlm ? '챗봇' : '자주 묻는 질문' }]} />

      {enableLocalLlm ? (
        <ChatRoom />
      ) : (
        <>
          <header className="mb-8">
            <span className="chip mb-3 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> V1.5 — 자주 묻는 질문
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              빅테크는 이 문제를<br /> 어떻게 풀었지?
            </h1>
            <p className="mt-4 text-fg/65 leading-relaxed">
              자연어 RAG 챗봇은 V2 예정. 그동안 자주 묻는 질문 8개를 정리해뒀습니다.
              질문 카드를 클릭하면 관련 비교 페이지 + 검색 결과로 이동합니다.
            </p>
          </header>

          <section className="space-y-3">
            {QUESTIONS.map((qa, i) => (
              <article key={i} className="card p-5 hover:border-accent/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-semibold mt-0.5">
                    Q
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg leading-snug">{qa.q}</h2>
                    <p className="mt-2 text-sm text-fg/70 leading-relaxed">{qa.hint}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {qa.domain && (
                        <Link
                          href={`/compare/${qa.domain}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/15"
                        >
                          <Layers className="w-3 h-3" /> 비교 페이지로
                        </Link>
                      )}
                      <Link
                        href={`/search?q=${encodeURIComponent(qa.keywords)}${qa.domain ? `&domain=${qa.domain}` : ''}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-fg/70 text-xs font-medium hover:bg-muted"
                      >
                        <Search className="w-3 h-3" /> 검색 결과 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-10 card p-6 bg-accent/5 border-accent/20">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-accent" /> V2 RAG 챗봇 (준비 중)
            </h2>
            <p className="mt-2 text-sm text-fg/65 leading-relaxed">
              질문을 자유롭게 입력하면 인덱싱된 모든 글에서 출처와 함께 답변하는 챗봇은 V2 예정입니다.
              로컬 Ollama + Gemma E2B 셋업 후 <code className="text-xs bg-muted px-1 py-0.5 rounded">LOCAL_LLM_ENABLED=true</code>로
              켜면 바로 동작합니다 — 가이드는 <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/LOCAL_RAG.md</code>.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
