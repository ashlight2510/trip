# 풍경너머

떠나기 전에 먼저 가보는 여행. 로드뷰로 그 장소에 서서, 바라보는 방향에 따라 바뀌는 파도·바람·카페·시장 소리를 들으며 가상여행을 합니다.

## 실행

```bash
cp .env.example .env.local   # 키 입력 (없어도 사운드 전용 화면으로 동작)
npm install
npm run dev
```

http://localhost:3000

| 환경변수 | 용도 | 발급 |
|---|---|---|
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 국내 로드뷰 | Kakao Developers JavaScript 키, 플랫폼 > Web에 `http://localhost:3000` 등록 |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | 해외 스트리트뷰 | Google Cloud Console에서 Maps JavaScript API 사용 설정 |

## 구조

- `src/lib/roadview/`: 로드뷰 제공자 공통 인터페이스. 국내는 카카오, 해외는 Google, 키가 없거나 근처에 파노라마가 없으면 드래그로 둘러보는 대체 화면
- `src/lib/sound/`: Web Audio 사운드 엔진. 환경음은 녹음 파일 없이 실시간 합성하고, `bearing`이 있는 레이어는 바라보는 방향에 따라 좌우 위치·음량·밝기가 바뀜
- `src/data/courses.ts`: 코스와 정거장, 정거장별 사운드스케이프 정의
- `src/components/trip-experience.tsx`: 가상여행 화면 (정거장 이동, 힐링 모드, 꺼짐 타이머)
