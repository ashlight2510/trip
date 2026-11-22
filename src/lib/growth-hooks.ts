/**
 * Copy-paste hooks for Shorts / Reels / blog / cafe posts.
 * Post 3×/week. Always end with trip.funnyfunny.cloud + one explore landing.
 */
export type GrowthHook = {
  id: string;
  channel: "shorts" | "blog" | "cafe";
  hook: string;
  body: string;
  cta: string;
  landingPath: string;
};

export const GROWTH_HOOKS: GrowthHook[] = [
  {
    id: "gangneung-cafe-1",
    channel: "shorts",
    hook: "강릉 카페, 후기 안 보고 가면 후회하는 이유",
    body: "지도에 카페 찍고 → 블로그·유튜브 후기 바로 열기. 안목부터 에디터 픽까지.",
    cta: "풍경너머에서 강릉 카페 미리 보기",
    landingPath: "/explore/gangneung-cafe/",
  },
  {
    id: "jeju-beach-1",
    channel: "shorts",
    hook: "제주 해변, 가기 전에 지도로 비교해 봤더니",
    body: "후기 있는 해변만 모아두고 주변 카페까지 이어서 고르기.",
    cta: "제주 해변 후기 지도 열기",
    landingPath: "/explore/jeju-beach/",
  },
  {
    id: "seoul-cafe-1",
    channel: "blog",
    hook: "서울 카페 고를 때 후기 지도부터 보는 습관",
    body: "성수·연남·한남… 검색 대신 지도에서 후기 핀을 먼저 보면 동선이 정리됩니다.",
    cta: "서울 카페 후기 지도 — 풍경너머",
    landingPath: "/explore/seoul-cafe/",
  },
  {
    id: "busan-beach-1",
    channel: "shorts",
    hook: "해운대 vs 광안리, 후기로 먼저 비교",
    body: "부산 해변을 지도에 올려두고 원문 후기만 눌러 보기.",
    cta: "부산 해변 미리 보기",
    landingPath: "/explore/busan-beach/",
  },
  {
    id: "gyeongju-1",
    channel: "cafe",
    hook: "경주 당일치기, 동선 짜기 전에 이거",
    body: "문화유산 핀 + 후기 + 하루 짜기. 걷기/차로만 표시해 두면 덜 헤맵니다.",
    cta: "경주 후기 지도",
    landingPath: "/explore/gyeongju-heritage/",
  },
  {
    id: "hanok-1",
    channel: "shorts",
    hook: "북촌 가기 전에 거리뷰·후기부터",
    body: "한옥·골목 분위기 장소를 지도에서 고르고 나홀로 거리뷰로 한 바퀴.",
    cta: "서울 한옥 미리 보기",
    landingPath: "/explore/seoul-hanok/",
  },
];

export function formatHookForPost(hook: GrowthHook, origin = "https://trip.funnyfunny.cloud") {
  return [
    hook.hook,
    "",
    hook.body,
    "",
    `${hook.cta}`,
    `${origin}${hook.landingPath}`,
  ].join("\n");
}
