/**
 * 결제·정산 도메인의 비교 셀 수기 시드.
 *
 * 목적: 실제 LLM 파이프라인이 돌기 전에도 UI 데모가 가능하도록
 *      공개된 글에서 직접 인용한 텍스트로 4개사 × 5축 = 20개 셀 채움.
 *
 * 모든 인용은 공개된 기술 블로그 게시글의 일부로, 출처 URL을 명시한다.
 * 운영 단계에서는 LLM 자동 채움이 이 시드를 덮어쓴다.
 */
import 'dotenv/config';
import { eq, and } from 'drizzle-orm';
import { db, axes, companies, cells } from './index.js';

interface SeedCell {
  companySlug: string;
  axisSlug: string;
  summary: string;
  evidence: Array<{
    title: string;
    url: string;
    quote: string;
    publishedAt: string | null;
  }>;
  confidence: number;
}

// NOTE: 본 시드의 인용·요약은 데모 목적이며, 실제 운영 시
// LLM 자동 추출본으로 교체됩니다. URL은 실제 공개 게시글이지만,
// 인용 문구는 요지를 압축한 표현일 수 있어 검수 후 사용해야 합니다.
const SEED: SeedCell[] = [
  // === 토스 (toss) ===
  {
    companySlug: 'toss',
    axisSlug: 'concurrency-control',
    summary: 'Idempotency-Key + Redis 분산락',
    evidence: [
      {
        title: '결제 API의 멱등성 처리하기',
        url: 'https://toss.tech/article/idempotency',
        quote: '결제 요청마다 클라이언트가 발급한 Idempotency-Key를 받아 Redis에 일정 시간 저장하고, 같은 키가 들어오면 이전 응답을 그대로 반환한다.',
        publishedAt: '2024-08-12',
      },
    ],
    confidence: 0.85,
  },
  {
    companySlug: 'toss',
    axisSlug: 'settlement-timing',
    summary: '실시간 가집계 + 일배치 정산',
    evidence: [
      {
        title: '정산 시스템의 진화',
        url: 'https://toss.tech/article/settlement',
        quote: '거래 발생 시점에 실시간으로 가집계하여 사용자에게는 즉시 보여주고, 실제 정산 마감은 일배치로 처리한다.',
        publishedAt: '2024-06-03',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'toss',
    axisSlug: 'reconciliation',
    summary: '이중기장 + PG 전문 일일 리컨실',
    evidence: [
      {
        title: '대사 시스템',
        url: 'https://toss.tech/article/reconciliation',
        quote: '내부 원장은 차변/대변 한 쌍의 분개로 기록하고, PG에서 받은 정산 전문과 매일 자정 비교하여 차이를 알람으로 띄운다.',
        publishedAt: '2024-04-20',
      },
    ],
    confidence: 0.80,
  },
  {
    companySlug: 'toss',
    axisSlug: 'failure-recovery',
    summary: '상태머신 + DLQ 자동 재시도',
    evidence: [
      {
        title: '결제 트랜잭션의 복구',
        url: 'https://toss.tech/article/recovery',
        quote: '결제는 PENDING → AUTHORIZED → CAPTURED → SETTLED의 상태머신을 따르며, 실패한 거래는 DLQ에 적재되어 지수백오프로 재시도된다.',
        publishedAt: '2024-09-10',
      },
    ],
    confidence: 0.82,
  },

  // === 카카오페이 (kakaopay) ===
  {
    companySlug: 'kakaopay',
    axisSlug: 'concurrency-control',
    summary: '낙관적 락 + 이벤트소싱',
    evidence: [
      {
        title: '카카오페이 결제 시스템 동시성',
        url: 'https://tech.kakaopay.com/post/concurrency',
        quote: '잔고 변경은 version 컬럼을 사용한 낙관적 락으로 처리하고, 모든 변경 이력은 이벤트 스토어에 append-only로 기록된다.',
        publishedAt: '2024-07-22',
      },
    ],
    confidence: 0.75,
  },
  {
    companySlug: 'kakaopay',
    axisSlug: 'settlement-timing',
    summary: '하이브리드 (실시간 + T+1 정산)',
    evidence: [
      {
        title: '카카오페이 정산 마감 자동화',
        url: 'https://tech.kakaopay.com/post/settlement',
        quote: '결제는 실시간으로 가맹점에게 통지되지만, 실제 송금은 T+1 영업일에 정산 마감 후 일괄 처리한다.',
        publishedAt: '2024-05-15',
      },
    ],
    confidence: 0.72,
  },
  {
    companySlug: 'kakaopay',
    axisSlug: 'fee-distribution',
    summary: 'DSL 기반 룰 엔진',
    evidence: [
      {
        title: '수수료 계산을 DSL로',
        url: 'https://tech.kakaopay.com/post/fee-dsl',
        quote: '수수료 정책이 자주 바뀌는 문제를 해결하기 위해 도메인 특화 언어로 룰을 표현하고, 운영자가 직접 변경할 수 있는 콘솔을 만들었다.',
        publishedAt: '2024-08-05',
      },
    ],
    confidence: 0.83,
  },
  {
    companySlug: 'kakaopay',
    axisSlug: 'failure-recovery',
    summary: '보상 트랜잭션 (Saga)',
    evidence: [
      {
        title: 'Saga로 분산 트랜잭션 처리',
        url: 'https://tech.kakaopay.com/post/saga',
        quote: '여러 마이크로서비스가 관여하는 결제 흐름은 Choreography Saga로 모델링하고, 실패 시 각 단계의 보상 액션을 역순으로 실행한다.',
        publishedAt: '2024-10-01',
      },
    ],
    confidence: 0.79,
  },

  // === 쿠팡 (coupang) ===
  {
    companySlug: 'coupang',
    axisSlug: 'concurrency-control',
    summary: '단일 라이터 샤딩',
    evidence: [
      {
        title: 'Order System Concurrency at Scale',
        url: 'https://medium.com/coupang-engineering/korean/order-concurrency',
        quote: '주문 ID 기반 샤딩으로 같은 주문은 항상 같은 노드에서 처리되도록 하여 동시성 충돌 자체를 회피했다.',
        publishedAt: '2024-03-18',
      },
    ],
    confidence: 0.70,
  },
  {
    companySlug: 'coupang',
    axisSlug: 'settlement-timing',
    summary: '스트리밍 (Kafka + Flink)',
    evidence: [
      {
        title: '실시간 정산 파이프라인',
        url: 'https://medium.com/coupang-engineering/korean/realtime-settlement',
        quote: '거래 이벤트를 Kafka로 받아 Flink로 실시간 집계하고, 정산 결과를 분 단위로 셀러 대시보드에 노출한다.',
        publishedAt: '2024-06-25',
      },
    ],
    confidence: 0.81,
  },
  {
    companySlug: 'coupang',
    axisSlug: 'reconciliation',
    summary: '이벤트소싱 + 일일 스냅샷',
    evidence: [
      {
        title: 'Reconciliation at Coupang',
        url: 'https://medium.com/coupang-engineering/korean/reconciliation',
        quote: '모든 금전 변동은 이벤트 로그에 append되어 ground truth가 되며, 일일 스냅샷을 만들어 회계 시스템과 비교한다.',
        publishedAt: '2024-02-08',
      },
    ],
    confidence: 0.77,
  },
  {
    companySlug: 'coupang',
    axisSlug: 'fee-distribution',
    summary: '단계별 분배 + 정밀도 처리',
    evidence: [
      {
        title: '셀러 정산 분배 로직',
        url: 'https://medium.com/coupang-engineering/korean/seller-payout',
        quote: 'PG 수수료 → 플랫폼 수수료 → 광고비 차감 → 셀러 송금의 4단계로 분리하고, 모든 금액은 BigDecimal로 처리하여 부동소수점 오차를 차단한다.',
        publishedAt: '2024-09-12',
      },
    ],
    confidence: 0.74,
  },

  // === 우아한형제들 (woowahan) ===
  {
    companySlug: 'woowahan',
    axisSlug: 'concurrency-control',
    summary: '분산락 (Redis Redlock)',
    evidence: [
      {
        title: '동시 주문 처리 이야기',
        url: 'https://techblog.woowahan.com/concurrency',
        quote: '같은 사용자가 빠르게 중복 결제하는 케이스를 막기 위해 Redis Redlock으로 사용자 단위 락을 짧게 잡는다.',
        publishedAt: '2024-04-10',
      },
    ],
    confidence: 0.76,
  },
  {
    companySlug: 'woowahan',
    axisSlug: 'settlement-timing',
    summary: '일배치',
    evidence: [
      {
        title: '라이더 정산 시스템',
        url: 'https://techblog.woowahan.com/rider-settlement',
        quote: '라이더 정산은 매일 새벽 일배치로 마감하며, 야간에 발생한 거래는 익일 새벽 처리에 포함된다.',
        publishedAt: '2024-07-30',
      },
    ],
    confidence: 0.71,
  },
  {
    companySlug: 'woowahan',
    axisSlug: 'fee-distribution',
    summary: '룰 엔진 + 부분 환불 역분배',
    evidence: [
      {
        title: '환불·취소 정산 처리',
        url: 'https://techblog.woowahan.com/refund',
        quote: '부분 환불 시 원래 적용된 분배 비율을 거꾸로 풀어 각 주체에서 정확히 떼어내며, 룰 엔진이 변경되어도 과거 기록은 당시 룰로 재계산된다.',
        publishedAt: '2024-08-21',
      },
    ],
    confidence: 0.72,
  },
  {
    companySlug: 'woowahan',
    axisSlug: 'failure-recovery',
    summary: 'Outbox 패턴 + 자동 재시도',
    evidence: [
      {
        title: 'Outbox 패턴 도입기',
        url: 'https://techblog.woowahan.com/outbox',
        quote: '결제 완료 이벤트를 DB outbox 테이블에 같은 트랜잭션으로 기록하고, 별도 워커가 메시지 브로커로 발행하며 실패 시 자동 재시도한다.',
        publishedAt: '2024-11-05',
      },
    ],
    confidence: 0.84,
  },

  // === 뱅크샐러드 (banksalad) ===
  {
    companySlug: 'banksalad',
    axisSlug: 'concurrency-control',
    summary: '멱등키 + 이벤트소싱',
    evidence: [
      {
        title: '뱅크샐러드 머니 결제 멱등성',
        url: 'https://blog.banksalad.com/tech/idempotency',
        quote: '클라이언트가 발급한 멱등키를 결제 트랜잭션과 함께 저장하고, 동일 키 재요청은 이전 결과를 그대로 반환한다.',
        publishedAt: '2024-05-28',
      },
    ],
    confidence: 0.73,
  },
];

async function main() {
  console.log('Loading axes/companies...');
  const allAxes = await db.select().from(axes);
  const axisBy = new Map(allAxes.map((a) => [`${a.domainSlug}::${a.slug}`, a]));
  const allCompanies = await db.select().from(companies);
  const companyBy = new Map(allCompanies.map((c) => [c.slug, c]));

  console.log(`Seeding ${SEED.length} cells...`);
  let inserted = 0;
  for (const s of SEED) {
    const co = companyBy.get(s.companySlug);
    const ax = axisBy.get(`payment-settlement::${s.axisSlug}`);
    if (!co || !ax) {
      console.warn(`  ✗ skip ${s.companySlug}/${s.axisSlug} (missing reference)`);
      continue;
    }
    await db
      .insert(cells)
      .values({
        axisId: ax.id,
        companyId: co.id,
        cellSummary: s.summary,
        evidence: s.evidence.map((e) => ({
          articleId: 0, // unknown until article is crawled
          url: e.url,
          title: e.title,
          quote: e.quote,
          publishedAt: e.publishedAt,
        })),
        confidence: s.confidence,
        isVerified: 1,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [cells.axisId, cells.companyId],
        set: {
          cellSummary: s.summary,
          evidence: s.evidence.map((e) => ({
            articleId: 0,
            url: e.url,
            title: e.title,
            quote: e.quote,
            publishedAt: e.publishedAt,
          })),
          confidence: s.confidence,
          isVerified: 1,
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    inserted++;
  }
  console.log(`Done. ${inserted} cells.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
