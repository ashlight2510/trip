# 풍경너머

떠나기 전에 먼저 가보는 여행. 지도에서 장소를 고르고 **나홀로 여행 떠나기**로 도보·오토바이·자동차를 골라 실제 지도를 이동한 뒤, 도착 장소에서 카카오 로드뷰(거리뷰)로 내려보고, 네이버 블로그·유튜브 후기(원문 링크)와 사운드로 미리 가봅니다.

본문 스크랩/재호스팅 없음 — 검색 API 메타데이터 + 아웃바운드 URL만 저장합니다. 블로그 이미지는 불펌하지 않습니다. 로드뷰는 좌표로 **라이브 임베드**만 하고 타일을 저장하지 않습니다.
블로그는 네이버 API에 조회수가 없어 **방문 후기 적합도**로 고르고, 유튜브는 **조회수** 순입니다. 장소당 최대 10개(블로그 7 + 영상 3).
표시 순위는 패널 ▲▼ → `data/place_source_boosts.json` (수집과 분리).

**사진(Wikimedia/KOGL 등)** 대량 시드는 이후 단계이며, 나홀로 여행(로드뷰) 출시를 막지 않습니다.

## 빠른 시작

```bash
git clone git@github.com:ashlight2510/trip.git
cd trip
yarn
cp .env.local.example .env.local   # API 키 입력
yarn env:check
yarn dev
```

http://localhost:3000

로컬에서 코드·데이터·순위(▲▼)를 **재시작 없이** 바로 보려면 항상 `yarn dev` 를 쓰세요.  
`yarn start` 는 `yarn build` 한 결과만 서빙해서, 작업 중에는 반영이 안 됩니다.

프로덕션 확인:

```bash
yarn build && yarn start
```

## 환경 변수

| 변수 | 용도 |
|---|---|
| `KAKAO_REST_API_KEY` | 전국 장소 수집 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 국내 로드뷰 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 블로그 검색 (API Hub) |
| `YOUTUBE_DATA_API_KEY` | 유튜브 영상 후기 (선택) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | 해외 스트리트뷰 (선택) |

발급 안내는 [`.env.local.example`](.env.local.example) 주석을 보세요. **`.env.local`은 Git에 올리지 않습니다.**

## 나홀로 여행 (지도 이동 + 거리뷰)

1. 지도에서 장소 선택
2. 패널 **나홀로 여행 떠나기** → `/trip/place/<placeId>`
3. **혼자** 또는 **손잡고(남/여)** 선택 후 카카오 **거리뷰**에서 길을 따라 걷기
4. (선택) 지도 여행 탭 · 도보/오토바이/자동차로 근처 핀 이동 후 다시 거리뷰
5. 블로그/영상 링크·현장 사진·환경음

`NEXT_PUBLIC_KAKAO_MAP_KEY` 가 있어야 로드뷰가 켜집니다.

## 데이터 파이프라인 (카카오·네이버 최대화)

```bash
# 시 단위 장소 수집 (카카오)
yarn collect:kr -- --city kr-gangneung

# 네이버 블로그 링크 (장소당 최대 7, 방문 적합도 필터)
yarn blog:link -- <place_id>
yarn blog:link                  # 전체 (이미 연결된 곳 skip)
./scripts/blog-link-watch.sh    # 끊겨도 자동 재시작 — 빈 곳 계속 채우기

# 유튜브 최대 3건 믹스 (조회수 순; 일일 할당량 주의)
yarn youtube:link -- <place_id>
yarn youtube:link -- --limit 80

# 기존 링크 오프라인 정리 (잡음 제거, API 없음)
yarn source:prune

# 해시태그 재생성
yarn place:tags

# 스키마/관계 검사
yarn data:check
```

로드뷰 스냅샷은 수집하지 않습니다. JSON은 `data/*.json`. 지도는 근처/이동/검색 시 `/api/map/places` 로만 로드합니다.

## 앱 구조

- `src/components/map-explorer.tsx` — 지도·검색·장소 패널·나홀로 CTA
- `src/app/trip/place/[placeId]` — 장소 단위 지도 여행 + 거리뷰
- `src/components/map-travel-stage.tsx` — Leaflet 아바타 이동 (도보/오토바이/자동차)
- `src/db/` — Zod 스키마 + repo / map-query
- `src/lib/roadview/` — 카카오 로드뷰 · 구글 스트리트뷰
- `src/lib/sound/` · `src/components/trip-experience.tsx` — 탐험 UI
- `scripts/` — 수집·링크·검증 CLI

## 협업

1. 위 clone → 키 → `yarn dev`
2. 데이터 배치가 돌고 있으면 `data/` 충돌에 주의 (블로그 워치독과 동시에 같은 파일 수정하지 않기)
3. PR 전에 `yarn data:check`
