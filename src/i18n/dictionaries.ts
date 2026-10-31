import type { Place } from "@/db/schema";

export type Locale = "ko" | "en";

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "pn_lang";

const categoriesKo: Record<Place["category"], string> = {
  beach: "해변",
  cafe: "카페",
  forest: "숲",
  market: "시장",
  heritage: "문화유산",
  landmark: "명소",
  restaurant: "맛집",
  park: "공원",
  street: "거리",
  viewpoint: "전망",
};

const categoriesEn: Record<Place["category"], string> = {
  beach: "Beach",
  cafe: "Cafe",
  forest: "Forest",
  market: "Market",
  heritage: "Heritage",
  landmark: "Landmark",
  restaurant: "Food",
  park: "Park",
  street: "Street",
  viewpoint: "Viewpoint",
};

export const dictionaries = {
  ko: {
    brand: "풍경너머",
    mapTitle: "여행지 지도",
    mapBlurb:
      "시 → 구·동 → 장소. 후기는 장소당 최대 10개(블로그 적합도·유튜브 조회수) 원문 링크로 연결합니다. 직접 연결하면 포인트가 쌓여요.",
    allCities: "전체 시",
    searchLabel: "통합검색",
    searchPlaceholderNationwide: "숲카페, 경복궁, 해운대… (전국)",
    searchPlaceholderNear: "근처 숲카페, 카페, 해변…",
    scopeNationwide: "전국",
    scopeNearMe: "내 위치",
    loadingNearby: "주변 장소를 불러오는 중…",
    searchResults: (places: number, cities: number) =>
      `검색 · 장소 ${places}건${cities ? ` · 시 ${cities}` : ""}`,
    loadedCount: (title: string, n: number) => `${title} · 로드 ${n}곳`,
    categoryFilter: "장소 카테고리 필터",
    all: "전체",
    pickCity: "시 선택",
    districtLevel: (city: string) => `${city} · 구·동`,
    placeLevel: (district: string) => `${district} · 장소`,
    placesCount: (n: number) => `${n}곳`,
    linkedReviews: (n: number) => `연결된 후기 ${n}건`,
    goToCity: "시로 이동",
    citiesSection: "시",
    districtsSection: "구·동",
    emptySearch: "검색 결과가 없어요",
    loadingMap: "지도를 불러오는 중…",
    soloTrip: "나홀로 여행 떠나기 · 거리뷰",
    close: "닫기",
    viewOriginal: "원문 보기 →",
    viewVideo: "영상 보기 →",
    langKo: "한",
    langEn: "EN",
    category: categoriesKo,
    trip: {
      roadview: "거리뷰",
      travel: "지도 여행",
      photo: "현장 사진",
      video: "영상",
      holdHandsHint: "손을 잡은 채 거리뷰를 둘러보세요. 화살표를 눌러 길을 따라 걸을 수 있어요.",
      exploreHint: "거리뷰를 드래그해 둘러보고, 화살표로 길을 따라 걸어 보세요.",
      soundOn: "소리 켜기",
      soundOff: "소리 끄기",
      noTimer: "타이머 없음",
      minutesLater: (m: number) => `${m}분 후 끄기`,
      startRoadview: "거리뷰로 떠나기",
      startWithCompanion: (label: string) => `${label} · 손잡고 떠나기`,
      envSynth: "환경음: Web Audio 실시간 합성",
      missingKey:
        "로드뷰 키가 없어 대체 화면이에요. .env.local 에 NEXT_PUBLIC_KAKAO_MAP_KEY 를 넣으면 거리뷰가 켜집니다.",
      loadFailed: "로드뷰를 불러오지 못했어요. 잠시 후 다시 시도해 보세요.",
    },
  },
  en: {
    brand: "Pungyeong Neomeo",
    mapTitle: "Travel map",
    mapBlurb:
      "City → district → place. Reviews link out to the original (up to 10 per place). Connect your own links to earn points.",
    allCities: "All cities",
    searchLabel: "Search",
    searchPlaceholderNationwide: "Forest cafe, temple, beach… (nationwide)",
    searchPlaceholderNear: "Nearby cafe, beach, park…",
    scopeNationwide: "Nationwide",
    scopeNearMe: "Near me",
    loadingNearby: "Loading nearby places…",
    searchResults: (places: number, cities: number) =>
      `Search · ${places} places${cities ? ` · ${cities} cities` : ""}`,
    loadedCount: (title: string, n: number) => `${title} · ${n} loaded`,
    categoryFilter: "Place category filter",
    all: "All",
    pickCity: "Choose a city",
    districtLevel: (city: string) => `${city} · Districts`,
    placeLevel: (district: string) => `${district} · Places`,
    placesCount: (n: number) => `${n}`,
    linkedReviews: (n: number) => `${n} linked reviews`,
    goToCity: "Open city",
    citiesSection: "Cities",
    districtsSection: "Districts",
    emptySearch: "No results",
    loadingMap: "Loading map…",
    soloTrip: "Solo trip · Street view",
    close: "Close",
    viewOriginal: "Open original →",
    viewVideo: "Watch video →",
    langKo: "한",
    langEn: "EN",
    category: categoriesEn,
    trip: {
      roadview: "Street view",
      travel: "Map travel",
      photo: "Photos",
      video: "Video",
      holdHandsHint: "Hold hands and look around. Use the arrows to walk the path.",
      exploreHint: "Drag to look around, then follow the arrows along the road.",
      soundOn: "Unmute",
      soundOff: "Mute",
      noTimer: "No timer",
      minutesLater: (m: number) => `Off in ${m} min`,
      startRoadview: "Start street view",
      startWithCompanion: (label: string) => `${label} · Hold hands`,
      envSynth: "Ambience: live Web Audio",
      missingKey: "Street view needs NEXT_PUBLIC_KAKAO_MAP_KEY in .env.local.",
      loadFailed: "Couldn’t load street view. Try again in a moment.",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "ko" || v === "en";
}
