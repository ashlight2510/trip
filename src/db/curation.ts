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

/** Kakao/Naver query packs per place category — used by collectors. */
export const categorySearchHints: Record<string, string[]> = {
  beach: ["해수욕장", "해변"],
  cafe: ["카페", "베이커리"],
  forest: ["숲", "수목원", "휴양림"],
  market: ["시장", "먹거리골목"],
  heritage: ["문화재", "한옥", "사찰", "궁"],
  landmark: ["관광명소", "가볼만한곳"],
  restaurant: ["맛집"],
  park: ["공원"],
  street: ["거리", "산책로"],
  viewpoint: ["전망대", "야경"],
};
