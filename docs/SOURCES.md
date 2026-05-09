# 크롤링 대상 소스 (V1)

V1에서 인덱싱할 한국 빅테크 기술 블로그. RSS 우선, 없으면 정적 크롤.

| 회사 | slug | 블로그 URL | RSS | V1 우선순위 |
|---|---|---|---|---|
| 토스 | `toss` | https://toss.tech/ | https://toss.tech/rss.xml | ★ 결제·정산 |
| 카카오페이 | `kakaopay` | https://tech.kakaopay.com/ | https://tech.kakaopay.com/rss | ★ 결제·정산 |
| 쿠팡 엔지니어링 | `coupang` | https://medium.com/coupang-engineering/korean | medium feed | ★ 결제·대규모 |
| 우아한형제들 | `woowahan` | https://techblog.woowahan.com/ | https://techblog.woowahan.com/feed/ | ★ 정산·MSA |
| 카카오 | `kakao` | https://tech.kakao.com/ | https://tech.kakao.com/feed/ | 다영역 |
| 네이버 D2 | `naver-d2` | https://d2.naver.com/home | rss 있음 | 다영역 |
| 라인 | `line` | https://engineering.linecorp.com/ko | rss 있음 | 글로벌 결제 |
| 당근 | `daangn` | https://medium.com/daangn | medium feed | 추천·검색 |
| 야놀자 | `yanolja` | https://medium.com/yanolja | medium feed | 결제·예약 |
| 뱅크샐러드 | `banksalad` | https://blog.banksalad.com/ | rss 있음 | 핀테크 |

## V2 영상 소스
- 토스 SLASH (YouTube channel)
- IF kakao (YouTube)
- DEVIEW (네이버, YouTube)
- FEConf (YouTube)
- AWSKRUG (YouTube)

자막 추출: `youtube-transcript-api` (자동생성 자막) → 실패 시 Whisper API.
