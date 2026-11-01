/**
 * Curation policy for 풍경너머.
 *
 * We do NOT scrape or rehost blog/video bodies.
 * We only store search-API metadata + outbound links, then show a curated set.
 *
 * Ranking signals (what we can actually get legally via APIs):
 * - Naver blog search: no view count — visit-intent score on title/snippet + search rank
 * - YouTube Data API: viewCount (prefer high-view visit videos)
 * - Manual editor boost via `score` overrides
 *
 * Caps keep the map usable as the catalog grows.
 */
export const MAX_SOURCES_PER_REGION = 3;
export const MAX_SOURCES_PER_PLACE = 10;
/** Preferred mix when YouTube is available (~7 blogs + ~3 videos). */
export const MAX_BLOG_SOURCES_PER_PLACE = 7;
export const MAX_YOUTUBE_SOURCES_PER_PLACE = 3;

/** How many places to seed per city when first collecting. */
export const MAX_PLACES_PER_CITY = 300;

/** Points for community link contributions (spendable later — TBD). */
export const CONTRIB_POINTS = {
  linked: 15,
  duplicate: 2,
  pending: 5,
} as const;

/** Soft cap per anonymous contributor per UTC day. */
export const MAX_CONTRIB_PER_DAY = 40;

/**
 * Community +/- on place↔source links.
 * Net score ≤ this hides the link from the map/trip UI (row kept for later restore).
 */
export const SOURCE_VOTE_HIDE_AT = -3;

/** Kakao/Naver query packs per place category — used by collectors. */
export const categorySearchHints: Record<string, string[]> = {
  beach: ["해수욕장", "해변", "가볼만한곳"],
  cafe: ["카페", "베이커리", "뷰맛집", "숲카페", "정원카페", "감성카페"],
  forest: ["숲", "수목원", "휴양림", "산책"],
  market: ["시장", "먹거리골목", "가볼만한곳"],
  heritage: ["문화재", "한옥", "사찰", "궁", "관람"],
  landmark: ["관광명소", "가볼만한곳", "여행"],
  restaurant: ["맛집", "내돈내산"],
  park: ["공원", "산책", "피크닉"],
  street: ["거리", "산책로", "야경"],
  viewpoint: ["전망대", "야경", "일몰"],
};

/** Categories we prioritize for solo travel / map pins. */
export const VISIT_PRIORITY_CATEGORIES: ReadonlySet<string> = new Set([
  "landmark",
  "heritage",
  "park",
  "forest",
  "beach",
  "viewpoint",
  "street",
  "market",
]);

/** Place name hard drops (seed + purge). */
export const PLACE_HARD_DROP_NAME =
  /편의점|CU\b|GS25|세븐일레븐|이마트24|병원|의원|클리닉|치과|한의원|약국|학원|교습소|부동산|공인중개|은행|저축은행|금고|주유소|충전소|전기차\s*충전|EV\s*충전|수소\s*충전|charging\s*station|주차장|주차타워|관공서|주민센터|출장소|파출소|지구대|우체국|헬스장|휘트니스|세탁|부동산중개|공중\s*화장실|화장실|toilet|restroom|\bWC\b/i;

/** Kakao category_name / address free-text hard drops. */
export const PLACE_HARD_DROP_CATEGORY_TEXT =
  /아파트|부동산|중개|학원|병원|의원|치과|약국|은행|주유소|충전소|전기차|charging|주차장|편의점|관공서|행정복지|주민센터|헬스|사우나|고시원|원룸|오피스텔|모텔|유흥|노래방|당구|화장실|toilet|restroom/i;

const FRANCHISE =
  /스타벅스|매머드|투썸|이디야|메가커피|메가엠지씨|컴포즈|빽다방|할리스|폴바셋|엔제리너스|커피빈|파리바게뜨|파리바게트|던킨|배스킨|노브랜드|다이소|롯데리아|맥도날드|버거킹|KFC|서브웨이|설빙|공차|탐앤탐스|카페베네|배스킨라빈스|뚜레쥬르|이삭|교촌|BBQ|네네치킨|맘스터치/i;

export function isFranchiseChainName(name: string) {
  return FRANCHISE.test(name);
}

/** Visit-score threshold by category (stricter for food). */
export function visitScoreThreshold(category: string): number {
  if (category === "cafe" || category === "restaurant") return 50;
  return 45;
}

/** Stub / search-page providers — never treat as real reviews. */
export const STUB_SOURCE_PROVIDERS = [
  "naver_blog_search",
  "daum_blog_search",
  "kakao_map",
] as const;
