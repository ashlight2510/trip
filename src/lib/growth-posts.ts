/**
 * Paste-ready Naver blog / cafe drafts (no video).
 * Prefer these over Shorts for KR travel search traffic.
 */
import { GROWTH_HOOKS, type GrowthHook, thisWeekHooks } from "./growth-hooks";

const ORIGIN = "https://trip.funnyfunny.cloud";

type PostDraft = {
  id: string;
  title: string;
  /** Naver blog body — plain text, paste then add 1 screenshot */
  blog: string;
  /** Shorter cafe / community paste */
  cafe: string;
  /** X / Twitter — Korean */
  xKo: string;
  /** X / Twitter — English */
  xEn: string;
};

const DRAFTS: Record<string, Omit<PostDraft, "id">> = {
  "jeju-trip-1": {
    title: "제주 여행 코스, 검색창 대신 후기 지도로 짜기",
    xKo: `제주 코스, 동·서 하루에 넣지 마세요.
후기 있는 장소만 지도에서 권역부터 고르면 덜 피곤합니다.

${ORIGIN}/explore/jeju-trip/

#제주여행 #제주코스`,
    xEn: `Jeju tip: don’t force east + west in one day.
Pick a region first on a review map, then add beaches/cafes.

${ORIGIN}/explore/jeju-trip/

#Jeju #KoreaTravel`,
    blog: `제주 갈 때마다 제일 힘든 게 ‘하루에 어디를 넣을지’였어요.
동쪽이랑 서쪽을 하루에 억지로 넣으면 운전만 하다 끝나는 경우가 많더라고요.

그래서 요즘은 일정 짜기 전에 후기가 붙은 장소를 지도에서 먼저 고릅니다.
권역을 하나 정하고, 해변·카페·명소 핀만 몇 개 찍은 다음 순서를 맞추면 헤매는 시간이 줄어요.

제가 쓰는 방법은 단순합니다.
1) 제주 여행 테마 페이지를 연다
2) 후기 있는 장소만 훑는다
3) 지도에서 같은 권역끼리만 고른다
4) 필요하면 카페/해변 테마로 더 좁힌다

도구 링크 (무료):
${ORIGIN}/explore/jeju-trip/

해변만 보고 싶으면 → ${ORIGIN}/explore/jeju-beach/
카페만 보고 싶으면 → ${ORIGIN}/explore/jeju-cafe/

후기 본문은 베끼지 않고 원문 링크로만 연결됩니다.
제주 가기 전에 ‘어디가 지금 괜찮은지’만 빠르게 걸러 보세요.`,
    cafe: `제주 코스 짤 때 동·서 하루에 넣지 말고, 후기 지도에서 권역부터 고르는 게 덜 피곤해요.
미리보기: ${ORIGIN}/explore/jeju-trip/`,
  },
  "busan-trip-1": {
    title: "부산 여행, 해운대만 찍고 끝내지 않는 법",
    xKo: `부산 여행, 해운대만 찍고 끝내지 말 것.
해운대 vs 광안리 + 근처 카페를 후기 지도에 올려두고 동선만 정리.

${ORIGIN}/explore/busan-trip/

#부산여행 #해운대 #광안리`,
    xEn: `Busan tip: don’t stop at Haeundae.
Compare Haeundae vs Gwangalli + nearby cafes on one review map.

${ORIGIN}/explore/busan-trip/

#Busan #KoreaTravel`,
    blog: `부산 여행하면 해운대만 찍고 끝나는 경우가 많아요.
광안리랑 분위기·야경·혼잡이 다른데, 후기를 따로따로 찾으면 시간이 더 듭니다.

저는 가기 전에 해변·카페를 한 지도에 올려두고 비교합니다.
- 해운대 vs 광안리: 후기에서 혼잡·야경만 먼저 보기
- 해변 하나 고른 뒤 근처 카페만 이어 붙이기
- 하루면 해변 1 + 카페·야경으로 끊기

부산 여행 테마 (후기 지도):
${ORIGIN}/explore/busan-trip/

해변만: ${ORIGIN}/explore/busan-beach/

지하철만으로도 해운대·광안리 권역은 충분히 돌아볼 수 있어요.
같은 권역 핀만 모아두면 동선이 덜 꺾입니다.`,
    cafe: `부산 여행 해운대만 찍지 말고, 해변·카페를 후기 지도에 올려두고 동선만 정리해 보세요.
${ORIGIN}/explore/busan-trip/`,
  },
  "gangneung-cafe-1": {
    title: "강릉 카페 추천, 후기 지도로 미리 고르는 법",
    xKo: `강릉 카페, 후기 안 보고 가면 동선에서 후회하기 쉬움.
안목·경포·구도심을 지도+후기로 먼저 고르기.

${ORIGIN}/explore/gangneung-cafe/

#강릉카페 #강릉여행 #안목`,
    xEn: `Gangneung cafes: pick on a review map before you go.
Anmok / Gyeongpo / old town — less wandering, better route.

${ORIGIN}/explore/gangneung-cafe/

#Gangneung #CafeHopping #KoreaTravel`,
    blog: `강릉 카페는 ‘분위기’와 ‘동선’이 갈려요.
안목·경포는 바다 뷰, 구도심·교동은 산책·작업하기 좋은 집이 많죠.

문제는 후기가 흩어져 있어서, 블로그를 여러 개 열어보며 위치를 맞추는 데 시간이 든다는 점입니다.
그래서 카페를 고를 때 지도에 핀이 찍힌 상태로 후기를 열어보면 동선이 한눈에 정리됩니다.

제가 쓰는 순서:
1) 강릉 카페 테마를 연다
2) 후기·픽이 있는 곳부터 본다
3) 안목만 보고 싶으면 검색으로 좁힌다
4) 하루면 카페 2~3곳만 고른다

강릉 카페 후기 지도:
${ORIGIN}/explore/gangneung-cafe/

바다까지 이어서 보려면:
${ORIGIN}/explore/gangneung-beach/
강릉 하루 전체:
${ORIGIN}/explore/gangneung-trip/

후기는 원문 링크로만 연결됩니다. 가기 전에 ‘지금 갈 만한지’만 빠르게 걸러 보세요.`,
    cafe: `강릉 카페, 후기 안 보고 가면 동선에서 후회하기 쉬워요.
지도+후기 미리보기: ${ORIGIN}/explore/gangneung-cafe/`,
  },
  "jeju-beach-1": {
    title: "제주 해변 추천, 가기 전에 후기로 비교하기",
    xKo: `제주 해변, 물때·바람·주차 후기만 먼저 보면 실패가 줄어요.
후기 지도: ${ORIGIN}/explore/jeju-beach/
#제주여행 #제주해변`,
    xEn: `Jeju beaches: check tide/wind/parking reviews first.
Map: ${ORIGIN}/explore/jeju-beach/
#Jeju #Beach`,
    blog: `제주 해변은 동·서·남 성격이 달라요.
물때·바람·주차 후기만 먼저 보면 실패가 줄어듭니다.

후기 있는 해변만 지도에 모아두고, 같은 날 카페까지 이어서 고르면 동선이 편해집니다.

제주 해변 후기 지도:
${ORIGIN}/explore/jeju-beach/
제주 전체 코스:
${ORIGIN}/explore/jeju-trip/`,
    cafe: `제주 해변, 후기 있는 곳만 지도로 먼저 비교해 보세요.
${ORIGIN}/explore/jeju-beach/`,
  },
  "seoul-cafe-1": {
    title: "서울 카페 고를 때 후기 지도부터 보는 습관",
    xKo: `서울 카페, 검색창보다 후기 지도 핀이 빠름.
성수·연남·한남: ${ORIGIN}/explore/seoul-cafe/
#서울카페`,
    xEn: `Seoul cafes: review pins beat endless search tabs.
${ORIGIN}/explore/seoul-cafe/
#Seoul #Cafe`,
    blog: `성수·연남·한남은 카페 밀도가 높아서 검색창만으로는 동선이 안 잡혀요.
저는 지도에서 후기 핀을 먼저 본 다음, 동네 검색으로 좁힙니다.

서울 카페 후기 지도:
${ORIGIN}/explore/seoul-cafe/`,
    cafe: `서울 카페, 검색 대신 후기 지도 핀부터.
${ORIGIN}/explore/seoul-cafe/`,
  },
  "gyeongju-1": {
    title: "경주 당일치기, 동선 짜기 전에 후기 지도",
    xKo: `경주 당일치기, 유적 순서부터.
후기 지도: ${ORIGIN}/explore/gyeongju-heritage/
#경주여행`,
    xEn: `Gyeongju day trip: lock the heritage order first.
${ORIGIN}/explore/gyeongju-heritage/
#Gyeongju`,
    blog: `경주는 이동이 길어서 순서가 곧 체력입니다.
문화유산 핀을 고른 뒤 걷기/차를 나누고, 점심·카페는 사이 공백에 끼우면 덜 꺾여요.

경주 후기 지도:
${ORIGIN}/explore/gyeongju-heritage/`,
    cafe: `경주 당일치기, 유적 핀+후기부터.
${ORIGIN}/explore/gyeongju-heritage/`,
  },
  "hanok-1": {
    title: "북촌·익선 가기 전에 후기·거리뷰부터",
    xKo: `북촌 가기 전 후기·거리뷰부터.
${ORIGIN}/explore/seoul-hanok/
#북촌 #익선동`,
    xEn: `Before Bukchon: reviews + street view first.
${ORIGIN}/explore/seoul-hanok/
#Bukchon #Seoul`,
    blog: `한옥·골목은 사진 스팟과 사람 많은 시간대가 핵심이에요.
후기로 분위기 확인한 뒤 나홀로 거리뷰로 한 바퀴 돌면 감이 옵니다.

서울 한옥 미리 보기:
${ORIGIN}/explore/seoul-hanok/`,
    cafe: `북촌 가기 전 후기·거리뷰부터.
${ORIGIN}/explore/seoul-hanok/`,
  },
  "jeonju-1": {
    title: "전주 한옥마을, 후기 지도로 혼잡 피하기",
    xKo: `전주 한옥마을, 후기로 혼잡 피하기.
${ORIGIN}/explore/jeonju-hanok/
#전주여행`,
    xEn: `Jeonju Hanok Village: dodge crowds with reviews first.
${ORIGIN}/explore/jeonju-hanok/
#Jeonju`,
    blog: `한옥마을은 주말 웨이팅이 큽니다.
오전·저녁 후기를 보고 시간을 고른 뒤, 골목·카페를 지도에서 이으세요.

전주 한옥: ${ORIGIN}/explore/jeonju-hanok/
전주 여행: ${ORIGIN}/explore/jeonju-trip/`,
    cafe: `전주 한옥마을, 후기로 혼잡 피하기.
${ORIGIN}/explore/jeonju-hanok/`,
  },
  "jeju-cafe-1": {
    title: "제주 카페, 오션뷰만 고르다 실패하지 않으려면",
    xKo: `제주 카페, 오션뷰만 고르다 깨지지 않으려면 후기 지도부터.
${ORIGIN}/explore/jeju-cafe/
#제주카페`,
    xEn: `Jeju cafes: ocean view isn’t enough — check reviews on a map.
${ORIGIN}/explore/jeju-cafe/
#Jeju #Cafe`,
    blog: `뷰만 보고 가면 웨이팅·주차에서 자주 깨집니다.
후기 있는 카페를 지도에 모은 뒤 동선을 짜세요.

제주 카페: ${ORIGIN}/explore/jeju-cafe/`,
    cafe: `제주 카페, 후기 있는 곳만 지도에.
${ORIGIN}/explore/jeju-cafe/`,
  },
  "gangneung-trip-1": {
    title: "강릉 당일치기, 카페·바다 순서부터",
    xKo: `강릉 당일치기, 해변 1 + 카페 2로 끊기.
${ORIGIN}/explore/gangneung-trip/
#강릉여행`,
    xEn: `Gangneung day trip: 1 beach + 2 cafes beats cramming everything.
${ORIGIN}/explore/gangneung-trip/
#Gangneung`,
    blog: `안목·경포·구도심을 하루에 다 넣으면 빠듯합니다.
해변 1 + 카페 2 정도로 끊고, 후기 지도에서 핀만 먼저 고르세요.

강릉 여행: ${ORIGIN}/explore/gangneung-trip/
강릉 카페: ${ORIGIN}/explore/gangneung-cafe/`,
    cafe: `강릉 당일치기, 후기 지도에서 순서부터.
${ORIGIN}/explore/gangneung-trip/`,
  },
};

function fallbackDraft(hook: GrowthHook): Omit<PostDraft, "id"> {
  const url = `${ORIGIN}${hook.landingPath}`;
  const tags = hook.hashtags.map((t) => `#${t}`).join(" ");
  return {
    title: hook.hook,
    blog: `${hook.body}

자세히 보기:
${url}

${tags}`,
    cafe: `${hook.hook}
${hook.body}
${url}`,
    xKo: `${hook.hook}
${hook.body}

${url}

${tags}`,
    xEn: `${hook.hook}
${hook.body}

${url}`,
  };
}

export function getPostDraft(hook: GrowthHook): PostDraft {
  const base = DRAFTS[hook.id] ?? fallbackDraft(hook);
  return { id: hook.id, ...base };
}

export function formatWeekBlogPosts(date = new Date()) {
  const { week, year, slots } = thisWeekHooks(date);
  const blocks = slots.map(({ day, hook }) => {
    const draft = getPostDraft(hook);
    return [
      `──── ${day} · 네이버 블로그 복붙 · ${hook.id} ────`,
      `제목: ${draft.title}`,
      "",
      draft.blog,
      "",
      `── 같은 날 카페/커뮤니티용 짧은 버전 ──`,
      draft.cafe,
      "",
    ].join("\n");
  });
  return [
    `📅 ${year}년 ${week}주차 · 영상 없이 글 3개 (복붙)`,
    "",
    "하는 법: 네이버 블로그에 붙여넣기 → 풍경너머 화면 캡처 1장만 넣기 → 발행",
    "쇼츠/유튜브 필요 없음. 한국 여행 키워드는 블로그가 보통 더 잘 먹힘.",
    "",
    ...blocks,
  ].join("\n");
}

export function formatWeekXPosts(date = new Date()) {
  const { week, year, slots } = thisWeekHooks(date);
  const blocks = slots.map(({ day, hook }) => {
    const draft = getPostDraft(hook);
    return [
      `──── ${day} · X 복붙 · ${hook.id} ────`,
      "",
      "【한글】",
      draft.xKo,
      "",
      "【English】",
      draft.xEn,
      "",
    ].join("\n");
  });
  return [
    `📅 ${year}년 ${week}주차 · X(트위터) 3개 (복붙)`,
    "",
    "하는 법: 붙여넣기 → 풍경너머 캡처 1장 첨부 → 게시. 한/영 중 하나만 써도 됨.",
    "같은 링크 하루 여러 번 도배하지 말 것.",
    "",
    ...blocks,
  ].join("\n");
}

export function allDraftIds() {
  return GROWTH_HOOKS.map((h) => h.id);
}
