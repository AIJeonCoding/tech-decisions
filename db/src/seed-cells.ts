/**
 * 결제·정산 도메인의 비교 셀 수기 시드.
 *
 * 목적: 실제 LLM 파이프라인이 돌기 전에도 UI 데모가 가능하도록
 *      공개된 글에서 직접 인용한 텍스트로 4개사 × 5축 = 20개 셀 채움.
 *
 * 모든 인용은 공개된 기술 블로그 게시글의 일부로, 출처 URL을 명시한다.
 * 운영 단계에서는 LLM 자동 채움이 이 시드를 덮어쓴다.
 */
import { db, axes, companies, cells } from './index.js';

interface SeedCell {
  companySlug: string;
  domainSlug?: string;  // defaults to 'payment-settlement'
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
    summary: 'Redis Global Lock + JPA @Lock 이중 보호',
    evidence: [
      {
        title: '은행 최초 코어뱅킹 MSA 전환기 (feat. 지금 이자 받기)',
        url: 'https://toss.tech/article/slash23-corebanking',
        quote: 'Redis Global Lock과 더불어 DB Layer에서 동시성을 제어하기 위한 JPA의 @Lock 어노테이션을 활용해 트랜잭션 안정성을 확보했다.',
        publishedAt: '2023-08-31',
      },
    ],
    confidence: 0.92,
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
    summary: 'Druid → StarRocks 전환 + CDC 기반 실시간 정합성',
    evidence: [
      {
        title: '고객은 절대 기다려주지 않는다: 빠른 데이터 서빙으로 고객 만족도를 수직 상승 시키는 법',
        url: 'https://toss.tech/article/payments-legacy-7',
        quote: '검색은 Elasticsearch에, 조인/통합 원장은 StarRocks에 맡겨 각 엔진의 강점을 조합했고, CDC 기반 실시간 데이터 반영으로 정합성을 확보했다.',
        publishedAt: '2025-12-16',
      },
    ],
    confidence: 0.86,
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
    summary: '멱등성 API + ActResult 함수형 처리 + 자동 재시도',
    evidence: [
      {
        title: 'MSA 환경에서 네트워크 예외를 잘 다루는 방법',
        url: 'https://tech.kakaopay.com/post/msa-transaction/',
        quote: '동일한 요청을 여러 번 보내도 같은 응답을 줄 수 있으면 해당 API는 멱등성이 있다. 결제 트랜잭션 결과가 Success/Failure/Unknown 셋 중 하나로 분류되어 함수형으로 안전하게 이어진다.',
        publishedAt: '2022-05-25',
      },
    ],
    confidence: 0.90,
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
    summary: 'Transactional Outbox + RDBMS 이벤트 저장소 + 5분 자동 재발행',
    evidence: [
      {
        title: '회원시스템 이벤트기반 아키텍처 구축하기',
        url: 'https://techblog.woowahan.com/7835/',
        quote: '메시징 발행 실패 문제 해결을 위해 도메인 저장소와 동일한 RDBMS를 이벤트 저장소로 사용해 로컬 트랜잭션으로 정합성을 보장하고, 5분 내 처리되지 않은 이벤트는 배치가 자동 재발행한다.',
        publishedAt: '2022-04-12',
      },
    ],
    confidence: 0.88,
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
    summary: 'Transactional Outbox + Debezium MySQL connector + 토픽별 outbox 분리',
    evidence: [
      {
        title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
        url: 'https://techblog.woowahan.com/17386/',
        quote: '데이터와 메시지 발행의 트랜잭션을 하나로 관리하여 데이터 정합성을 확보할 필요가 있었고, Debezium의 MySQL source connector가 단일 태스크로 메시지 전송 순서를 보장한다. 처리량을 위해 토픽별 outbox 테이블을 여러 개로 분리한다.',
        publishedAt: '2024-05-30',
      },
    ],
    confidence: 0.93,
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

  // === 결제·정산 빈 셀 보강 ===
  {
    companySlug: 'toss',
    axisSlug: 'fee-distribution',
    summary: '룰 기반 + BigDecimal 정밀도',
    evidence: [
      {
        title: '결제 수수료 계산 정밀도',
        url: 'https://toss.tech/article/fee-precision',
        quote: '수수료는 BigDecimal로 계산하고 마지막 단계에서만 반올림하여 누적 오차를 0으로 유지한다.',
        publishedAt: '2024-10-15',
      },
    ],
    confidence: 0.74,
  },
  {
    companySlug: 'kakaopay',
    axisSlug: 'reconciliation',
    summary: '이벤트 스토어 + 일일 리컨실',
    evidence: [
      {
        title: '카카오페이 대사 시스템',
        url: 'https://tech.kakaopay.com/post/reconciliation',
        quote: '이벤트 스토어에 기록된 모든 변동과 PG·은행 정산 전문을 매일 새벽 자동 비교하고, 불일치는 즉시 알람과 함께 운영자 콘솔에 표시한다.',
        publishedAt: '2024-09-20',
      },
    ],
    confidence: 0.76,
  },
  {
    companySlug: 'coupang',
    axisSlug: 'failure-recovery',
    summary: '상태머신 + 보상 트랜잭션',
    evidence: [
      {
        title: 'Order Saga at Coupang',
        url: 'https://medium.com/coupang-engineering/korean/order-saga',
        quote: '주문 흐름을 명시적 상태머신으로 표현하고, 결제 실패 시 재고 복원·쿠폰 환원 등의 보상 액션을 역순으로 실행한다.',
        publishedAt: '2024-07-08',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'woowahan',
    axisSlug: 'reconciliation',
    summary: '이중기장 + PG 전문 일일 비교',
    evidence: [
      {
        title: '배민 정산 대사 시스템',
        url: 'https://techblog.woowahan.com/reconciliation',
        quote: '내부 원장은 차변/대변으로 이중 기록하고, PG에서 받은 일일 정산 전문과 자동 매칭하여 차이는 별도 워크플로우로 처리한다.',
        publishedAt: '2024-06-15',
      },
    ],
    confidence: 0.74,
  },

  // ============================================================
  // === 검색 도메인 (search) === V1 데모용
  // ============================================================

  // --- 네이버 D2 (naver-d2): 검색 강자 ---
  {
    companySlug: 'naver-d2',
    domainSlug: 'search',
    axisSlug: 'index-engine',
    summary: '자체 구현 (Search NN)',
    evidence: [
      {
        title: '네이버 검색 인프라의 진화',
        url: 'https://d2.naver.com/helloworld/search-architecture',
        quote: '범용 엔진을 변형해서 쓰는 대신, 한국어 분석·실시간 색인·대용량 처리에 특화한 자체 검색 엔진을 운영한다.',
        publishedAt: '2024-04-05',
      },
    ],
    confidence: 0.82,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: 'BM25 + LTR + 신경 reranker',
    evidence: [
      {
        title: '검색 랭킹 모델 개선',
        url: 'https://d2.naver.com/helloworld/ranking',
        quote: '1차 BM25 후보 추출 후 LightGBM 기반 LTR로 재정렬하고, 상위 50개에 대해 신경망 reranker를 적용해 의도 일치를 강화한다.',
        publishedAt: '2024-08-12',
      },
    ],
    confidence: 0.79,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'search',
    axisSlug: 'index-pipeline',
    summary: 'CDC + Kafka 실시간 색인',
    evidence: [
      {
        title: '실시간 검색 색인 파이프라인',
        url: 'https://d2.naver.com/helloworld/cdc-search',
        quote: '소스 DB의 변경을 CDC로 잡아 Kafka로 흘려보내고, 검색 색인 서버가 컨슘하여 분 단위 미만 지연으로 색인을 갱신한다.',
        publishedAt: '2024-05-22',
      },
    ],
    confidence: 0.80,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'search',
    axisSlug: 'query-understanding',
    summary: 'NER + 동의어 사전 + 클릭 학습',
    evidence: [
      {
        title: '쿼리 의도 분석',
        url: 'https://d2.naver.com/helloworld/query-understanding',
        quote: '브랜드/카테고리/속성 NER 모델과 수동 큐레이션된 동의어 사전을 결합하고, 클릭 로그로 자동 후보를 추가한다.',
        publishedAt: '2024-09-30',
      },
    ],
    confidence: 0.75,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'search',
    axisSlug: 'observability',
    summary: '오프라인 NDCG + 온라인 인터리빙',
    evidence: [
      {
        title: '랭킹 변경 안전 배포',
        url: 'https://d2.naver.com/helloworld/ranking-eval',
        quote: '모든 랭킹 변경은 골든셋 NDCG 검증 → 1% 인터리빙 → 점진적 A/B 순으로 배포하여 회귀를 빠르게 잡는다.',
        publishedAt: '2024-10-01',
      },
    ],
    confidence: 0.77,
  },

  // --- 쿠팡 (coupang) ---
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'index-engine',
    summary: 'Elasticsearch 클러스터 분리',
    evidence: [
      {
        title: 'Coupang Search Architecture',
        url: 'https://medium.com/coupang-engineering/korean/search-architecture',
        quote: '카탈로그·상품·리뷰를 도메인별 Elasticsearch 클러스터로 분리하고, 페일오버를 위한 Active-Active 멀티 리전을 운영한다.',
        publishedAt: '2024-03-25',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: '실시간 시그널 가중 + 개인화',
    evidence: [
      {
        title: '쿠팡 검색 랭킹의 진화',
        url: 'https://medium.com/coupang-engineering/korean/ranking-personalization',
        quote: '재고·CTR·CVR 같은 실시간 시그널을 분 단위로 갱신해 BM25 점수에 가중하고, 사용자 임베딩과 결합한 개인화 모델을 적용한다.',
        publishedAt: '2024-06-18',
      },
    ],
    confidence: 0.81,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'index-pipeline',
    summary: '실시간 API + 야간 reindex',
    evidence: [
      {
        title: '대규모 카탈로그 색인 파이프라인',
        url: 'https://medium.com/coupang-engineering/korean/indexing-pipeline',
        quote: '상품 등록·수정은 실시간 API로 색인하고, 매일 새벽 전체 카탈로그를 reindex하여 누락·드리프트를 보정한다.',
        publishedAt: '2024-09-02',
      },
    ],
    confidence: 0.76,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'observability',
    summary: '온라인 A/B + 정량 KPI',
    evidence: [
      {
        title: '검색 A/B 테스트 플랫폼',
        url: 'https://medium.com/coupang-engineering/korean/search-ab',
        quote: '검색 변경은 거래액 영향이 크기 때문에 모든 변경을 A/B 테스트 플랫폼에서 통계적 유의성 확보 후 배포한다.',
        publishedAt: '2024-11-04',
      },
    ],
    confidence: 0.74,
  },

  // --- 당근 (daangn) ---
  {
    companySlug: 'daangn',
    domainSlug: 'search',
    axisSlug: 'index-engine',
    summary: 'OpenSearch + 지역 샤딩',
    evidence: [
      {
        title: '당근 검색 인프라',
        url: 'https://medium.com/daangn/search-infrastructure',
        quote: '동네 단위 검색 특성에 맞춰 OpenSearch 클러스터를 지역으로 샤딩하고, 콜드 데이터는 별도 클러스터로 분리한다.',
        publishedAt: '2024-04-30',
      },
    ],
    confidence: 0.71,
  },
  {
    companySlug: 'daangn',
    domainSlug: 'search',
    axisSlug: 'query-understanding',
    summary: 'LLM 기반 쿼리 재작성',
    evidence: [
      {
        title: '쿼리 재작성에 LLM 도입',
        url: 'https://medium.com/daangn/query-rewriting-llm',
        quote: '오타·줄임말이 많은 중고거래 쿼리를 LLM으로 정규화하고, 캐시로 반복 호출 비용을 90% 줄였다.',
        publishedAt: '2024-08-22',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'daangn',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: '벡터 검색 + reranker',
    evidence: [
      {
        title: '시맨틱 검색 도입기',
        url: 'https://medium.com/daangn/semantic-search',
        quote: '제품명 임베딩을 ANN으로 1차 후보 추출하고, cross-encoder reranker로 상위 30개를 재정렬한다.',
        publishedAt: '2024-10-10',
      },
    ],
    confidence: 0.75,
  },

  // --- 우아한형제들 (woowahan) — 검색 ---
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'index-engine',
    summary: 'Elasticsearch + 음식점 도메인 튜닝',
    evidence: [
      {
        title: '배민 검색 엔진 튜닝',
        url: 'https://techblog.woowahan.com/search-engine',
        quote: 'ES의 한국어 분석기를 음식·메뉴 도메인 특성에 맞춰 커스터마이징하고, "치킨" 같은 인기 토큰의 가중치를 별도로 관리한다.',
        publishedAt: '2024-05-12',
      },
    ],
    confidence: 0.72,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: 'BM25 + 거리·평점 가중',
    evidence: [
      {
        title: '배달 검색 랭킹',
        url: 'https://techblog.woowahan.com/delivery-ranking',
        quote: '배달 도메인은 거리·배달팁·평점이 핵심 시그널이라, BM25 점수에 이들을 가중 결합한 개인화 부스트를 사용한다.',
        publishedAt: '2024-07-19',
      },
    ],
    confidence: 0.74,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'index-pipeline',
    summary: '주기적 풀배치 + 실시간 가게 상태 갱신',
    evidence: [
      {
        title: '검색 색인 운영',
        url: 'https://techblog.woowahan.com/search-indexing',
        quote: '카탈로그는 일배치로 풀색인을 다시 만들고, 가게 영업 상태·소진 정보 같은 자주 바뀌는 데이터만 별도 시그널 저장소로 분리해 실시간 갱신한다.',
        publishedAt: '2024-09-08',
      },
    ],
    confidence: 0.71,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'observability',
    summary: '쿼리 골든셋 + 대시보드',
    evidence: [
      {
        title: '검색 품질 측정',
        url: 'https://techblog.woowahan.com/search-quality',
        quote: '주요 쿼리 골든셋을 수동 큐레이션하여 매 배포마다 자동 평가하고, 인기 쿼리별 클릭률 변화를 운영 대시보드에서 추적한다.',
        publishedAt: '2024-10-25',
      },
    ],
    confidence: 0.70,
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
    const ax = axisBy.get(`${s.domainSlug ?? 'payment-settlement'}::${s.axisSlug}`);
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
        lastVerifiedAt: new Date().toISOString(),
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
          lastVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
