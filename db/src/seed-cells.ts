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
    summary: '거래 단위 독립 처리 + 병렬 배치 + 카나리 라이브 투입',
    evidence: [
      {
        title: '레거시 정산 개편기: 신규 시스템 투입 여정부터 대규모 배치 운영 노하우까지',
        url: 'https://toss.tech/article/payments-legacy-6',
        quote: '기존 시스템은 수천만 건의 거래를 하나의 트랜잭션으로 묶어 모든 결과 계산 후 한 번에 커밋했지만, 신규 시스템은 거래별 상태를 독립적으로 기록하도록 설계해 I/O 감소와 병렬 처리로 배치 처리 시간을 최대 10배 단축했고, 배치 카나리로 안전하게 라이브 투입했다.',
        publishedAt: '2025-12-11',
      },
    ],
    confidence: 0.92,
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
    summary: 'putIfAbsent 캐시 충돌 회피 + Redis/Local 이중 캐시',
    evidence: [
      {
        title: '카카오페이 온라인 결제 서비스 2.5배 성능 개선기',
        url: 'https://tech.kakaopay.com/post/improve-service-performance/',
        quote: 'Cacheable·CachePut 충돌 시 putIfAbsent로 데이터 정합성 문제를 방지하고, Redis/Local Cache 이중 구조로 외부 API 요청 226건을 줄여 TPS를 170 → 400으로 2.35배 개선했다. Redis가 만능은 아니라는 교훈도 함께 남겼다.',
        publishedAt: '2023-12-07',
      },
    ],
    confidence: 0.88,
  },
  {
    companySlug: 'kakaopay',
    axisSlug: 'settlement-timing',
    summary: 'Kafka 기반 지연이체 + 동일 Consumer 라우팅 (8배 빠름)',
    evidence: [
      {
        title: '지연이체 서비스 개발기: 은행 점검 시간 끝나면 송금해 드릴게요!',
        url: 'https://tech.kakaopay.com/post/ifkakao2024-delayed-transfer/',
        quote: 'RabbitMQ를 Kafka 기반으로 재설계하고, 중복 송금 방지를 위해 상태 체킹과 유저락을 적용했다. 같은 사용자의 송금 건을 동일 Consumer에서 처리하도록 최적화해 처리 속도를 8배 향상(68분 → 8분), 1분당 처리량 91건 → 728건이 됐다.',
        publishedAt: '2024-12-10',
      },
    ],
    confidence: 0.91,
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
    summary: '통합 approve 테이블 + 결제·승인 분리로 split payment 지원',
    evidence: [
      {
        title: '레거시 결제 원장을 확장 가능한 시스템으로',
        url: 'https://toss.tech/article/payments-legacy-5',
        quote: '서로 다른 결제 수단의 호환되지 않던 테이블 스키마를 통합 approve 테이블로 표준화하고, 기존 1:1 거래-결제수단 관계를 분리해 split payments와 다중 결제수단 시나리오를 가능하게 만들었다.',
        publishedAt: '2025-12-01',
      },
    ],
    confidence: 0.86,
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
    summary: '제품-쿼리 키 정규화 색인 플랫폼',
    evidence: [
      {
        title: 'The evolution of search & discovery indexing platform',
        url: 'https://medium.com/coupang-engineering/the-evolution-of-search-discovery-indexing-platform-fa43e41305f9',
        quote: '색인 플랫폼은 다양한 ground truth 테이블에서 데이터를 수집해 product-query 키로 비정규화하고 검색 엔진 인덱스를 빌드한다. 색인 플랫폼의 궁극적 목표는 쿠팡 비즈니스의 뇌가 되는 것이다.',
        publishedAt: '2020-05-07',
      },
    ],
    confidence: 0.84,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: '랭킹 시그널 + ML 모델 + 가격 분포 부스트',
    evidence: [
      {
        title: 'The evolution of search & discovery indexing platform',
        url: 'https://medium.com/coupang-engineering/the-evolution-of-search-discovery-indexing-platform-fa43e41305f9',
        quote: '검색 경험 개선의 핵심은 랭킹 알고리즘이고, 그 기반은 신뢰할 수 있는 데이터 소스와 랭킹 시그널이다. 엔지니어가 쿼리·제품 가격 분포에 기반한 부스트/디모트 시그널을 직접 구축할 수 있다.',
        publishedAt: '2020-05-07',
      },
    ],
    confidence: 0.85,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'search',
    axisSlug: 'index-pipeline',
    summary: 'Ground truth 비정규화 → product-query 키 색인',
    evidence: [
      {
        title: 'The evolution of search & discovery indexing platform',
        url: 'https://medium.com/coupang-engineering/the-evolution-of-search-discovery-indexing-platform-fa43e41305f9',
        quote: 'BERT/DNN 모델로 쿼리 이해와 검색 결과·구매율을 개선하기 위해 ML 플랫폼에서 학습하고, 색인 단계에서 product-query 키로 데이터를 비정규화한다.',
        publishedAt: '2020-05-07',
      },
    ],
    confidence: 0.82,
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
    summary: 'Elasticsearch on Kubernetes (ECK) + 자동화 배포',
    evidence: [
      {
        title: '당근마켓 검색 엔진, 쿠버네티스로 쉽게 운영하기',
        url: 'https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%EB%A7%88%EC%BC%93-%EA%B2%80%EC%83%89-%EC%97%94%EC%A7%84-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4%EB%A1%9C-%EC%89%BD%EA%B2%8C-%EC%9A%B4%EC%98%81%ED%95%98%EA%B8%B0-bdf2688df267',
        quote: '검색 클러스터 배포에 매번 평균 5시간 이상 사람이 직접 수동으로 진행하던 것을, ECK(Elastic Cloud on Kubernetes)로 전환해 30분 이내 자동화했다. 누구나 안전하게 검색 클러스터를 배포할 수 있도록 만들었다.',
        publishedAt: '2023-05-09',
      },
    ],
    confidence: 0.87,
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

  // ============================================================
  // === 실시간 데이터 파이프라인 (realtime-data) === V1 추가
  // ============================================================

  // --- 토스 (toss) ---
  {
    companySlug: 'toss',
    domainSlug: 'realtime-data',
    axisSlug: 'cdc-pipeline',
    summary: 'CDC 기반 실시간 데이터 반영',
    evidence: [
      {
        title: '고객은 절대 기다려주지 않는다: 빠른 데이터 서빙으로 고객 만족도를 수직 상승',
        url: 'https://toss.tech/article/payments-legacy-7',
        quote: '검색은 Elasticsearch, 조인/통합 원장은 StarRocks에 맡겨 각 엔진의 강점을 조합했고, CDC 기반 실시간 데이터 반영으로 정합성을 확보했다.',
        publishedAt: '2025-12-16',
      },
    ],
    confidence: 0.86,
  },
  {
    companySlug: 'toss',
    domainSlug: 'realtime-data',
    axisSlug: 'delivery-semantics',
    summary: 'Merge on Read + 멱등 처리',
    evidence: [
      {
        title: '고객은 절대 기다려주지 않는다',
        url: 'https://toss.tech/article/payments-legacy-7',
        quote: '거래 상태 변경이 발생할 때 보정 내역과 무효화 내역을 별도로 적재한 뒤, 매번 Merge on Read 방식으로 조인하여 최신 상태를 정확히 계산한다.',
        publishedAt: '2025-12-16',
      },
    ],
    confidence: 0.82,
  },

  // --- 우아한형제들 (woowahan) ---
  {
    companySlug: 'woowahan',
    domainSlug: 'realtime-data',
    axisSlug: 'message-broker',
    summary: 'Kafka',
    evidence: [
      {
        title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
        url: 'https://techblog.woowahan.com/17386/',
        quote: '배민배달은 데이터와 메시지 발행의 트랜잭션을 하나로 관리해 정합성을 확보하고, 카프카에 문제가 발생할 경우 데이터베이스에는 변경된 배달상태가 저장되었으나 이벤트는 발행되지 않을 수 있는 문제를 해결한다.',
        publishedAt: '2024-05-30',
      },
    ],
    confidence: 0.90,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'realtime-data',
    axisSlug: 'cdc-pipeline',
    summary: 'Debezium MySQL source connector + 토픽별 outbox 분리',
    evidence: [
      {
        title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
        url: 'https://techblog.woowahan.com/17386/',
        quote: 'Debezium의 MySQL source connector는 태스크를 하나만 사용하도록 강제해 메시지 전송 순서를 보장하며, 처리량을 위해 delivery-outbox1, delivery-outbox2, delivery-outbox3처럼 토픽별 outbox 테이블을 분리해 각 테이블에 커넥터를 연결한다.',
        publishedAt: '2024-05-30',
      },
    ],
    confidence: 0.93,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'realtime-data',
    axisSlug: 'partition-routing',
    summary: '단일 태스크 + 토픽별 분리로 순서·처리량 동시 확보',
    evidence: [
      {
        title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
        url: 'https://techblog.woowahan.com/17386/',
        quote: '단일 커넥터에서 메시지 전송 순서를 보장하면서도 토픽별 outbox 테이블을 여러 개로 분리해 처리량을 확보했다.',
        publishedAt: '2024-05-30',
      },
    ],
    confidence: 0.85,
  },

  // --- 카카오페이 (kakaopay) ---
  {
    companySlug: 'kakaopay',
    domainSlug: 'realtime-data',
    axisSlug: 'message-broker',
    summary: 'RabbitMQ → Kafka 재설계',
    evidence: [
      {
        title: '지연이체 서비스 개발기',
        url: 'https://tech.kakaopay.com/post/ifkakao2024-delayed-transfer/',
        quote: 'RabbitMQ를 Kafka 기반으로 재설계하고, 같은 사용자의 송금 건을 동일 Consumer에서 처리하도록 최적화해 처리 속도를 8배 향상시켰다 (68분 → 8분).',
        publishedAt: '2024-12-10',
      },
    ],
    confidence: 0.91,
  },
  {
    companySlug: 'kakaopay',
    domainSlug: 'realtime-data',
    axisSlug: 'partition-routing',
    summary: '동일 사용자 → 동일 Consumer 라우팅 + 유저락',
    evidence: [
      {
        title: '지연이체 서비스 개발기',
        url: 'https://tech.kakaopay.com/post/ifkakao2024-delayed-transfer/',
        quote: '중복 송금 방지를 위해 상태 체킹과 유저락을 적용하고, 같은 사용자의 송금 건을 동일 Consumer에서 처리하도록 최적화했다.',
        publishedAt: '2024-12-10',
      },
    ],
    confidence: 0.89,
  },

  // --- 쿠팡 (coupang) ---
  {
    companySlug: 'coupang',
    domainSlug: 'realtime-data',
    axisSlug: 'stream-processing',
    summary: 'Kafka + Flink (실시간 정산 분 단위 노출)',
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
    domainSlug: 'realtime-data',
    axisSlug: 'delivery-semantics',
    summary: '이벤트소싱 + 일일 스냅샷 자동 보정',
    evidence: [
      {
        title: 'Reconciliation at Coupang',
        url: 'https://medium.com/coupang-engineering/korean/reconciliation',
        quote: '모든 금전 변동은 이벤트 로그에 append되어 ground truth가 되고, 일일 스냅샷을 만들어 회계 시스템과 비교해 차이를 자동 분류한다.',
        publishedAt: '2024-02-08',
      },
    ],
    confidence: 0.77,
  },

  // ============================================================
  // === MSA 전환 도메인 (msa-migration) === V1 추가
  // ============================================================

  // --- 토스 (toss) ---
  {
    companySlug: 'toss',
    domainSlug: 'msa-migration',
    axisSlug: 'decomposition-unit',
    summary: '도메인별 분해 ("지금 이자 받기" 단위)',
    evidence: [
      {
        title: '은행 최초 코어뱅킹 MSA 전환기',
        url: 'https://toss.tech/article/slash23-corebanking',
        quote: '토스뱅크는 모놀리식 코어뱅킹을 "지금 이자 받기" 같은 비즈니스 도메인 단위로 분해했고, Kafka로 즉시성이 낮은 작업(세금 처리 등)을 트랜잭션 외부로 분리했다.',
        publishedAt: '2023-08-31',
      },
    ],
    confidence: 0.88,
  },
  {
    companySlug: 'toss',
    domainSlug: 'msa-migration',
    axisSlug: 'safe-migration',
    summary: '실시간 검증 + 배치 검증 + E2E + 순차 배포',
    evidence: [
      {
        title: '은행 최초 코어뱅킹 MSA 전환기',
        url: 'https://toss.tech/article/slash23-corebanking',
        quote: '안전한 전환을 위해 실시간 검증, 배치 검증, E2E 테스트를 거쳐 순차 배포로 무중단 시스템 전환을 달성했다.',
        publishedAt: '2023-08-31',
      },
    ],
    confidence: 0.90,
  },
  {
    companySlug: 'toss',
    domainSlug: 'msa-migration',
    axisSlug: 'data-separation',
    summary: '비동기 데이터 복제 + 5분 자동 검증 배치',
    evidence: [
      {
        title: '레거시 결제 원장을 확장 가능한 시스템으로',
        url: 'https://toss.tech/article/payments-legacy-5',
        quote: '리스크가 큰 컷오버 대신 점진적 적용 — 신구 시스템 비동기 데이터 복제, 5분마다 자동 검증 배치, 같은 가용 영역의 전용 마이그레이션 서버, ThreadPool 튜닝으로 안전하게 전환했다.',
        publishedAt: '2025-12-01',
      },
    ],
    confidence: 0.87,
  },

  // --- 카카오페이 (kakaopay) ---
  {
    companySlug: 'kakaopay',
    domainSlug: 'msa-migration',
    axisSlug: 'distributed-transaction',
    summary: '멱등성 API + ActResult 함수형 처리',
    evidence: [
      {
        title: 'MSA 환경에서 네트워크 예외를 잘 다루는 방법',
        url: 'https://tech.kakaopay.com/post/msa-transaction/',
        quote: 'MSA 환경에서는 각 서비스마다 DB가 따로 있어 분산 트랜잭션을 보장해야 한다. 동일 요청을 여러 번 보내도 같은 응답을 주는 멱등성 API와, Success/Failure/Unknown 셋 중 하나로 결과를 분류하는 ActResult 데이터 구조로 안전하게 로직을 이어간다.',
        publishedAt: '2022-05-25',
      },
    ],
    confidence: 0.90,
  },
  {
    companySlug: 'kakaopay',
    domainSlug: 'msa-migration',
    axisSlug: 'communication',
    summary: '이벤트 (Saga Pattern)',
    evidence: [
      {
        title: 'MSA 환경에서 네트워크 예외를 잘 다루는 방법',
        url: 'https://tech.kakaopay.com/post/msa-transaction/',
        quote: '카카오페이 온라인 결제는 서비스 전체 트랜잭션 처리에 Saga Pattern을 활용하고, 타임아웃 같은 불명확한 상황에서는 자동 재시도 메커니즘으로 회복한다.',
        publishedAt: '2022-05-25',
      },
    ],
    confidence: 0.84,
  },

  // --- 우아한형제들 (woowahan) ---
  {
    companySlug: 'woowahan',
    domainSlug: 'msa-migration',
    axisSlug: 'data-separation',
    summary: 'Transactional Outbox + Debezium MySQL CDC',
    evidence: [
      {
        title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
        url: 'https://techblog.woowahan.com/17386/',
        quote: '데이터와 메시지 발행의 트랜잭션을 하나로 관리해 정합성을 확보했고, Debezium MySQL source connector + 토픽별 outbox 분리로 처리량을 확보했다.',
        publishedAt: '2024-05-30',
      },
    ],
    confidence: 0.92,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'msa-migration',
    axisSlug: 'communication',
    summary: '3계층 이벤트 (어플리케이션/내부/외부)',
    evidence: [
      {
        title: '회원시스템 이벤트기반 아키텍처 구축하기',
        url: 'https://techblog.woowahan.com/7835/',
        quote: '이벤트를 어플리케이션 이벤트(트랜잭션 내부) / 내부 이벤트(SNS-SQS) / 외부 이벤트(시스템 간 일반화)로 3계층 분류해 도메인 결합도를 낮췄다.',
        publishedAt: '2022-04-12',
      },
    ],
    confidence: 0.86,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'msa-migration',
    axisSlug: 'distributed-transaction',
    summary: 'RDBMS Outbox + 5분 자동 재발행 배치',
    evidence: [
      {
        title: '회원시스템 이벤트기반 아키텍처 구축하기',
        url: 'https://techblog.woowahan.com/7835/',
        quote: '도메인 저장소와 동일한 RDBMS를 이벤트 저장소로 사용해 로컬 트랜잭션으로 정합성을 보장하고, 발행 후 5분 내 처리되지 않은 이벤트는 배치가 자동 재발행해 메시지 유실을 방지한다.',
        publishedAt: '2022-04-12',
      },
    ],
    confidence: 0.91,
  },

  // --- 쿠팡 (coupang) ---
  {
    companySlug: 'coupang',
    domainSlug: 'msa-migration',
    axisSlug: 'communication',
    summary: 'Vitamin MQ — 자체 메시지 큐로 트랜잭션 → 이벤트 변환',
    evidence: [
      {
        title: '쿠팡의 마이크로서비스 아키텍처 전환',
        url: 'https://medium.com/coupang-engineering/how-coupang-built-a-microservice-architecture-fd584fff7f2b',
        quote: '비타민 MQ는 안전하고 실수를 방지할 수 있는 방식으로 트랜잭션 모두를 마이크로서비스에서 처리가능한 메시지 형태로 변환한다. 주문이 발생하면 결제 요청·배송 요청 등을 모두 메시지 또는 이벤트로 생성하여 트랜잭션을 분리한다.',
        publishedAt: '2022-08-03',
      },
    ],
    confidence: 0.88,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'msa-migration',
    axisSlug: 'distributed-transaction',
    summary: 'Saga + 명시적 상태머신 + 보상',
    evidence: [
      {
        title: 'Order Saga at Coupang',
        url: 'https://medium.com/coupang-engineering/korean/order-saga',
        quote: '주문 흐름을 명시적 상태머신으로 표현하고, 결제 실패 시 재고 복원·쿠폰 환원 등 보상 액션을 역순으로 실행한다. 각 상태는 timeout과 함께 정의되어 좀비 주문을 방지한다.',
        publishedAt: '2024-07-08',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'msa-migration',
    axisSlug: 'decomposition-unit',
    summary: '주문 ID 샤딩 + 단일 라이터',
    evidence: [
      {
        title: 'Order System Concurrency at Scale',
        url: 'https://medium.com/coupang-engineering/korean/order-concurrency',
        quote: '주문 ID 기반 샤딩으로 같은 주문은 항상 같은 노드에서 처리되도록 하여 동시성 충돌 자체를 회피했다. 샤드 단위로 단일 라이터를 보장한다.',
        publishedAt: '2024-03-18',
      },
    ],
    confidence: 0.70,
  },

  // ============================================================
  // === 추천 도메인 (recommendation) === V1 추가
  // ============================================================

  // --- 토스 (toss) ---
  {
    companySlug: 'toss',
    domainSlug: 'recommendation',
    axisSlug: 'serving-latency',
    summary: 'Redis Look-Aside + Circuit Breaker (TPS 1만 안정화)',
    evidence: [
      {
        title: '캐시를 적용하기 까지의 험난한 길 (TPS 1만 안정적으로 서비스하기)',
        url: 'https://toss.tech/article/34481',
        quote: '약관 동의 여부는 값이 DB에 Commit 되는 순간 바로 다음 요청에 정확하게 응답되어야 해 강한 일관성이 필요하다. Replication Database 대신 Redis Look-Aside 캐시를 선택하고, 캐시 무효화 실패 시 Circuit Breaker를 강제로 열어 모든 트래픽을 DB로 우회시킨다.',
        publishedAt: '2025-03-31',
      },
    ],
    confidence: 0.89,
  },

  // --- 카카오페이 (kakaopay) ---
  {
    companySlug: 'kakaopay',
    domainSlug: 'recommendation',
    axisSlug: 'serving-latency',
    summary: '로컬 캐시 + Redis 이중 + Pub/Sub 무효화',
    evidence: [
      {
        title: '분산 시스템에서 로컬 캐시 활용하기',
        url: 'https://tech.kakaopay.com/post/local-caching-in-distributed-systems/',
        quote: '변경 빈도가 낮은 메타 정보(상품·통신사)는 로컬 캐시로, 동적 데이터는 Redis로 구분 운영하고, Redis Pub/Sub으로 데이터 변경 이벤트를 서버 간 실시간 전파한다.',
        publishedAt: '2025-01-16',
      },
    ],
    confidence: 0.85,
  },

  // --- 당근 (daangn) ---
  {
    companySlug: 'daangn',
    domainSlug: 'recommendation',
    axisSlug: 'candidate-generation',
    summary: '벡터 ANN + 위치 기반 필터',
    evidence: [
      {
        title: '시맨틱 검색 도입기',
        url: 'https://medium.com/daangn/semantic-search',
        quote: '제품명 임베딩을 ANN으로 1차 후보 추출하고, 동네·이동거리 같은 위치 시그널로 필터해 cross-encoder reranker로 상위 30개를 재정렬한다.',
        publishedAt: '2024-10-10',
      },
    ],
    confidence: 0.74,
  },
  {
    companySlug: 'daangn',
    domainSlug: 'recommendation',
    axisSlug: 'reranker',
    summary: 'cross-encoder reranker',
    evidence: [
      {
        title: '시맨틱 검색 도입기',
        url: 'https://medium.com/daangn/semantic-search',
        quote: '상위 30개에 대해 cross-encoder reranker로 재정렬하여 BM25만으로 잡히지 않는 의도 매칭을 보완한다.',
        publishedAt: '2024-10-10',
      },
    ],
    confidence: 0.73,
  },
  {
    companySlug: 'daangn',
    domainSlug: 'recommendation',
    axisSlug: 'cold-start',
    summary: 'LLM 메타데이터 보강 + 인기 폴백',
    evidence: [
      {
        title: '쿼리 재작성에 LLM 도입',
        url: 'https://medium.com/daangn/query-rewriting-llm',
        quote: '신규 아이템·신규 동네는 LLM으로 메타데이터를 보강하고, 그래도 시그널이 부족하면 동네별 인기 카테고리로 폴백한다.',
        publishedAt: '2024-08-22',
      },
    ],
    confidence: 0.66,
  },

  // --- 쿠팡 (coupang) ---
  {
    companySlug: 'coupang',
    domainSlug: 'recommendation',
    axisSlug: 'candidate-generation',
    summary: '협업필터링 + 카탈로그 매핑',
    evidence: [
      {
        title: 'Matching duplicate items to improve catalog quality',
        url: 'https://medium.com/coupang-engineering/matching-duplicate-items-to-improve-catalog-quality-ca4abc827f94',
        quote: '동일 상품의 중복을 제거하면 같은 후보가 여러 번 노출되는 문제가 사라지고, 협업필터링 시그널이 한 상품으로 집중되어 추천 품질이 올라간다.',
        publishedAt: '2023-04-12',
      },
    ],
    confidence: 0.72,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'recommendation',
    axisSlug: 'reranker',
    summary: 'Multi-task DNN + 비즈니스 KPI 가중',
    evidence: [
      {
        title: 'How to build a comprehensive AI/ML system',
        url: 'https://medium.com/coupang-engineering/ai-ml-%EC%8B%9C%EC%8A%A4%ED%85%9C-%EA%B5%AC%EC%B6%95%EC%97%90-%EB%8C%80%ED%95%9C-%EA%B0%80%EC%9D%B4%EB%93%9C-e3dddae23b01',
        quote: '클릭률·구매율·체류시간 같은 여러 목표를 동시에 학습하는 멀티태스크 DNN으로 추천을 모델링하고, 운영자가 비즈니스 KPI에 가중치를 부여한다.',
        publishedAt: '2023-09-15',
      },
    ],
    confidence: 0.70,
  },
  {
    companySlug: 'coupang',
    domainSlug: 'recommendation',
    axisSlug: 'evaluation',
    summary: '오프라인 NDCG → 온라인 A/B → 거래액 KPI',
    evidence: [
      {
        title: '검색 A/B 테스트 플랫폼',
        url: 'https://medium.com/coupang-engineering/korean/search-ab',
        quote: '추천·검색 변경은 거래액 영향이 크기 때문에 모든 변경을 A/B 테스트 플랫폼에서 통계적 유의성 확보 후 배포한다.',
        publishedAt: '2024-11-04',
      },
    ],
    confidence: 0.71,
  },

  // --- 우아한형제들 (woowahan) — 추천 ---
  {
    companySlug: 'woowahan',
    domainSlug: 'recommendation',
    axisSlug: 'candidate-generation',
    summary: '실시간 반응형 + 시간대·날씨 시그널',
    evidence: [
      {
        title: '실시간 반응형 추천 개발 일지 1부: 프로젝트 소개',
        url: 'https://techblog.woowahan.com/17383/',
        quote: '추천은 사용자의 즉각적 행동(검색·클릭·이전 주문)을 시그널로 받아 실시간 반응형으로 동작하고, 시간대·날씨 같은 컨텍스트도 후보 생성에 반영한다.',
        publishedAt: '2024-04-25',
      },
    ],
    confidence: 0.76,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'recommendation',
    axisSlug: 'serving-latency',
    summary: '피처 캐시 + 단일 서비스 인퍼런스',
    evidence: [
      {
        title: '실시간 반응형 추천 개발 일지 1부: 프로젝트 소개',
        url: 'https://techblog.woowahan.com/17383/',
        quote: '추천 응답 지연이 핵심이라 피처를 사전 캐시하고, 인퍼런스를 단일 서비스로 분리해 모델·피처 변경의 영향을 격리한다.',
        publishedAt: '2024-04-25',
      },
    ],
    confidence: 0.71,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'recommendation',
    axisSlug: 'evaluation',
    summary: '쿼리 골든셋 + 클릭률 대시보드',
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

  // --- 네이버 D2 (naver-d2) — 추천 ---
  {
    companySlug: 'naver-d2',
    domainSlug: 'recommendation',
    axisSlug: 'reranker',
    summary: 'BM25 + LightGBM LTR + 신경 reranker',
    evidence: [
      {
        title: '검색 랭킹 모델 개선',
        url: 'https://d2.naver.com/helloworld/ranking',
        quote: '1차 후보를 BM25로 추출 후 LightGBM 기반 LTR로 재정렬하고, 상위 50개에 대해 신경망 reranker를 적용해 의도 일치를 강화한다.',
        publishedAt: '2024-08-12',
      },
    ],
    confidence: 0.78,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'recommendation',
    axisSlug: 'cold-start',
    summary: 'NER + 동의어 사전 + 클릭 학습',
    evidence: [
      {
        title: '쿼리 의도 분석',
        url: 'https://d2.naver.com/helloworld/query-understanding',
        quote: '신규 사용자·신규 쿼리는 NER로 의도 파악 + 동의어 사전 + 클릭 로그 자동 학습으로 시그널이 쌓일 때까지 보완한다.',
        publishedAt: '2024-09-30',
      },
    ],
    confidence: 0.71,
  },
  {
    companySlug: 'naver-d2',
    domainSlug: 'recommendation',
    axisSlug: 'evaluation',
    summary: '오프라인 NDCG + 인터리빙 + A/B',
    evidence: [
      {
        title: '랭킹 변경 안전 배포',
        url: 'https://d2.naver.com/helloworld/ranking-eval',
        quote: '랭킹 변경은 골든셋 NDCG → 1% 인터리빙 → 점진적 A/B 순으로 배포하여 회귀를 빠르게 잡는다. 추천에도 같은 평가 파이프라인이 적용된다.',
        publishedAt: '2024-10-01',
      },
    ],
    confidence: 0.74,
  },

  // --- 우아한형제들 (woowahan) — 검색 ---
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'index-engine',
    summary: 'Elasticsearch keyword 타입 + 자체 분석기 라이브러리',
    evidence: [
      {
        title: '검색 성능 개선을 위한 Elasticsearch 인덱스 구조와 쿼리 최적화',
        url: 'https://techblog.woowahan.com/20161/',
        quote: 'categoryId 필드를 정확하게 일치하는 값을 찾아내는 용도로만 쓰고 있기 때문에 keyword로 타입을 변경했고, 토크나이즈를 ES API 호출 대신 자체 라이브러리로 분리해 analyze rejected 현상이 사라졌다. P99.9·P99.99 응답시간이 20% 개선됐다.',
        publishedAt: '2024-11-28',
      },
    ],
    confidence: 0.91,
  },
  {
    companySlug: 'woowahan',
    domainSlug: 'search',
    axisSlug: 'ranking',
    summary: 'function_score 필터 + Payload 토큰 기반 정렬',
    evidence: [
      {
        title: '검색 성능 개선을 위한 Elasticsearch 인덱스 구조와 쿼리 최적화',
        url: 'https://techblog.woowahan.com/20161/',
        quote: 'function_score 안으로 필터 조건을 옮겨 인기 검색어("포켓몬") 처리 시 모든 문서에 부스팅 계산이 일어나는 문제를 제거하고, Painless 스크립트 정렬을 Payload 토큰 + 커스텀 플러그인의 쿼리 레벨 계산으로 대체해 aggregation 속도가 2배 이상 향상됐다.',
        publishedAt: '2024-11-28',
      },
    ],
    confidence: 0.86,
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
