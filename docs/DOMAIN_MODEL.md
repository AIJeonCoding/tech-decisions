# 도메인 모델

비교 페이지의 골격이 되는 **도메인 → 비교축 → 셀** 구조 정의.

## 도메인 (V1)

| slug | 이름 | 우선순위 |
|---|---|---|
| `payment-settlement` | 결제·정산 시스템 | ★ V1 메인 |
| `search` | 검색 시스템 | V2 |
| `recommendation` | 추천 시스템 | V2 |
| `msa-migration` | 모놀리스→MSA 전환 | V2 |
| `realtime-data` | 실시간 데이터 파이프라인 | V2 |

---

## V1: 결제·정산 비교축

> 회사마다 같은 문제를 다르게 풀었다. 5개 축으로 비교한다.

### 축 1: 동시성·정합성 제어
같은 잔고를 동시에 바꿀 때 어떻게 막는가?
- 분산락 (Redis Redlock / Zookeeper)
- 낙관적 락 (version 컬럼)
- 멱등키(Idempotency-Key) + 단일 책임 라우팅
- 이벤트소싱 + 단일 라이터

### 축 2: 정산 시점
거래 발생 → 정산 반영까지 얼마나 걸리는가?
- 실시간 (거래와 동일 트랜잭션)
- 일배치 (T+1 마감 후 일괄)
- 하이브리드 (실시간 가집계 + 일배치 정산)
- 스트리밍 (Kafka + Flink/ksqlDB)

### 축 3: 대사·정합성 검증
PG/은행 vs 내부 원장 차이를 어떻게 잡는가?
- 이중기장(double-entry) — 모든 변동을 차변/대변 한 쌍으로
- 이벤트소싱 — 이벤트 로그가 ground truth
- 스냅샷 + 일일 리컨실
- 외부 정산 파일(전문) 파싱 → diff

### 축 4: 수수료·정산금 분배
PG/마켓플레이스에서 누구에게 얼마를 보내는가?
- 정률 + 정액 혼합 룰 엔진
- 단계별 분배 (PG → 가맹점 → 셀러 → 광고비 차감 → 송금)
- 환불·부분취소 시 역분배 처리
- 수수료 계산 정밀도 (소수점 / 통화 단위)

### 축 5: 장애 복구·재처리
실패한 거래는 어떻게 살리는가?
- DLQ + 수동 재처리 콘솔
- 보상 트랜잭션(saga)
- 멱등 처리 + 자동 재시도(지수백오프)
- 거래 상태머신 (PENDING → AUTHORIZED → CAPTURED → SETTLED)

---

## 셀 데이터 형식

각 (회사 × 축) 셀:

```json
{
  "company_slug": "toss",
  "axis_slug": "concurrency-control",
  "cell_summary": "Redis 분산락 + 멱등키 이중 보호",
  "evidence": [
    {
      "article_id": 123,
      "url": "https://toss.tech/article/...",
      "quote": "결제 요청 시 Idempotency-Key를 받아 Redis에 12시간 TTL로 저장하고...",
      "published_at": "2024-08-12"
    }
  ],
  "confidence": 0.85,
  "last_verified_at": "2026-05-09"
}
```

`cell_summary`는 LLM 자동 생성이지만 **`evidence` 배열 없이는 페이지에 노출하지 않는다** (환각 방지).

---

## 태그 분류 체계 (LLM 태깅용)

본문 자동 분류 시 이 슬러그 중 하나 이상으로 태깅:

```
payment, settlement, ledger, idempotency, concurrency,
search, ranking, recommendation, embedding,
msa, monolith-decomposition, saga, eventsourcing,
kafka, redis, postgres, mysql, dynamodb,
observability, sre, deployment, ci-cd,
frontend, backend, mobile, infra, security
```

다중 태그 허용. 신뢰도 < 0.5인 태그는 버림.

---

## 비교 페이지 UX 원칙

1. **셀 클릭 = 출처 미니뷰** — 사이드 패널에서 LLM 요약 + 인용문 + 원문 링크
2. **빈 셀 표시** — "확인된 사례 없음"을 회색으로. 거짓말보다 정직함이 신뢰를 만든다.
3. **갱신 표시** — 셀마다 `last_verified_at` 날짜 노출
4. **회사 필터** — 회사 토글로 비교 대상 선택 가능
