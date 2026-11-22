/**
 * Copy-paste hooks for Shorts / Reels / blog / cafe posts.
 * Post 3×/week. Always end with trip.funnyfunny.cloud + one explore landing.
 */
export type GrowthHook = {
  id: string;
  channel: "shorts" | "blog" | "cafe";
  hook: string;
  body: string;
  /** 15–30s shorts shot list */
  shots?: string[];
  hashtags: string[];
  cta: string;
  landingPath: string;
};

export const GROWTH_HOOKS: GrowthHook[] = [
  {
    id: "gangneung-cafe-1",
    channel: "shorts",
    hook: "강릉 카페, 후기 안 보고 가면 후회하는 이유",
    body: "지도에 카페 찍고 → 블로그·유튜브 후기 바로 열기. 안목부터 에디터 픽까지.",
    shots: [
      "1) 지도 핀이 찍히는 화면",
      "2) 후기 카드 스크롤",
      "3) ‘강릉 카페’ 랜딩 URL 고정",
    ],
    hashtags: ["강릉카페", "강릉여행", "안목카페", "카페추천", "풍경너머"],
    cta: "풍경너머에서 강릉 카페 미리 보기",
    landingPath: "/explore/gangneung-cafe/",
  },
  {
    id: "jeju-beach-1",
    channel: "shorts",
    hook: "제주 해변, 가기 전에 지도로 비교해 봤더니",
    body: "후기 있는 해변만 모아두고 주변 카페까지 이어서 고르기.",
    shots: ["1) 해변 핀 비교", "2) 후기 원문 탭", "3) URL 엔딩"],
    hashtags: ["제주여행", "제주변", "제주해변", "여행팁", "풍경너머"],
    cta: "제주 해변 후기 지도 열기",
    landingPath: "/explore/jeju-beach/",
  },
  {
    id: "seoul-cafe-1",
    channel: "blog",
    hook: "서울 카페 고를 때 후기 지도부터 보는 습관",
    body: "성수·연남·한남… 검색 대신 지도에서 후기 핀을 먼저 보면 동선이 정리됩니다. 풍경너머 서울 카페 테마에서 픽·후기 순으로 모아보세요.",
    hashtags: ["서울카페", "성수카페", "연남카페", "카페지도", "풍경너머"],
    cta: "서울 카페 후기 지도 — 풍경너머",
    landingPath: "/explore/seoul-cafe/",
  },
  {
    id: "busan-beach-1",
    channel: "shorts",
    hook: "해운대 vs 광안리, 후기로 먼저 비교",
    body: "부산 해변을 지도에 올려두고 원문 후기만 눌러 보기.",
    shots: ["1) 해운대 핀", "2) 광안리 핀", "3) 후기 스와이프 → URL"],
    hashtags: ["부산여행", "해운대", "광안리", "부산바다", "풍경너머"],
    cta: "부산 해변 미리 보기",
    landingPath: "/explore/busan-beach/",
  },
  {
    id: "gyeongju-1",
    channel: "cafe",
    hook: "경주 당일치기, 동선 짜기 전에 이거",
    body: "문화유산 핀 + 후기 + 하루 짜기. 걷기/차로만 표시해 두면 덜 헤맵니다.",
    hashtags: ["경주여행", "경주당일치기", "불국사", "경주코스", "풍경너머"],
    cta: "경주 후기 지도",
    landingPath: "/explore/gyeongju-heritage/",
  },
  {
    id: "hanok-1",
    channel: "shorts",
    hook: "북촌 가기 전에 거리뷰·후기부터",
    body: "한옥·골목 분위기 장소를 지도에서 고르고 나홀로 거리뷰로 한 바퀴.",
    shots: ["1) 북촌 핀", "2) 거리뷰 한 컷", "3) URL"],
    hashtags: ["북촌한옥", "익선동", "서울여행", "한옥골목", "풍경너머"],
    cta: "서울 한옥 미리 보기",
    landingPath: "/explore/seoul-hanok/",
  },
  {
    id: "jeonju-1",
    channel: "blog",
    hook: "전주 한옥마을, 후기 지도로 혼잡 피하기",
    body: "주말 웨이팅 전에 후기·골목 핀부터. 전주 한옥 테마에서 명소만 모은 뒤 카페로 이으세요.",
    hashtags: ["전주한옥마을", "전주여행", "전주당일치기", "풍경너머"],
    cta: "전주 한옥 후기 지도",
    landingPath: "/explore/jeonju-hanok/",
  },
  {
    id: "jeju-cafe-1",
    channel: "shorts",
    hook: "제주 카페, 오션뷰만 고르다 실패한 날",
    body: "후기 있는 카페만 지도에 모아두고 동선 짜기.",
    shots: ["1) 제주 카페 핀", "2) 후기 썸네일", "3) URL"],
    hashtags: ["제주카페", "애월카페", "제주여행", "풍경너머"],
    cta: "제주 카페 미리 보기",
    landingPath: "/explore/jeju-cafe/",
  },
];

export function formatHookForPost(hook: GrowthHook, origin = "https://trip.funnyfunny.cloud") {
  const lines = [hook.hook, "", hook.body];
  if (hook.shots?.length) {
    lines.push("", "화면:", ...hook.shots.map((s) => `- ${s}`));
  }
  lines.push(
    "",
    `${hook.cta}`,
    `${origin}${hook.landingPath}`,
    "",
    hook.hashtags.map((t) => `#${t}`).join(" "),
  );
  return lines.join("\n");
}

/** ISO week number (Mon-based) for rotating the weekly 3 posts. */
export function isoWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const WEEKDAY_LABELS = ["월", "수", "금"] as const;

/** Always 3 posts: rotate through the hook pool by ISO week. */
export function thisWeekHooks(date = new Date()): {
  week: number;
  year: number;
  slots: { day: (typeof WEEKDAY_LABELS)[number]; hook: GrowthHook }[];
} {
  const week = isoWeekNumber(date);
  const year = date.getFullYear();
  const start = (week * 3) % GROWTH_HOOKS.length;
  const slots = WEEKDAY_LABELS.map((day, i) => ({
    day,
    hook: GROWTH_HOOKS[(start + i) % GROWTH_HOOKS.length],
  }));
  return { week, year, slots };
}
