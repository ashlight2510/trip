# 풍경너머

떠나기 전에 먼저 가보는 여행. 지도에서 장소를 고르고, 블로그·영상 후기(원문 링크)와 로드뷰·사운드로 미리 가봅니다.

본문 스크랩/재호스팅 없음 — 검색 API 메타데이터 + 아웃바운드 URL만 저장합니다.

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

프로덕션:

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

## 데이터 파이프라인

```bash
# 시 단위 장소 수집 (카카오)
yarn collect:kr -- --city kr-gangneung

# 네이버 블로그 링크 (장소당 최대 3)
yarn blog:link -- <place_id>
yarn blog:link                  # 전체 (이미 연결된 곳 skip)
./scripts/blog-link-watch.sh    # 끊겨도 자동 재시작

# 유튜브 1건 믹스 (블로그 2 + 영상 1)
yarn youtube:link -- <place_id>
yarn youtube:link -- --limit 100

# 해시태그 재생성 (카테고리 시드 + 후기 텍스트)
yarn place:tags

# 스키마/관계 검사
yarn data:check
```

JSON은 `data/*.json` 에 있습니다. 지도는 전체를 한 번에 안 보내고, **내 위치 근처 / 지도 이동 / 검색** 때만 `/api/map/places` 로 가져옵니다.

## 앱 구조

- `src/components/map-explorer.tsx` — 지도·통합검색·장소 패널
- `src/db/` — Zod 스키마 + 읽기용 repo / map-query
- `src/lib/place-tags.ts` — 감성 해시태그
- `src/lib/sound/` · `src/components/trip-experience.tsx` — 가상여행 POC
- `scripts/` — 수집·링크·검증 CLI

## 협업

1. 위 clone → 키 → `yarn dev`
2. 데이터 배치가 돌고 있으면 `data/` 충돌에 주의 (블로그 워치독과 동시에 같은 파일 수정하지 않기)
3. PR 전에 `yarn data:check`
