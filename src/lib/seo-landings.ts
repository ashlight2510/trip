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
  /** Search-visible how-to body (indexable) */
  guide: string[];
  /** Related landing slugs for internal links */
  related: string[];
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
    descriptionEn: "Pick Gangneung cafes with reviews on the map before you go.",
    cityId: "kr-gangneung",
    category: "cafe",
    picksFirst: true,
    keywords: ["강릉 카페", "강릉 카페 추천", "안목 카페", "강릉 커피"],
    guide: [
      "강릉 카페는 ‘분위기’와 ‘동선’이 갈립니다. 안목·경포 쪽은 바다 뷰, 구도심·교동은 산책·작업하기 좋은 집이 많아요.",
      "풍경너머에서는 카페 핀을 고른 뒤 블로그·유튜브 후기 원문으로 바로 넘어갑니다. 본문을 베끼지 않고 링크로만 연결합니다.",
      "하루 일정이면 카페 2~3곳만 고른 다음 ‘하루 짜기’로 아침·오후 순서를 맞추면 덜 헤맵니다.",
    ],
    related: ["gangneung-beach", "seoul-cafe", "jeju-cafe"],
    faq: [
      {
        q: "강릉 카페는 어디서 고르면 되나요?",
        a: "이 페이지의 추천 목록과 지도 검색으로 후기가 붙은 카페·에디터 픽을 먼저 보세요.",
      },
      {
        q: "후기는 원문인가요?",
        a: "네. 블로그·유튜브는 원문 링크로 연결됩니다.",
      },
      {
        q: "안목 커피거리만 보고 싶어요.",
        a: "지도에서 ‘안목’으로 검색하거나 목록에서 견소동·안목 일대를 고르면 됩니다.",
      },
    ],
  },
  {
    slug: "gangneung-beach",
    title: "강릉 해변·바다 추천 — 후기 지도",
    titleEn: "Gangneung beaches — map + reviews",
    description:
      "경포·안목 등 강릉 해변을 후기와 지도로 미리 보세요. 카페·산책 동선까지 이어서 고를 수 있어요.",
    descriptionEn: "Preview Gangneung beaches with reviews before you go.",
    cityId: "kr-gangneung",
    category: "beach",
    picksFirst: true,
    keywords: ["강릉 해변", "경포대", "안목해변", "강릉 바다"],
    guide: [
      "강릉 해변은 시즌·바람·주차에 따라 체감이 크게 달라집니다. 가기 전 후기로 혼잡·뷰 포인트를 확인하세요.",
      "해변 핀을 고른 뒤 같은 지도에서 카페로 범위를 바꾸면 바로 근처 커피 스팟을 이을 수 있습니다.",
    ],
    related: ["gangneung-cafe", "sokcho-beach", "busan-beach"],
    faq: [
      {
        q: "경포대만 모아볼 수 있나요?",
        a: "장소 이름으로 검색하거나 지도를 경포 일대로 확대하면 주변 핀이 열립니다.",
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
    guide: [
      "제주 해변은 동·서·남이 성격이 다릅니다. 후기에서 ‘물때·바람·주차’만 먼저 보면 실패가 줄어요.",
      "해변을 고른 뒤 제주 카페 테마로 넘어가면 같은 날 동선이 자연스럽게 이어집니다.",
    ],
    related: ["jeju-cafe", "busan-beach", "gangneung-beach"],
    faq: [
      {
        q: "제주 해변만 모아볼 수 있나요?",
        a: "이 페이지는 제주 해변 카테고리만 모읍니다. 지도 앱에서 카페·맛집으로 범위를 넓힐 수 있어요.",
      },
    ],
  },
  {
    slug: "jeju-cafe",
    title: "제주 카페 추천 — 후기 지도로 미리 보기",
    titleEn: "Jeju cafes — preview on the map",
    description:
      "제주 카페를 후기·픽과 함께 지도에서 고르세요. 오션뷰·감성 카페를 가기 전에 비교할 수 있어요.",
    descriptionEn: "Browse Jeju cafes with reviews and picks on the map.",
    cityId: "kr-jeju",
    category: "cafe",
    picksFirst: true,
    keywords: ["제주 카페", "제주 카페 추천", "애월 카페", "제주 오션뷰 카페"],
    guide: [
      "제주 카페는 뷰와 웨이팅이 핵심입니다. 후기 썸네일·작성일만 훑어도 ‘지금’ 갈 만한지 감이 옵니다.",
      "동선이 길면 카페 2곳 + 해변 1곳으로 끊고, 풍경너머 하루 짜기로 순서를 고정하세요.",
    ],
    related: ["jeju-beach", "seogwipo-cafe", "gangneung-cafe"],
    faq: [
      {
        q: "애월·한림만 보고 싶어요.",
        a: "지도 검색에 동네 이름을 넣거나, 목록에서 해당 일대 장소를 고르면 됩니다.",
      },
    ],
  },
  {
    slug: "seogwipo-cafe",
    title: "서귀포 카페 추천 — 후기 지도",
    titleEn: "Seogwipo cafes — map + reviews",
    description:
      "서귀포·중문 일대 카페를 후기 지도로 미리 보세요. 제주 남쪽 동선을 짜기 전에 비교합니다.",
    descriptionEn: "Preview Seogwipo cafes with reviews before you plan the south loop.",
    cityId: "kr-seogwipo",
    category: "cafe",
    picksFirst: true,
    keywords: ["서귀포 카페", "중문 카페", "서귀포 카페 추천", "제주 남쪽 카페"],
    guide: [
      "서귀포는 올레·해변·카페가 한 묶음입니다. 카페만 모아본 뒤 해변 테마로 이어 보세요.",
    ],
    related: ["jeju-cafe", "jeju-beach"],
    faq: [
      {
        q: "중문만 필터되나요?",
        a: "서귀포 시 단위로 모읍니다. 중문은 검색어로 좁히면 됩니다.",
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
    guide: [
      "서울은 동네마다 카페 밀도가 높아 ‘검색’보다 ‘지도에서 후기 핀’이 빠릅니다.",
      "성수·연남·한남은 검색어로 바로 좁히고, 내 위치 모드로 근처부터 볼 수도 있어요.",
    ],
    related: ["seoul-hanok", "gangneung-cafe", "jeju-cafe"],
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
    guide: [
      "해운대와 광안리는 분위기·야경·혼잡이 다릅니다. 후기 몇 개만 비교해도 선택이 빨라집니다.",
      "해변 다음엔 부산 카페·맛집을 지도에서 같은 영역으로 이어서 보세요.",
    ],
    related: ["jeju-beach", "gangneung-beach", "sokcho-beach"],
    faq: [
      {
        q: "해운대만 보고 싶어요.",
        a: "장소 이름으로 검색하거나, 지도에서 해운대 일대를 확대하면 주변 핀이 열립니다.",
      },
    ],
  },
  {
    slug: "sokcho-beach",
    title: "속초 해변·바다 추천 — 후기 지도",
    titleEn: "Sokcho beaches — map + reviews",
    description:
      "속초·영랑 등 해변을 후기 지도로 미리 보세요. 카페·시장 동선까지 이어 고를 수 있어요.",
    descriptionEn: "Preview Sokcho beaches with reviews before you go.",
    cityId: "kr-sokcho",
    category: "beach",
    picksFirst: true,
    keywords: ["속초 해변", "속초 바다", "영랑해수욕장", "속초 여행"],
    guide: [
      "속초는 해변·시장·카페가 가까워 당일치기·1박에 잘 맞습니다. 후기로 주차·혼잡만 먼저 확인하세요.",
    ],
    related: ["gangneung-beach", "gangneung-cafe", "busan-beach"],
    faq: [
      {
        q: "설악·울산바위도 나오나요?",
        a: "이 페이지는 해변 위주입니다. 지도에서 명소·산으로 카테고리를 바꾸면 됩니다.",
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
    guide: [
      "경주는 이동 거리가 길어 ‘순서’가 곧 체력입니다. 유적 핀을 고른 뒤 하루 짜기로 걷기/차를 나누세요.",
      "점심·카페는 유적 사이 공백에 끼우면 동선이 덜 꺾입니다.",
    ],
    related: ["jeonju-hanok", "seoul-hanok", "gangneung-cafe"],
    faq: [
      {
        q: "하루 코스도 짜 주나요?",
        a: "지도에서 장소를 고른 뒤 ‘하루 짜기’로 아침·점심·오후·노을 동선을 만들 수 있어요.",
      },
    ],
  },
  {
    slug: "jeonju-hanok",
    title: "전주 한옥마을 여행 — 후기 지도로 미리 보기",
    titleEn: "Jeonju Hanok Village — preview with reviews",
    description:
      "전주 한옥·골목·문화유산을 후기 지도로 미리 보세요. 맛집·카페 동선도 이어서 고를 수 있어요.",
    descriptionEn: "Preview Jeonju hanok streets with reviews before you walk.",
    cityId: "kr-jeonju",
    category: "heritage",
    picksFirst: true,
    keywords: ["전주 한옥마을", "전주 여행", "전주 한옥", "전주 당일치기"],
    guide: [
      "한옥마을은 주말 혼잡이 큽니다. 후기에서 ‘사람 많은 시간대’를 보고 오전/저녁을 고르세요.",
      "유적·골목 핀을 고른 뒤 지도에서 카페·맛집으로 범위를 넓히면 하루가 완성됩니다.",
    ],
    related: ["seoul-hanok", "gyeongju-heritage", "seoul-cafe"],
    faq: [
      {
        q: "한옥마을만 나오나요?",
        a: "전주 문화유산·명소 위주입니다. 동네 이름은 검색으로 좁히면 됩니다.",
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
    guide: [
      "북촌·익선은 사진 스팟과 골목 동선이 핵심입니다. 후기·거리뷰로 한 바퀴 돈 뒤 카페를 이으세요.",
    ],
    related: ["seoul-cafe", "jeonju-hanok", "gyeongju-heritage"],
    faq: [
      {
        q: "한옥만 나오나요?",
        a: "문화유산·명소 위주로 모으고, 지도에서 카페로 필터를 바꾸면 같은 동네 카페도 볼 수 있어요.",
      },
    ],
  },
  {
    slug: "gangneung-trip",
    title: "강릉 여행 코스 — 후기 지도로 하루 짜기",
    titleEn: "Gangneung trip — plan a day on the map",
    description:
      "강릉 여행 가기 전, 카페·해변·명소를 후기 지도에서 고르세요. 풍경너머에서 동선을 미리 잡아 둡니다.",
    descriptionEn: "Plan a Gangneung day with cafes, beaches, and reviews on the map.",
    cityId: "kr-gangneung",
    picksFirst: true,
    keywords: ["강릉 여행", "강릉 당일치기", "강릉 코스", "강릉 가볼만한곳"],
    guide: [
      "강릉은 안목·경포·구도심을 하루에 다 넣으면 빠듯합니다. 해변 1 + 카페 2 정도로 끊으세요.",
      "이 페이지는 강릉 전체 카테고리를 후기·픽 순으로 모읍니다. 카페·해변만 보려면 아래 테마로 이어 가세요.",
    ],
    related: ["gangneung-cafe", "gangneung-beach", "sokcho-beach"],
    faq: [
      {
        q: "당일치기 가능한가요?",
        a: "가능합니다. 장소를 고른 뒤 지도의 ‘하루 짜기’로 순서를 고정하면 덜 헤맵니다.",
      },
    ],
  },
  {
    slug: "jeju-trip",
    title: "제주 여행 코스 — 후기 지도로 미리 짜기",
    titleEn: "Jeju trip — plan with reviews on the map",
    description:
      "제주 여행 동선을 후기 지도로 미리 짜 보세요. 해변·카페·명소를 한곳에서 고른 뒤 이어 갑니다.",
    descriptionEn: "Plan Jeju days with beaches, cafes, and reviews on one map.",
    cityId: "kr-jeju",
    picksFirst: true,
    keywords: ["제주 여행", "제주 코스", "제주 가볼만한곳", "제주 당일치기"],
    guide: [
      "제주는 동·서가 멀어서 ‘하루에 한쪽’이 안전합니다. 후기로 혼잡·주차만 먼저 보세요.",
      "서귀포 일정이면 서귀포 카페 테마로, 해변 위주면 제주 해변 테마로 좁히세요.",
    ],
    related: ["jeju-beach", "jeju-cafe", "seogwipo-cafe"],
    faq: [
      {
        q: "렌트카 없이 짜도 되나요?",
        a: "가능하지만 범위가 좁아집니다. 지도에서 한 권역만 고른 뒤 하루 짜기를 쓰세요.",
      },
    ],
  },
  {
    slug: "sokcho-trip",
    title: "속초 여행 — 후기 지도로 미리 보기",
    titleEn: "Sokcho trip — preview with reviews",
    description:
      "속초 여행 전 해변·카페·명소를 후기 지도에서 고르세요. 당일·1박 동선을 미리 정리합니다.",
    descriptionEn: "Preview Sokcho beaches, cafes, and spots before you go.",
    cityId: "kr-sokcho",
    picksFirst: true,
    keywords: ["속초 여행", "속초 당일치기", "속초 가볼만한곳", "속초 코스"],
    guide: [
      "속초는 이동이 짧아 당일에 잘 맞습니다. 해변·시장·카페 순으로 핀만 찍어 두세요.",
    ],
    related: ["sokcho-beach", "gangneung-trip", "gangneung-cafe"],
    faq: [
      {
        q: "설악산도 포함되나요?",
        a: "속초 시 장소 위주입니다. 산·명소를 더 보려면 지도에서 검색해 이어 가세요.",
      },
    ],
  },
  {
    slug: "jeonju-trip",
    title: "전주 여행 — 한옥마을·맛집 후기 지도",
    titleEn: "Jeonju trip — hanok & food on the map",
    description:
      "전주 여행 가기 전 한옥·맛집·카페를 후기 지도로 미리 보세요. 주말 혼잡을 피하기 좋습니다.",
    descriptionEn: "Preview Jeonju hanok, food, and cafes with reviews before you go.",
    cityId: "kr-jeonju",
    picksFirst: true,
    keywords: ["전주 여행", "전주 당일치기", "전주 가볼만한곳", "전주 코스"],
    guide: [
      "한옥마을은 오전·저녁이 덜 붐빕니다. 후기에서 웨이팅 언급을 보고 시간을 고르세요.",
      "한옥만 깊게 보려면 전주 한옥 테마로 이어 가세요.",
    ],
    related: ["jeonju-hanok", "seoul-hanok", "gyeongju-heritage"],
    faq: [
      {
        q: "맛집도 나오나요?",
        a: "이 페이지는 전주 전 카테고리를 모읍니다. 목록에서 맛집·카페를 고르면 됩니다.",
      },
    ],
  },
  {
    slug: "busan-trip",
    title: "부산 여행 코스 — 해변·카페 후기 지도",
    titleEn: "Busan trip — beaches & cafes on the map",
    description:
      "부산 여행을 후기 지도로 미리 짜 보세요. 해운대·광안리와 주변 카페를 한곳에서 고릅니다.",
    descriptionEn: "Plan Busan with beaches and cafes, backed by reviews on the map.",
    cityId: "kr-busan",
    picksFirst: true,
    keywords: ["부산 여행", "부산 코스", "부산 가볼만한곳", "해운대 여행"],
    guide: [
      "해운대와 광안리를 하루에 다 넣으면 체력이 갑니다. 해변 하나 + 카페·야경으로 끊으세요.",
    ],
    related: ["busan-beach", "jeju-trip", "seoul-cafe"],
    faq: [
      {
        q: "지하철만으로 가능한가요?",
        a: "해운대·광안리 권역은 가능합니다. 지도에서 같은 권역 핀만 모아 하루 짜기를 쓰세요.",
      },
    ],
  },
];

export function getSeoLanding(slug: string): SeoLanding | undefined {
  return SEO_LANDINGS.find((l) => l.slug === slug);
}

export { seoLandingPath } from "@/lib/seo-paths";

export function relatedLandings(landing: SeoLanding): SeoLanding[] {
  return landing.related
    .map((slug) => getSeoLanding(slug))
    .filter((l): l is SeoLanding => Boolean(l));
}
