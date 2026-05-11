import { db, companies, sources, domains, axes } from './index.js';

async function seed() {
  console.log('Seeding companies...');
  await db
    .insert(companies)
    .values([
      { slug: 'toss', name: 'Toss', nameKo: '토스', blogUrl: 'https://toss.tech/' },
      { slug: 'kakaopay', name: 'Kakao Pay', nameKo: '카카오페이', blogUrl: 'https://tech.kakaopay.com/' },
      { slug: 'coupang', name: 'Coupang Engineering', nameKo: '쿠팡', blogUrl: 'https://medium.com/coupang-engineering/korean' },
      { slug: 'woowahan', name: 'Woowa Brothers', nameKo: '우아한형제들', blogUrl: 'https://techblog.woowahan.com/' },
      { slug: 'kakao', name: 'Kakao', nameKo: '카카오', blogUrl: 'https://tech.kakao.com/' },
      { slug: 'naver-d2', name: 'Naver D2', nameKo: '네이버 D2', blogUrl: 'https://d2.naver.com/' },
      { slug: 'line', name: 'LINE Engineering', nameKo: '라인', blogUrl: 'https://engineering.linecorp.com/ko' },
      { slug: 'daangn', name: 'Daangn', nameKo: '당근', blogUrl: 'https://medium.com/daangn' },
      { slug: 'banksalad', name: 'Banksalad', nameKo: '뱅크샐러드', blogUrl: 'https://blog.banksalad.com/' },
      { slug: 'kakaobank', name: 'Kakao Bank', nameKo: '카카오뱅크', blogUrl: 'https://tech.kakaobank.com/' },
      { slug: 'yanolja', name: 'Yanolja', nameKo: '야놀자', blogUrl: 'https://medium.com/yanolja' },

      // Global big tech — cells 단계적으로 채움 (Phase 2). Phase 1: 회사 + 블로그 URL만 노출.
      { slug: 'netflix', name: 'Netflix', nameKo: '넷플릭스', blogUrl: 'https://netflixtechblog.com/', description: '글로벌 스트리밍 — 추천·MSA·Chaos Engineering·Realtime data 분야 표준 사례.' },
      { slug: 'youtube', name: 'YouTube / Google', nameKo: '유튜브 / 구글', blogUrl: 'https://research.google/blog/', description: '검색·추천·대규모 분산 시스템 — Google Research/Engineering 블로그.' },
      { slug: 'spotify', name: 'Spotify', nameKo: '스포티파이', blogUrl: 'https://engineering.atspotify.com/', description: '추천(BaRT)·검색·플랫폼 엔지니어링(Backstage).' },
      { slug: 'uber', name: 'Uber', nameKo: '우버', blogUrl: 'https://www.uber.com/blog/engineering/', description: 'MSA 전환·실시간 데이터·결제·지오 인프라.' },
      { slug: 'stripe', name: 'Stripe', nameKo: '스트라이프', blogUrl: 'https://stripe.com/blog/engineering', description: '결제·정산·멱등성·API 신뢰성 표준 사례.' },

      {
        slug: 'my-project',
        name: 'settlement-msa',
        nameKo: '내 프로젝트',
        blogUrl: 'https://github.com/',
        description: 'PG 정산 MSA 포트폴리오 — Spring Boot + Spring Cloud + JPA + Outbox + Prometheus. 회계 항등식 자동 검증 + SRE-ready 운영 도구.',
      },
    ])
    .onConflictDoNothing();

  console.log('Seeding sources...');
  const all = await db.select().from(companies);
  const bySlug = Object.fromEntries(all.map((c) => [c.slug, c.id]));
  const srcs: Array<{ slug: string; feed: string; adapter: string; home?: string }> = [
    { slug: 'toss', feed: 'https://toss.tech/rss.xml', adapter: 'rss-readability', home: 'https://toss.tech/' },
    { slug: 'kakaopay', feed: 'https://tech.kakaopay.com/rss', adapter: 'rss-readability', home: 'https://tech.kakaopay.com/' },
    { slug: 'woowahan', feed: 'https://techblog.woowahan.com/feed/', adapter: 'rss-readability', home: 'https://techblog.woowahan.com/' },
    { slug: 'kakao', feed: 'https://tech.kakao.com/feed/', adapter: 'rss-readability', home: 'https://tech.kakao.com/' },
    { slug: 'naver-d2', feed: 'https://d2.naver.com/d2.atom', adapter: 'rss-readability', home: 'https://d2.naver.com/' },
    { slug: 'line', feed: 'https://engineering.linecorp.com/ko/blog/rss', adapter: 'rss-readability', home: 'https://engineering.linecorp.com/ko' },
    { slug: 'banksalad', feed: 'https://blog.banksalad.com/rss.xml', adapter: 'rss-readability', home: 'https://blog.banksalad.com/' },
    { slug: 'kakaobank', feed: 'https://tech.kakaobank.com/index.xml', adapter: 'rss-readability', home: 'https://tech.kakaobank.com/' },
    { slug: 'coupang', feed: 'https://medium.com/feed/coupang-engineering/korean', adapter: 'medium-rss', home: 'https://medium.com/coupang-engineering/korean' },
    { slug: 'daangn', feed: 'https://medium.com/feed/daangn', adapter: 'medium-rss', home: 'https://medium.com/daangn' },
    { slug: 'yanolja', feed: 'https://medium.com/feed/yanolja', adapter: 'medium-rss', home: 'https://medium.com/yanolja' },
  ];
  for (const s of srcs) {
    const cid = bySlug[s.slug];
    if (!cid) continue;
    await db
      .insert(sources)
      .values({ companyId: cid, type: 'blog', feedUrl: s.feed, adapter: s.adapter, homeUrl: s.home })
      .onConflictDoNothing();
  }

  console.log('Seeding domains...');
  await db
    .insert(domains)
    .values([
      { slug: 'payment-settlement', name: '결제·정산', description: '결제 처리, 정산 마감, 대사, 수수료 분배', priority: 100 },
      { slug: 'search', name: '검색', description: '검색 엔진, 색인, 랭킹', priority: 50 },
      { slug: 'recommendation', name: '추천', description: '추천 시스템, 개인화, 임베딩', priority: 50 },
      { slug: 'msa-migration', name: 'MSA 전환', description: '모놀리스 분해, 데이터 분리, 사가', priority: 40 },
      { slug: 'realtime-data', name: '실시간 데이터', description: 'Kafka, 스트리밍, CDC, ETL', priority: 30 },
    ])
    .onConflictDoNothing();

  console.log('Seeding payment-settlement axes...');
  await db
    .insert(axes)
    .values([
      {
        domainSlug: 'payment-settlement',
        slug: 'concurrency-control',
        name: '동시성·정합성 제어',
        question: '같은 잔고/거래를 동시에 바꿀 때 어떻게 막는가?',
        options: ['분산락', '낙관적 락', '멱등키', '이벤트소싱', '단일 라이터'],
        sortOrder: 1,
      },
      {
        domainSlug: 'payment-settlement',
        slug: 'settlement-timing',
        name: '정산 시점',
        question: '거래 발생 → 정산 반영까지 얼마나 걸리는가?',
        options: ['실시간', '일배치', '하이브리드', '스트리밍'],
        sortOrder: 2,
      },
      {
        domainSlug: 'payment-settlement',
        slug: 'reconciliation',
        name: '대사·정합성 검증',
        question: '외부(PG/은행) vs 내부 원장 차이를 어떻게 잡는가?',
        options: ['이중기장', '이벤트소싱', '스냅샷+리컨실', '전문 파일 diff'],
        sortOrder: 3,
      },
      {
        domainSlug: 'payment-settlement',
        slug: 'fee-distribution',
        name: '수수료·정산금 분배',
        question: 'PG/마켓플레이스에서 누구에게 얼마를 보내는가?',
        options: ['룰 엔진', '단계별 분배', '역분배(환불)', '정밀도 처리'],
        sortOrder: 4,
      },
      {
        domainSlug: 'payment-settlement',
        slug: 'failure-recovery',
        name: '장애 복구·재처리',
        question: '실패한 거래는 어떻게 살리는가?',
        options: ['DLQ+수동', '보상 트랜잭션', '자동 재시도', '상태머신'],
        sortOrder: 5,
      },
      // === 실시간 데이터 파이프라인 (V1 추가) ===
      {
        domainSlug: 'realtime-data',
        slug: 'message-broker',
        name: '메시지 브로커 선택',
        question: '이벤트 스트림을 전송하는 백본은 무엇인가?',
        options: ['Kafka', 'RabbitMQ', 'Pulsar', 'AWS SNS/SQS'],
        sortOrder: 1,
      },
      {
        domainSlug: 'realtime-data',
        slug: 'stream-processing',
        name: '스트림 처리 엔진',
        question: '집계/조인/윈도우 처리는 어떻게 하는가?',
        options: ['Flink', 'ksqlDB', 'Spark Streaming', '직접 구현'],
        sortOrder: 2,
      },
      {
        domainSlug: 'realtime-data',
        slug: 'cdc-pipeline',
        name: 'CDC (변경 데이터 캡처)',
        question: 'DB 변경을 어떻게 스트림으로 노출하는가?',
        options: ['Debezium', 'Maxwell', 'AWS DMS', '직접 구현 (이중 쓰기/Outbox)'],
        sortOrder: 3,
      },
      {
        domainSlug: 'realtime-data',
        slug: 'delivery-semantics',
        name: '전달 보증',
        question: '중복·유실 없이 어떻게 보장하는가?',
        options: ['exactly-once', 'at-least-once + 멱등', '정합성 자동 검증', '수동 리컨실'],
        sortOrder: 4,
      },
      {
        domainSlug: 'realtime-data',
        slug: 'partition-routing',
        name: '파티션·순서 라우팅',
        question: '특정 키의 순서를 어떻게 지키는가?',
        options: ['Consumer 단일 라우팅', '파티션 키 고정', '단일 파티션', 'Consumer Group 분리'],
        sortOrder: 5,
      },

      // === MSA 전환 도메인 (V1 추가) ===
      {
        domainSlug: 'msa-migration',
        slug: 'decomposition-unit',
        name: '분해 단위',
        question: '모놀리스를 어떤 단위로 자르는가?',
        options: ['도메인별 (DDD bounded context)', '기능별', '트래픽 기반', '데이터 격리 우선'],
        sortOrder: 1,
      },
      {
        domainSlug: 'msa-migration',
        slug: 'data-separation',
        name: '데이터 분리 전략',
        question: '공유 DB를 어떻게 나누는가?',
        options: ['CDC + Kafka', '이벤트소싱', 'Strangler Fig', 'Stop-the-world'],
        sortOrder: 2,
      },
      {
        domainSlug: 'msa-migration',
        slug: 'communication',
        name: '서비스 간 통신',
        question: '서비스끼리 어떻게 통신하는가?',
        options: ['REST', 'gRPC', '이벤트 (Kafka/SNS)', 'GraphQL Federation'],
        sortOrder: 3,
      },
      {
        domainSlug: 'msa-migration',
        slug: 'distributed-transaction',
        name: '분산 트랜잭션 처리',
        question: '여러 서비스에 걸친 작업을 어떻게 보장하는가?',
        options: ['Saga', 'Outbox + Kafka', '멱등성 + 보상', '2PC (드물게)'],
        sortOrder: 4,
      },
      {
        domainSlug: 'msa-migration',
        slug: 'safe-migration',
        name: '안전한 마이그레이션',
        question: '레거시에서 신규로 어떻게 옮기는가?',
        options: ['Strangler Fig', '카나리/점진 배포', '트래픽 미러링', 'Dual write + 검증'],
        sortOrder: 5,
      },

      // === 추천 도메인 (V1 추가) ===
      {
        domainSlug: 'recommendation',
        slug: 'candidate-generation',
        name: '후보 생성',
        question: '수백만 아이템 중 어떻게 1차 후보를 골라내는가?',
        options: ['협업필터링', '콘텐츠 기반', '벡터 ANN', '룰/탐색 기반'],
        sortOrder: 1,
      },
      {
        domainSlug: 'recommendation',
        slug: 'reranker',
        name: '재정렬 모델',
        question: '후보 위에서 어떤 모델로 재정렬하는가?',
        options: ['LightGBM/LTR', 'DNN/Two-Tower', 'Transformer', 'Multi-task DNN'],
        sortOrder: 2,
      },
      {
        domainSlug: 'recommendation',
        slug: 'cold-start',
        name: '콜드 스타트 처리',
        question: '신규 유저·아이템은 어떻게 채우는가?',
        options: ['인기/룰 기반', '메타데이터 임베딩', 'LLM 보조', '하이브리드'],
        sortOrder: 3,
      },
      {
        domainSlug: 'recommendation',
        slug: 'serving-latency',
        name: '서빙 지연 처리',
        question: 'p99 100ms 이내로 어떻게 응답하는가?',
        options: ['피처 캐시', '모델 양자화', '프리컴퓨트', 'GPU 인퍼런스'],
        sortOrder: 4,
      },
      {
        domainSlug: 'recommendation',
        slug: 'evaluation',
        name: '추천 품질 측정',
        question: '추천 변경의 품질을 어떻게 검증하는가?',
        options: ['오프라인 NDCG/MAP', '온라인 A/B', '인터리빙', '비즈니스 KPI'],
        sortOrder: 5,
      },

      // === 검색 도메인 (V1 데모용) ===
      {
        domainSlug: 'search',
        slug: 'index-engine',
        name: '검색 엔진 선택',
        question: '색인·질의 엔진으로 무엇을 쓰는가?',
        options: ['Elasticsearch', 'OpenSearch', 'Vespa', '자체 구현', 'Postgres FTS'],
        sortOrder: 1,
      },
      {
        domainSlug: 'search',
        slug: 'ranking',
        name: '랭킹 모델',
        question: '검색 결과 정렬을 어떻게 학습/조정하는가?',
        options: ['BM25 only', 'BM25 + LTR', '벡터 + reranker', '실시간 시그널 가중'],
        sortOrder: 2,
      },
      {
        domainSlug: 'search',
        slug: 'index-pipeline',
        name: '색인 파이프라인',
        question: '상품/문서가 검색에 반영되는 경로는?',
        options: ['CDC + Kafka', '주기적 풀배치', '실시간 API + reindex', '하이브리드'],
        sortOrder: 3,
      },
      {
        domainSlug: 'search',
        slug: 'query-understanding',
        name: '쿼리 의도 분석',
        question: '오타/동의어/카테고리 의도를 어떻게 잡는가?',
        options: ['사전 + 룰', 'NER 모델', 'LLM 파싱', '클릭 로그 기반 자동 학습'],
        sortOrder: 4,
      },
      {
        domainSlug: 'search',
        slug: 'observability',
        name: '검색 품질 측정',
        question: '랭킹 변경의 품질을 어떻게 검증하는가?',
        options: ['오프라인 NDCG', '온라인 A/B', '인터리빙', '쿼리 골든셋'],
        sortOrder: 5,
      },
    ])
    .onConflictDoNothing();

  console.log('Done.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
