import type { Place } from "@/db/schema";

export type SeoLanding = {
  slug: string;
  /** Primary Korean search intent */
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  /** Optional city filter (regions id) */
  cityId?: string;
  /** Optional category filter */
  category?: Place["category"];
  /** Prefer picks / reviewed places first */
  picksFirst?: boolean;
  keywords: string[];
  faq: { q: string; a: string }[];
};

/** High-intent landings only — deepen these, don't spam thin pages. */
export const SEO_LANDINGS: SeoLanding[] = [
  {
    slug: "gangneung-cafe",
    title: "강릉 카페 추천 — 후기 지도로 미리 보기",
    titleEn: "Gangneung cafes — preview on the map",
    description:
      "강릉 카페를 후기·지도와 함께 고르세요. 안목 커피거리부터 에디터 픽까지, 가기 전에 풍경너머에서 미리 둘러봅니다.",
    descriptionEn:
      "Pick Gangneung cafes with reviews on the map before you go.",
    cityId: "kr-gangneung",
    category: "cafe",
    picksFirst: true,
    keywords: ["강릉 카페", "강릉 카페 추천", "안목 카페", "강릉 커피"],
    faq: [
      {
        q: "강릉 카페는 어디서 고르면 되나요?",
        a: "풍경너머 강릉 카페 페이지에서 후기가 붙은 장소와 에디터 픽을 지도와 함께 볼 수 있어요.",
      },
      {
        q: "후기는 원문인가요?",
        a: "네. 블로그·유튜브는 원문 링크로 연결됩니다. 본문을 베끼지 않고 링크로만 연결합니다.",
      },
    ],
  },
  {
    slug: "jeju-beach",
    title: "제주 해변 추천 — 후기·지도로 미리 보기",
    titleEn: "Jeju beaches — preview with reviews",
    description:
      "제주 해변을 후기와 지도로 비교하세요. 가기 전에 풍경너머에서 주변 카페·전망까지 이어서 볼 수 있어요.",
    descriptionEn: "Compare Jeju beaches with reviews on the map before you go.",
    cityId: "kr-jeju",
    category: "beach",
    picksFirst: true,
    keywords: ["제주 해변", "제주 바다", "제주 해수욕장", "제주 여행"],
    faq: [
      {
        q: "제주 해변만 모아볼 수 있나요?",
        a: "이 페이지는 제주 해변 카테고리만 모읍니다. 지도 앱에서 카페·맛집으로 범위를 넓힐 수 있어요.",
      },
    ],
  },
  {
    slug: "seoul-cafe",
    title: "서울 카페 추천 — 후기 지도로 미리 보기",
    titleEn: "Seoul cafes — preview on the map",
    description:
      "서울 카페를 후기·픽과 함께 지도에서 고르세요. 성수·연남·한남 등 인기 동네도 검색으로 바로 이어집니다.",
    descriptionEn: "Browse Seoul cafes with reviews and editor picks on the map.",
    cityId: "kr-seoul",
    category: "cafe",
    picksFirst: true,
    keywords: ["서울 카페", "서울 카페 추천", "성수 카페", "연남 카페"],
    faq: [
      {
        q: "내 위치 근처 카페도 보나요?",
        a: "지도 홈에서 ‘내 위치’를 켜면 주변부터 보여 줍니다. 이 랜딩은 서울 카페 검색 유입용 모음입니다.",
      },
    ],
  },
  {
    slug: "busan-beach",
    title: "부산 해변·바다 추천 — 후기 지도",
    titleEn: "Busan beaches — map + reviews",
    description:
      "해운대·광안리 등 부산 해변을 후기와 함께 미리 보세요. 풍경너머에서 주변 카페·맛집도 이어서 고를 수 있어요.",
    descriptionEn: "Preview Busan beaches with reviews, then add cafes nearby.",
    cityId: "kr-busan",
    category: "beach",
    picksFirst: true,
    keywords: ["부산 해변", "해운대", "광안리", "부산 바다"],
    faq: [
      {
        q: "해운대만 보고 싶어요.",
        a: "장소 이름으로 검색하거나, 지도에서 해운대 일대를 확대하면 주변 핀이 열립니다.",
      },
    ],
  },
  {
    slug: "gyeongju-heritage",
    title: "경주 문화유산·여행 — 후기 지도로 하루 짜기",
    titleEn: "Gyeongju heritage — plan a day on the map",
    description:
      "경주 문화유산과 주변 장소를 후기 지도로 모읍니다. 하루 코스를 짜기 전에 풍경너머에서 미리 동선을 잡아 보세요.",
    descriptionEn: "Gather Gyeongju heritage stops with reviews before you plan the day.",
    cityId: "kr-gyeongju",
    category: "heritage",
    picksFirst: true,
    keywords: ["경주 여행", "경주 유적", "불국사", "경주 당일치기"],
    faq: [
      {
        q: "하루 코스도 짜 주나요?",
        a: "지도에서 장소를 고른 뒤 ‘하루 짜기’로 아침·점심·오후·노을 동선을 만들 수 있어요.",
      },
    ],
  },
  {
    slug: "seoul-hanok",
    title: "서울 한옥·골목 여행 — 북촌·익선 미리 보기",
    titleEn: "Seoul hanok streets — Bukchon & Ikseon preview",
    description:
      "북촌·익선 등 서울 한옥·골목 분위기를 후기와 지도로 미리 보세요. 주변 카페 픽도 함께 이어집니다.",
    descriptionEn: "Preview Seoul hanok and alley vibes with reviews before you walk.",
    cityId: "kr-seoul",
    category: "heritage",
    picksFirst: true,
    keywords: ["북촌 한옥", "익선동", "서울 한옥", "북촌 카페"],
    faq: [
      {
        q: "한옥만 나오나요?",
        a: "문화유산·명소 위주로 모으고, 지도에서 카페로 필터를 바꾸면 같은 동네 카페도 볼 수 있어요.",
      },
    ],
  },
];

export function getSeoLanding(slug: string): SeoLanding | undefined {
  return SEO_LANDINGS.find((l) => l.slug === slug);
}

export function seoLandingPath(slug: string): string {
  return `/explore/${slug}/`;
}
