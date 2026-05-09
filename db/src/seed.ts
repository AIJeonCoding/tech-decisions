import 'dotenv/config';
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
      { slug: 'yanolja', name: 'Yanolja', nameKo: '야놀자', blogUrl: 'https://medium.com/yanolja' },
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
    ])
    .onConflictDoNothing();

  console.log('Done.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
