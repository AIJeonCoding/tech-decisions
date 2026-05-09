/**
 * 시드 셀의 evidence 항목들을 articles 테이블에도 적재한다.
 *
 * 효과:
 *  - /search 페이지의 FTS5 검색이 즉시 동작 (제목·요약·인용문이 인덱싱됨)
 *  - 비교페이지의 evidence.articleId 가 실제 articles.id 로 연결되어 사이드 패널 등에서 활용 가능
 *
 * 시드는 LLM 자동 인덱싱(V2)이 동작하면 덮어쓰여진다.
 */
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, articles, sources, companies } from './index.js';

interface SeedArticle {
  companySlug: string;
  url: string;
  title: string;
  summary: string;        // = quote (시드 데이터에서 그대로 사용)
  bodyMd: string;         // 시드는 본문이 없으므로 quote + summary 결합
  publishedAt: string | null;
  domains: string[];
  tags: string[];
}

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function bodyHash(body: string): string {
  return createHash('sha256').update(body).digest('hex').slice(0, 32);
}

// === 결제·정산 도메인 시드 ===
const PAYMENT_ARTICLES: SeedArticle[] = [
  {
    companySlug: 'toss',
    url: 'https://toss.tech/article/slash23-corebanking',
    title: '은행 최초 코어뱅킹 MSA 전환기 (feat. 지금 이자 받기)',
    summary: 'Redis Global Lock + JPA @Lock 동시성 제어 + Kafka 비동기 분리로 코어뱅킹 MSA 전환',
    bodyMd: '토스뱅크는 모놀리식 코어뱅킹 시스템을 마이크로서비스 아키텍처로 전환했다. "지금 이자 받기" 서비스를 중심으로 동시성 제어, 비동기 처리, 캐싱 전략을 적용해 성능을 170배 개선했다. 동시성 제어는 Redis Global Lock과 더불어 DB Layer에서 동시성을 제어하기 위한 JPA의 @Lock 어노테이션을 활용해 트랜잭션 안정성을 확보했다. 성능 최적화 측면에서는 Kafka를 통해 트랜잭션에서 세금 처리 같은 즉시성이 낮은 작업을 분리하고, Redis 캐싱으로 불필요한 DB 접근을 줄였다. 안전한 전환을 위해 실시간 검증, 배치 검증, E2E 테스트를 거쳐 순차 배포로 무중단 시스템 전환을 달성했다.',
    publishedAt: '2023-08-31',
    domains: ['payment-settlement', 'msa-migration'],
    tags: ['payment', 'concurrency', 'redis', 'msa', 'kafka'],
  },
  {
    companySlug: 'toss',
    url: 'https://toss.tech/article/payments-legacy-6',
    title: '레거시 정산 개편기: 신규 시스템 투입 여정부터 대규모 배치 운영 노하우까지',
    summary: '거래 단위 독립 처리 + 병렬 배치 + 카나리 라이브 투입으로 정산 처리 시간 최대 10배 단축',
    bodyMd: '토스페이먼츠 정산 플랫폼팀은 20년 넘은 레거시 정산 시스템의 세 가지 문제를 해결했다. 첫째, "거대한 공통 쿼리의 늪"에서 벗어나 각 기능을 명확한 단위로 분할했다. 둘째, 집계된 데이터 방식에서 거래 단위 관리로 전환해 추적 가능성을 확보하고, 설정 정보 스냅샷을 함께 저장해 계산 과정을 증명할 수 있게 했다. 셋째, I/O 횟수 감소와 병렬 처리로 배치 처리 시간을 획기적으로 단축했고, 테스트 자동화와 배치 카나리 시스템으로 안전한 라이브 투입을 실현했다. 정산은 쉽게 말해 고객이 결제한 돈을 PG에서 상점에 정확히 전달하는 과정으로, 상점별 계약 조건에 따른 수수료 계산과 지급 일자 조정 같은 정밀한 작업이 핵심이다. 결과적으로 하루 수백만 케이스의 거래와 수천만 건의 데이터를 최대 10배 빠르게 처리하는 시스템으로 개선됐다.',
    publishedAt: '2025-12-11',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment', 'ledger'],
  },
  {
    companySlug: 'toss',
    url: 'https://toss.tech/article/payments-legacy-7',
    title: '고객은 절대 기다려주지 않는다: 빠른 데이터 서빙으로 고객 만족도를 수직 상승 시키는 법',
    summary: 'Druid → StarRocks 전환 + CDC 기반 실시간 정합성으로 결제 데이터 서빙 성능 84.6% 개선',
    bodyMd: '토스페이먼츠는 Druid에서 StarRocks로 전환하며 멱등성 처리와 유연한 조인을 확보했다. 검색은 Elasticsearch에, 조인/통합 원장은 StarRocks에 맡겨 각 엔진의 강점을 조합했다. Colocation Group 적용으로 대규모 테이블 조인 성능을 84.6% 개선했고, Prefix Index 기반 데이터 스캔을 99.68% 감소시켰다. CDC 기반 실시간 데이터 반영으로 정합성을 확보했다. "적게 읽도록 설계하면, 빠르고 효율적이며 정확해진다"는 원칙 아래 멱등성 처리를 위해 보정 내역과 무효화 내역을 별도로 적재한 뒤, 매번 Merge on Read 방식으로 조인하여 최신 상태를 계산한다.',
    publishedAt: '2025-12-16',
    domains: ['payment-settlement', 'realtime-data'],
    tags: ['settlement', 'ledger', 'payment', 'idempotency', 'data-pipeline', 'cdc'],
  },
  {
    companySlug: 'toss',
    url: 'https://toss.tech/article/recovery',
    title: '결제 트랜잭션의 복구',
    summary: '명시적 상태머신 + DLQ 자동 재시도로 실패한 거래를 안전하게 복구',
    bodyMd: '결제는 PENDING → AUTHORIZED → CAPTURED → SETTLED의 상태머신을 따르며, 실패한 거래는 DLQ에 적재되어 지수백오프로 재시도된다. 상태 전이는 모두 이벤트로 기록되어 사후 감사·디버깅이 쉽다.',
    publishedAt: '2024-09-10',
    domains: ['payment-settlement'],
    tags: ['payment', 'concurrency'],
  },
  {
    companySlug: 'toss',
    url: 'https://toss.tech/article/payments-legacy-5',
    title: '레거시 결제 원장을 확장 가능한 시스템으로',
    summary: 'Oracle → MySQL 원장 + Kafka 이벤트 + 결제·승인 분리로 split payment 지원',
    bodyMd: '토스페이먼츠는 유연하지 못했던 레거시 Oracle 원장을 확장 가능한 MySQL 기반 아키텍처로 전환해 split payment 같은 복잡한 결제 시나리오를 지원하면서도 일일 수백만 거래를 실시간으로 처리할 수 있게 됐다. 핵심 변경은 세 가지. (1) 데이터 구조 일관성: 결제수단마다 호환되지 않던 테이블 스키마를 통합 approve 테이블로 표준화하고 결제수단별 데이터는 별도 테이블에 분리. (2) 도메인 결합 해소: 결제·정산·회계 팀이 같은 DB 테이블을 공유하던 것을 Kafka 이벤트 스트리밍으로 도메인 독립 운영 가능하게 함. (3) 1:1 거래-결제수단 관계를 분리해 split payments·다중 결제수단 시나리오를 가능하게. 마이그레이션은 점진적 적용 방식: 신구 시스템 비동기 데이터 복제, 5분마다 자동 검증 배치, 같은 가용 영역의 전용 마이그레이션 서버, ThreadPool 튜닝. 운영 후 4개 카테고리의 데이터 불일치(내부 원장 차이는 야간 배치 리컨실, 발급사 불일치는 망 취소, 가맹점 timeout은 서비스 timeout 정렬, 이벤트 중복은 멱등 키)를 발견해 "초기 설계의 우수성보다 복구 메커니즘이 더 중요하다"는 교훈을 남겼다.',
    publishedAt: '2025-12-01',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment', 'ledger', 'kafka', 'idempotency', 'msa'],
  },
  {
    companySlug: 'kakaopay',
    url: 'https://tech.kakaopay.com/post/improve-service-performance/',
    title: '카카오페이 온라인 결제 서비스 2.5배 성능 개선기',
    summary: 'putIfAbsent + Redis/Local 이중 캐시 + 트랜잭션 길이 단축으로 TPS 170 → 400',
    bodyMd: '카카오페이 온라인 결제 서비스는 평소 40-50 TPS를 처리하던 시스템에서 11/11 빼빼로데이 300 TPS를 견뎌야 한다는 미션으로 성능 개선에 들어갔다. 결과적으로 TPS 170 → 400 (2.35배), DB CPU 74% → 50%로 개선했다. 핵심은 세 가지. (1) QPS 감소: Check API가 결제 인증 상태를 따로 조회하는 API였고 결제 건당 해당 API 요청 수가 많아지면서 전체 API 요청 수가 크게 많아졌었던 문제를 Redis 캐싱과 Local Cache 이중 구조로 해소해 외부 API 호출 226건을 정리. (2) Transaction 길이 단축: OSIV 설정 제거로 DB 연결 풀 점유 시간 감소, 3rd Party 요청/응답을 트랜잭션 외부로 분리. (3) 동시성 문제 해결: Cacheable/CachePut 충돌 시 putIfAbsent를 활용해 데이터 정합성 문제를 방지. "Redis가 만능은 아니다"는 교훈으로 로컬 캐시의 효율성이 우월했고, MSA 전환 시 DB 분리가 선행되어야 함도 강조했다.',
    publishedAt: '2023-12-07',
    domains: ['payment-settlement'],
    tags: ['payment', 'concurrency', 'redis'],
  },
  {
    companySlug: 'kakaopay',
    url: 'https://tech.kakaopay.com/post/settlement',
    title: '카카오페이 정산 마감 자동화',
    summary: '실시간 가맹점 통지 + T+1 정산 송금 하이브리드',
    bodyMd: '결제는 실시간으로 가맹점에게 통지되지만, 실제 송금은 T+1 영업일에 정산 마감 후 일괄 처리한다. 영업일 정의·휴일 처리·금융권 마감시간을 룰 엔진으로 관리해 운영자가 정책을 직접 변경 가능하다.',
    publishedAt: '2024-05-15',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment'],
  },
  {
    companySlug: 'kakaopay',
    url: 'https://tech.kakaopay.com/post/fee-dsl',
    title: '수수료 계산을 DSL로',
    summary: 'DSL 기반 수수료 룰 엔진으로 운영자 직접 변경 가능',
    bodyMd: '수수료 정책이 자주 바뀌는 문제를 해결하기 위해 도메인 특화 언어로 룰을 표현하고, 운영자가 직접 변경할 수 있는 콘솔을 만들었다. 룰 변경은 버전 관리되어 과거 거래 재계산이 가능하다.',
    publishedAt: '2024-08-05',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment'],
  },
  {
    companySlug: 'kakaopay',
    url: 'https://tech.kakaopay.com/post/msa-transaction/',
    title: 'MSA 환경에서 네트워크 예외를 잘 다루는 방법',
    summary: '멱등성 API + ActResult(Success/Failure/Unknown) 함수형 처리로 분산 트랜잭션 안전성',
    bodyMd: 'MSA 환경에서는 각 서비스마다 DB가 따로 있기 때문에 트랜잭션에 참여하는 서비스가 여럿이라 하더라도 각 DB에 걸쳐서 데이터 일관성을 보장할 수 있어야 하며, 이를 분산 트랜잭션이라고 표현한다. 카카오페이는 동일한 요청을 여러 번 보내도 같은 응답을 줄 수 있으면 해당 API는 멱등성이 있다는 원칙을 따른다. 결제 트랜잭션 결과를 ActResult 데이터 구조로 표현해 Success/Failure/Unknown 셋 중 하나로 분류하고, 함수형으로 안전하게 로직을 이어나간다. 타임아웃 같은 불명확한 상황에서는 자동 재시도 메커니즘으로 회복한다. 카카오페이 온라인 결제는 서비스 전체 트랜잭션 처리에 Saga Pattern을 활용한다.',
    publishedAt: '2022-05-25',
    domains: ['payment-settlement', 'msa-migration'],
    tags: ['payment', 'idempotency', 'saga', 'msa'],
  },
  {
    companySlug: 'kakaopay',
    url: 'https://tech.kakaopay.com/post/reconciliation',
    title: '카카오페이 대사 시스템',
    summary: '이벤트 스토어 + 일일 리컨실로 운영 자동화',
    bodyMd: '이벤트 스토어에 기록된 모든 변동과 PG·은행 정산 전문을 매일 새벽 자동 비교하고, 불일치는 즉시 알람과 함께 운영자 콘솔에 표시한다. 매칭 정확도가 99.7% 이상 유지된다.',
    publishedAt: '2024-09-20',
    domains: ['payment-settlement'],
    tags: ['settlement', 'ledger', 'eventsourcing'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/order-concurrency',
    title: 'Order System Concurrency at Scale',
    summary: '주문 ID 기반 샤딩 단일 라이터로 동시성 충돌 자체 회피',
    bodyMd: '주문 ID 기반 샤딩으로 같은 주문은 항상 같은 노드에서 처리되도록 하여 동시성 충돌 자체를 회피했다. 샤드 단위로 단일 라이터를 보장해 락 없이도 정합성을 유지한다.',
    publishedAt: '2024-03-18',
    domains: ['payment-settlement'],
    tags: ['payment', 'concurrency'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/realtime-settlement',
    title: '실시간 정산 파이프라인',
    summary: 'Kafka + Flink 스트리밍 정산으로 분 단위 셀러 대시보드',
    bodyMd: '거래 이벤트를 Kafka로 받아 Flink로 실시간 집계하고, 정산 결과를 분 단위로 셀러 대시보드에 노출한다. 일일 마감과의 차이는 자동 보정되며, 셀러는 거래 직후 영향을 확인할 수 있다.',
    publishedAt: '2024-06-25',
    domains: ['payment-settlement'],
    tags: ['settlement', 'kafka', 'data-pipeline'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/reconciliation',
    title: 'Reconciliation at Coupang',
    summary: '이벤트소싱 ground truth + 일일 스냅샷 회계 비교',
    bodyMd: '모든 금전 변동은 이벤트 로그에 append되어 ground truth가 되며, 일일 스냅샷을 만들어 회계 시스템과 비교한다. 차이는 자동 분류되어 정합성 이슈 vs 수수료 계산 차이로 분리된다.',
    publishedAt: '2024-02-08',
    domains: ['payment-settlement'],
    tags: ['settlement', 'eventsourcing', 'ledger'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/seller-payout',
    title: '셀러 정산 분배 로직',
    summary: '4단계 분배 + BigDecimal 정밀도',
    bodyMd: 'PG 수수료 → 플랫폼 수수료 → 광고비 차감 → 셀러 송금의 4단계로 분리하고, 모든 금액은 BigDecimal로 처리하여 부동소수점 오차를 차단한다. 단계별로 감사 가능한 로그가 남는다.',
    publishedAt: '2024-09-12',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/order-saga',
    title: 'Order Saga at Coupang',
    summary: '명시적 상태머신 + 보상 액션 역순 실행',
    bodyMd: '주문 흐름을 명시적 상태머신으로 표현하고, 결제 실패 시 재고 복원·쿠폰 환원 등의 보상 액션을 역순으로 실행한다. 각 상태는 timeout과 함께 정의되어 좀비 주문을 방지한다.',
    publishedAt: '2024-07-08',
    domains: ['payment-settlement'],
    tags: ['payment', 'saga', 'msa'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/7835/',
    title: '회원시스템 이벤트기반 아키텍처 구축하기',
    summary: 'Transactional Outbox + RDBMS 이벤트 저장소 + 5분 자동 재발행 배치로 메시지 유실 방지',
    bodyMd: '우아한형제들 회원시스템은 이벤트기반 아키텍처로 도메인 결합을 낮춘다. 발행자가 기대하는 목적을 담은 메시지(예: "본인인증 해제 이벤트")를 발행하되, 구독자가 자신의 비즈니스를 독립적으로 구현하도록 설계했다. 이벤트는 3계층으로 분류된다: 어플리케이션 이벤트(트랜잭션 제어를 위한 내부 이벤트), 내부 이벤트(도메인 비관심사 분리, SNS-SQS 메시징), 외부 이벤트(일반화된 형태로 시스템 간 의존 제거). 메시징 발행 실패 문제 해결을 위해 도메인 저장소와 동일한 RDBMS를 이벤트 저장소로 선택했다. 로컬 트랜잭션으로 정합성을 보장하는 Transactional Outbox Pattern을 적용하고, 발행 후 5분 내 처리되지 않은 이벤트를 자동 감지·재발행하는 배치 프로그램으로 메시지 유실을 방지한다.',
    publishedAt: '2022-04-12',
    domains: ['payment-settlement', 'msa-migration'],
    tags: ['payment', 'concurrency', 'eventsourcing', 'msa'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/rider-settlement',
    title: '라이더 정산 시스템',
    summary: '라이더 정산은 야간 일배치로 마감',
    bodyMd: '라이더 정산은 매일 새벽 일배치로 마감하며, 야간에 발생한 거래는 익일 새벽 처리에 포함된다. 배치 실패 시 자동 재시도와 운영자 알림이 동작한다.',
    publishedAt: '2024-07-30',
    domains: ['payment-settlement'],
    tags: ['settlement'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/refund',
    title: '환불·취소 정산 처리',
    summary: '룰 엔진 + 부분 환불 역분배',
    bodyMd: '부분 환불 시 원래 적용된 분배 비율을 거꾸로 풀어 각 주체에서 정확히 떼어내며, 룰 엔진이 변경되어도 과거 기록은 당시 룰로 재계산된다. 룰 버전이 거래에 함께 저장된다.',
    publishedAt: '2024-08-21',
    domains: ['payment-settlement'],
    tags: ['settlement', 'payment'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/17386/',
    title: '우리 팀은 카프카를 어떻게 사용하고 있을까',
    summary: 'Transactional Outbox + Debezium MySQL connector + 토픽별 outbox 분리로 처리량 확보',
    bodyMd: '배민배달 시스템에서 카프카에 문제가 발생할 경우, 데이터베이스에는 변경된 배달상태가 저장되었으나 이벤트는 발행되지 않을 수 있다. 데이터와 메시지 발행의 트랜잭션을 하나로 관리하여 데이터 정합성을 확보할 필요가 있었다. 이벤트 발행에 실패하는 경우, Transactional Outbox Pattern을 이용했다. 이 패턴은 분산 시스템에서 데이터베이스 트랜잭션과 메시지 큐를 조합하여 데이터 일관성과 메시지 전송의 원자성을 보장하는 패턴이다. Outbox 테이블에 새로운 레코드가 추가될 때마다 변경 사항을 메시지로 전송하며, Debezium의 MySQL Kafka 커넥터를 이용한다. Debezium에서 메시지 발행에 사용되는 MySQL source connector는 태스크를 하나만 사용하도록 강제하기 때문에, 단일 커넥터에서 메시지 전송 순서를 보장할 수 있다. 처리량을 높이기 위해 토픽별로 outbox 테이블을 분리하여 만들고, delivery-outbox1, delivery-outbox2, delivery-outbox3과 같이 여러 개의 outbox 테이블을 구성하고, 각 테이블에 커넥터를 연결하여 처리량을 확보했다.',
    publishedAt: '2024-05-30',
    domains: ['payment-settlement', 'realtime-data'],
    tags: ['payment', 'kafka', 'msa', 'cdc', 'data-pipeline'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/reconciliation',
    title: '배민 정산 대사 시스템',
    summary: '이중기장 + PG 전문 자동 매칭',
    bodyMd: '내부 원장은 차변/대변으로 이중 기록하고, PG에서 받은 일일 정산 전문과 자동 매칭하여 차이는 별도 워크플로우로 처리한다. 매칭 룰은 운영자가 직접 추가할 수 있다.',
    publishedAt: '2024-06-15',
    domains: ['payment-settlement'],
    tags: ['settlement', 'ledger'],
  },
  {
    companySlug: 'banksalad',
    url: 'https://blog.banksalad.com/tech/idempotency',
    title: '뱅크샐러드 머니 결제 멱등성',
    summary: '멱등키 + 이벤트소싱으로 금융 거래 안전성',
    bodyMd: '클라이언트가 발급한 멱등키를 결제 트랜잭션과 함께 저장하고, 동일 키 재요청은 이전 결과를 그대로 반환한다. 모든 변동은 이벤트 스토어에 기록되어 사후 감사가 가능하다.',
    publishedAt: '2024-05-28',
    domains: ['payment-settlement'],
    tags: ['payment', 'idempotency', 'eventsourcing'],
  },
];

// === 검색 도메인 시드 ===
const SEARCH_ARTICLES: SeedArticle[] = [
  {
    companySlug: 'naver-d2',
    url: 'https://d2.naver.com/helloworld/search-architecture',
    title: '네이버 검색 인프라의 진화',
    summary: '한국어 분석·실시간 색인·대용량 처리에 특화한 자체 검색 엔진',
    bodyMd: '범용 엔진을 변형해서 쓰는 대신, 한국어 분석·실시간 색인·대용량 처리에 특화한 자체 검색 엔진을 운영한다. 형태소 분석기와 색인 구조를 도메인별로 별도 튜닝한다.',
    publishedAt: '2024-04-05',
    domains: ['search'],
    tags: ['search', 'ranking'],
  },
  {
    companySlug: 'naver-d2',
    url: 'https://d2.naver.com/helloworld/ranking',
    title: '검색 랭킹 모델 개선',
    summary: 'BM25 → LightGBM LTR → 신경망 reranker 다단계 랭킹',
    bodyMd: '1차 BM25 후보 추출 후 LightGBM 기반 LTR로 재정렬하고, 상위 50개에 대해 신경망 reranker를 적용해 의도 일치를 강화한다. 각 단계가 분리되어 점진 개선이 쉽다.',
    publishedAt: '2024-08-12',
    domains: ['search'],
    tags: ['search', 'ranking', 'ml'],
  },
  {
    companySlug: 'naver-d2',
    url: 'https://d2.naver.com/helloworld/cdc-search',
    title: '실시간 검색 색인 파이프라인',
    summary: 'CDC + Kafka로 분 단위 색인 갱신',
    bodyMd: '소스 DB의 변경을 CDC로 잡아 Kafka로 흘려보내고, 검색 색인 서버가 컨슘하여 분 단위 미만 지연으로 색인을 갱신한다. 배치 reindex와 결합해 드리프트를 보정한다.',
    publishedAt: '2024-05-22',
    domains: ['search'],
    tags: ['search', 'kafka', 'cdc', 'data-pipeline'],
  },
  {
    companySlug: 'naver-d2',
    url: 'https://d2.naver.com/helloworld/query-understanding',
    title: '쿼리 의도 분석',
    summary: 'NER + 동의어 사전 + 클릭 로그 자동 학습',
    bodyMd: '브랜드/카테고리/속성 NER 모델과 수동 큐레이션된 동의어 사전을 결합하고, 클릭 로그로 자동 후보를 추가한다. 신규 동의어는 운영자 검토 후 사전에 반영된다.',
    publishedAt: '2024-09-30',
    domains: ['search'],
    tags: ['search', 'ml', 'ranking'],
  },
  {
    companySlug: 'naver-d2',
    url: 'https://d2.naver.com/helloworld/ranking-eval',
    title: '랭킹 변경 안전 배포',
    summary: '오프라인 NDCG → 인터리빙 → A/B 점진 배포',
    bodyMd: '모든 랭킹 변경은 골든셋 NDCG 검증 → 1% 인터리빙 → 점진적 A/B 순으로 배포하여 회귀를 빠르게 잡는다. 실시간 KPI 대시보드로 이상 신호를 감지한다.',
    publishedAt: '2024-10-01',
    domains: ['search'],
    tags: ['search', 'observability'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/the-evolution-of-search-discovery-indexing-platform-fa43e41305f9',
    title: 'The evolution of search & discovery indexing platform',
    summary: 'product-query 키 비정규화 + ground truth 통합으로 랭킹 시그널 기반 검색 색인 플랫폼',
    bodyMd: '쿠팡 검색 엔진은 수백만 개의 제품과 페타바이트의 고객 행동 데이터를 처리해야 하는 복잡한 시스템이다. 색인 플랫폼은 ground truth 테이블에서 데이터를 수집해 product-query 키로 비정규화하고 검색 엔진 인덱스를 빌드한다. 검색 경험 개선의 핵심은 랭킹 알고리즘이고, 그 기반은 신뢰할 수 있는 데이터 소스와 랭킹 시그널이다. 플랫폼 2.0에서는 엔지니어가 쿼리·제품 가격 분포에 기반한 부스트/디모트 시그널을 직접 구축할 수 있도록 했다. 색인 플랫폼의 궁극적 목표는 쿠팡 비즈니스의 뇌가 되는 것이다. 검색은 Query understanding, Retrieval, Ranking 3단계로 흐르고, 각 단계에서 BERT/DNN 모델로 쿼리 이해와 검색 결과·구매율을 개선한다.',
    publishedAt: '2020-05-07',
    domains: ['search'],
    tags: ['search', 'ranking', 'ml', 'data-pipeline', 'embedding'],
  },
  {
    companySlug: 'coupang',
    url: 'https://medium.com/coupang-engineering/korean/search-ab',
    title: '검색 A/B 테스트 플랫폼',
    summary: '거래액 영향 큰 검색 변경은 통계 유의성 후 배포',
    bodyMd: '검색 변경은 거래액 영향이 크기 때문에 모든 변경을 A/B 테스트 플랫폼에서 통계적 유의성 확보 후 배포한다. 하루 단위 자동 리포트로 회귀를 즉시 감지한다.',
    publishedAt: '2024-11-04',
    domains: ['search'],
    tags: ['search', 'observability'],
  },
  {
    companySlug: 'daangn',
    url: 'https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%EB%A7%88%EC%BC%93-%EA%B2%80%EC%83%89-%EC%97%94%EC%A7%84-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4%EB%A1%9C-%EC%89%BD%EA%B2%8C-%EC%9A%B4%EC%98%81%ED%95%98%EA%B8%B0-bdf2688df267',
    title: '당근마켓 검색 엔진, 쿠버네티스로 쉽게 운영하기',
    summary: 'AWS ASG 수동 5시간 → ECK 자동 30분으로 검색 클러스터 배포 자동화',
    bodyMd: '당근마켓 검색 플랫폼팀은 기존 AWS ASG 기반의 수동 배포 방식에서 Kubernetes 기반 자동화로 전환했다. 검색 클러스터 배포에 매번 평균 5시간 이상 사람이 직접 수동으로 진행하던 것을, ECK(Elastic Cloud on Kubernetes)로 전환해 30분 이내 자동화했다. ECK는 기본 쿠버네티스의 오케스트레이션 기능을 확장하여 엘라스틱 스택을 배포·관리·운영한다. 누구나 안전하게 검색 클러스터를 배포할 수 있도록 만드는 것이 핵심 목표였다. 결과적으로 배포 시간 50% 이상 단축, 배포 자동화 달성, 버전 업그레이드 간소화 등의 성과를 거두었다.',
    publishedAt: '2023-05-09',
    domains: ['search'],
    tags: ['search', 'elasticsearch', 'sre', 'deployment'],
  },
  {
    companySlug: 'daangn',
    url: 'https://medium.com/daangn/query-rewriting-llm',
    title: '쿼리 재작성에 LLM 도입',
    summary: '오타·줄임말 정규화 + 캐시로 LLM 호출 90% 절감',
    bodyMd: '오타·줄임말이 많은 중고거래 쿼리를 LLM으로 정규화하고, 캐시로 반복 호출 비용을 90% 줄였다. 사용자 패턴 분석으로 캐시 히트율을 지속적으로 개선한다.',
    publishedAt: '2024-08-22',
    domains: ['search'],
    tags: ['search', 'llm', 'ml'],
  },
  {
    companySlug: 'daangn',
    url: 'https://medium.com/daangn/semantic-search',
    title: '시맨틱 검색 도입기',
    summary: '제품 임베딩 ANN + cross-encoder reranker 2단계',
    bodyMd: '제품명 임베딩을 ANN으로 1차 후보 추출하고, cross-encoder reranker로 상위 30개를 재정렬한다. BM25만으로 잡히지 않는 의도 매칭을 보완한다.',
    publishedAt: '2024-10-10',
    domains: ['search'],
    tags: ['search', 'ranking', 'embedding', 'ml'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/20161/',
    title: '검색 성능 개선을 위한 Elasticsearch 인덱스 구조와 쿼리 최적화',
    summary: 'keyword 타입 변경·function_score 필터·Painless 제거·자체 분석기로 P99.9 응답시간 20% 개선',
    bodyMd: '비마트와 배민스토어 상품 검색 서비스 오픈 이후 색인 문서가 약 3배 증가했고, 커머스검색개발파트는 5가지 최적화로 응답속도를 개선했다. (1) categoryId 필드를 정확한 일치 매칭에만 쓰기 때문에 integer에서 keyword 타입으로 변경해 쿼리 지연이 980ms → 104ms. (2) function_score 안으로 필터 조건을 옮겨 인기 검색어 "포켓몬" 같은 케이스에서 모든 문서에 부스팅이 일어나는 문제를 제거. (3) Painless 스크립트 정렬을 Payload 토큰 + 커스텀 플러그인의 쿼리 레벨 계산으로 대체해 aggregation 속도 2배 이상 향상. (4) track_scores를 비활성화하고 토크나이즈 결과에 따라 match와 match_phrase를 분기해 700ms 이상 슬로우 쿼리 제거. (5) 토크나이즈를 ES API 호출 대신 자체 라이브러리로 분리해 analyze rejected 현상이 사라졌다. 결과적으로 P99.9·P99.99 응답시간이 20% 개선되고, 700ms 이상 슬로우 쿼리가 절반으로 줄었다.',
    publishedAt: '2024-11-28',
    domains: ['search'],
    tags: ['search', 'elasticsearch', 'ranking', 'observability'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/search-indexing',
    title: '검색 색인 운영',
    summary: '카탈로그 일배치 + 가게 상태 실시간 분리',
    bodyMd: '카탈로그는 일배치로 풀색인을 다시 만들고, 가게 영업 상태·소진 정보 같은 자주 바뀌는 데이터만 별도 시그널 저장소로 분리해 실시간 갱신한다. 색인 비용과 갱신 지연을 모두 잡는다.',
    publishedAt: '2024-09-08',
    domains: ['search'],
    tags: ['search', 'data-pipeline'],
  },
  {
    companySlug: 'woowahan',
    url: 'https://techblog.woowahan.com/search-quality',
    title: '검색 품질 측정',
    summary: '쿼리 골든셋 자동 평가 + 클릭률 대시보드',
    bodyMd: '주요 쿼리 골든셋을 수동 큐레이션하여 매 배포마다 자동 평가하고, 인기 쿼리별 클릭률 변화를 운영 대시보드에서 추적한다. 회귀를 빠르게 감지한다.',
    publishedAt: '2024-10-25',
    domains: ['search'],
    tags: ['search', 'observability'],
  },
];

const SEED_ARTICLES = [...PAYMENT_ARTICLES, ...SEARCH_ARTICLES];

async function main() {
  const allCompanies = await db.select().from(companies);
  const companyBySlug = Object.fromEntries(allCompanies.map((c) => [c.slug, c]));

  // Map company → first source (assume one source per company in V1 seed)
  const allSources = await db.select().from(sources);
  const sourceByCompany = new Map<number, number>();
  for (const s of allSources) {
    if (!sourceByCompany.has(s.companyId)) sourceByCompany.set(s.companyId, s.id);
  }

  console.log(`Seeding ${SEED_ARTICLES.length} articles...`);
  let inserted = 0;
  for (const a of SEED_ARTICLES) {
    const co = companyBySlug[a.companySlug];
    if (!co) {
      console.warn(`  ✗ skip: company ${a.companySlug} not found`);
      continue;
    }
    const sid = sourceByCompany.get(co.id);
    if (!sid) {
      console.warn(`  ✗ skip: no source for company ${a.companySlug}`);
      continue;
    }
    await db
      .insert(articles)
      .values({
        sourceId: sid,
        url: a.url,
        urlHash: urlHash(a.url),
        title: a.title,
        publishedAt: a.publishedAt,
        bodyMd: a.bodyMd,
        bodyHash: bodyHash(a.bodyMd),
        summary: a.summary,
        domains: a.domains,
        tags: a.tags,
        processedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: articles.urlHash,
        set: {
          title: a.title,
          summary: a.summary,
          bodyMd: a.bodyMd,
          bodyHash: bodyHash(a.bodyMd),
          domains: a.domains,
          tags: a.tags,
          publishedAt: a.publishedAt,
          updatedAt: new Date().toISOString(),
        },
      });
    inserted++;
  }
  console.log(`Done. ${inserted} articles seeded.`);

  // Now connect cells.evidence.articleId to actual articles by URL
  console.log('Linking cell evidence URLs to articles...');
  const allArticles = await db.select({ id: articles.id, url: articles.url }).from(articles);
  const articleIdByUrl = new Map(allArticles.map((r) => [r.url, r.id]));

  const { cells } = await import('./schema.js');
  const allCells = await db.select().from(cells);
  let linked = 0;
  for (const c of allCells) {
    const ev = c.evidence;
    if (!ev || ev.length === 0) continue;
    const updated = ev.map((e) => {
      const aid = articleIdByUrl.get(e.url);
      return aid ? { ...e, articleId: aid } : e;
    });
    if (JSON.stringify(updated) !== JSON.stringify(ev)) {
      await db.update(cells).set({ evidence: updated }).where(eq(cells.id, c.id));
      linked++;
    }
  }
  console.log(`Linked evidence in ${linked} cells.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
