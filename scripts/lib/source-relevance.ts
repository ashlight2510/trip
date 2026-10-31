/**
 * Visit-intent scoring for blog/video metadata (title + snippet only).
 * Naver has no view count — we gate on place-name match + travel/food signals.
 */
import { categorySearchHints, visitScoreThreshold } from "../../src/db/curation";
import type { Place } from "../../src/db/schema";

/** Default drop below this (0–100); food categories use a higher bar via visitScoreThreshold. */
export const VISIT_SCORE_THRESHOLD = 45;

const JUNK =
  /체험단|원고료|광고|협찬|쿠팡파트너스|클릭하면|제휴마케팅|수익인증|도배|sitemap|버스\s*노선|버스시간표|시내버스\s*\d|나라장터|입찰|채용|구인|원룸|오피스텔|분양|대출|보험|주식|코인|세무|변호사|피부과|치과|성형|인테리어견적|살인|사건\s*사고|용의자|검거|유족|공무원연금|학암집|번역을?\s*읽고|를\s*읽고|오타쿠\s*투어|굿즈샵|가챠샵|특전\s*뭐\s*받|CGV|메가박스|롯데시네마|대리\s*운전|출장\s*안마|성인\s*용품|토토|스포츠토토|카지노|바카라|식권\s*대장|쿠폰\s*모음|최저가\s*비교\s*사이트/i;

/** Soft announcements without a real visit story — reject unless visit/practical signals also fire. */
const WEAK_ANNOUNCE =
  /신규\s*오픈\s*매장\s*안내|오픈\s*매장\s*안내|매장\s*안내|이전\s*안내|휴점\s*안내|채용\s*공고|모집\s*공고|행사\s*일정\s*총정리|축제\s*일정\s*총정리/i;

const VISIT_BOOST =
  /후기|내돈내산|다녀온|방문|솔직|맛집|메뉴|주차|입장료|관람|영업시간|웨이팅|가볼\s*만한\s*곳|여행\s*코스|당일치기|1박\s*2일|가족여행|아이와|추천\s*메뉴|디저트|오션뷰|포토존|전망|산책/i;

const PRACTICAL_BOOST = /주차|입장료|영업시간|웨이팅|예약|메뉴|교통|가는\s*길|관람\s*시간|이용\s*팁/i;

const LISTICLE = /총정리|BEST\s*\d|모음|\d+\s*곳\s*추천|전국\s*가볼|전국\s*축제|데이트\s*코스\s*모음/i;

const CHAIN_NAME =
  /스타벅스|매머드|투썸|이디야|메가커피|메가엠지씨|컴포즈|빽다방|할리스|폴바셋|엔제리너스|커피빈|파리바게뜨|파리바게트|던킨|배스킨|노브랜드|다이소|CU\b|GS25|이마트|롯데리아|맥도날드|버거킹|KFC|서브웨이|설빙|공차|탐앤탐스|카페베네/i;

const CATEGORY_BOOST: Record<Place["category"], RegExp> = {
  restaurant: /메뉴|맛집|웨이팅|주문|내돈내산|반찬|국밥|고기|회|코스요리/,
  cafe: /카페|커피|디저트|라떼|베이커리|브런치|뷰\s*맛집/,
  beach: /해수욕장|해변|수영|일출|일몰|파도|모래사장/,
  forest: /숲길|산책|트레킹|수목원|휴양림|등산/,
  market: /시장|먹거리|골목|분식|좌판/,
  heritage: /입장|관람|역사|한옥|사찰|궁|문화재|전시/,
  landmark: /가볼\s*만한\s*곳|관광|포토존|전망|코스|여행/,
  park: /공원|산책|피크닉|잔디|놀이터/,
  street: /거리|골목|산책로|야경|카페거리/,
  viewpoint: /전망대|야경|뷰|일몰|일출|전망/,
};

export function normalizeCityToken(city: string | null | undefined): string | null {
  if (!city) return null;
  const t = city.replace(/(특별자치시|광역시|특별시|시|군|구)$/u, "").trim();
  return t.length >= 2 ? t : null;
}

export function placeSearchQuery(placeName: string, city: string | null, category: Place["category"]): string {
  const cityPart = normalizeCityToken(city) ?? "";
  const hints = categorySearchHints[category] ?? [];
  const hint = hints[0] ?? "가볼만한곳";
  return [cityPart, placeName, hint, "후기"].filter(Boolean).join(" ");
}

/** Second-pass query when primary search yields too few visit-worthy hits. */
export function placeSearchQueryAlt(placeName: string, city: string | null, category: Place["category"]): string {
  const cityPart = normalizeCityToken(city) ?? "";
  if (category === "restaurant" || category === "cafe" || category === "market") {
    return [cityPart, placeName, "맛집", "메뉴"].filter(Boolean).join(" ");
  }
  return [cityPart, placeName, "내돈내산"].filter(Boolean).join(" ");
}

/** Meaningful tokens from a place name for soft matching. */
export function placeNameTokens(name: string): string[] {
  const cleaned = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[0-9]+호점|[A-Za-z]+점$/g, " ")
    .replace(/점$/u, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
  const parts = cleaned.split(/\s+/).filter((t) => t.length >= 2);
  const full = cleaned.replace(/\s+/g, "");
  const out = new Set<string>();
  if (full.length >= 2) out.add(full);
  for (const p of parts) {
    if (p.length >= 2) out.add(p);
  }
  // Brand stem for chains: "매머드커피익스프레스…" → also match "매머드커피"
  const brand = name.match(CHAIN_NAME)?.[0];
  if (brand && brand.length >= 2) out.add(brand);
  return [...out].sort((a, b) => b.length - a.length);
}

function hasPlaceMention(text: string, placeName: string): boolean {
  const hay = text.replace(/\s+/g, "").toLowerCase();
  const tokens = placeNameTokens(placeName);
  if (!tokens.length) return false;
  let hits = 0;
  for (const t of tokens) {
    const needle = t.replace(/\s+/g, "").toLowerCase();
    if (needle.length < 2) continue;
    if (hay.includes(needle)) {
      if (needle.length >= 3 || needle === tokens[0]?.replace(/\s+/g, "").toLowerCase()) return true;
      hits++;
      if (hits >= 2) return true;
    }
  }
  return false;
}

function placeInTitleFront(title: string, placeName: string): boolean {
  const head = title.slice(0, Math.min(title.length, 40)).replace(/\s+/g, "").toLowerCase();
  const tokens = placeNameTokens(placeName);
  for (const t of tokens) {
    const needle = t.replace(/\s+/g, "").toLowerCase();
    if (needle.length >= 2 && head.includes(needle)) return true;
  }
  return false;
}

export function isChainOrBranchPlace(placeName: string): boolean {
  if (CHAIN_NAME.test(placeName)) return true;
  if (/점$/u.test(placeName.trim())) return true;
  if (/\d+호점/u.test(placeName)) return true;
  return false;
}

function hasCityMention(text: string, cityName: string | null | undefined): boolean {
  const city = normalizeCityToken(cityName);
  if (!city) return false;
  const hay = text.replace(/\s+/g, "");
  return hay.includes(city);
}

export type VisitScoreInput = {
  title: string;
  snippet: string;
  placeName: string;
  category: Place["category"];
  cityName?: string | null;
  /** 0 = top search hit */
  searchRank?: number;
  searchPoolSize?: number;
  /** YYYY-MM-DD or YYYYMMDD */
  publishedAt?: string | null;
  /** YouTube view count when available */
  viewCount?: number | null;
};

export type VisitScoreResult = {
  ok: boolean;
  score: number;
  reason?: string;
};

function recencyBoost(publishedAt: string | null | undefined): number {
  if (!publishedAt) return 0;
  const raw = publishedAt.replace(/-/g, "").slice(0, 8);
  if (!/^\d{8}$/.test(raw)) return 0;
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  const then = Date.UTC(y, m - 1, d);
  if (Number.isNaN(then)) return 0;
  const ageDays = (Date.now() - then) / (86400 * 1000);
  if (ageDays < 180) return 8;
  if (ageDays < 365) return 5;
  if (ageDays < 730) return 2;
  return 0;
}

function viewBoost(viewCount: number | null | undefined): number {
  if (viewCount == null || viewCount <= 0) return 0;
  return Math.min(25, Math.round(Math.log10(viewCount + 1) * 8));
}

/**
 * Score 0–100. `ok` is false when hard-rejected or below threshold.
 */
export function scoreVisitRelevance(input: VisitScoreInput): VisitScoreResult {
  const text = `${input.title} ${input.snippet}`;
  if (JUNK.test(text)) return { ok: false, score: 0, reason: "junk" };
  if (!hasPlaceMention(text, input.placeName)) {
    return { ok: false, score: 0, reason: "no_place_mention" };
  }

  const visitHit = VISIT_BOOST.test(text);
  const catRe = CATEGORY_BOOST[input.category];
  const catHit = Boolean(catRe?.test(text));
  const practicalHit = PRACTICAL_BOOST.test(text);

  if (!visitHit && !catHit) {
    return { ok: false, score: 0, reason: "no_visit_signal" };
  }

  if (WEAK_ANNOUNCE.test(text) && !practicalHit && !/후기|내돈내산|다녀온|솔직/.test(text)) {
    return { ok: false, score: 0, reason: "weak_announce" };
  }

  if (isChainOrBranchPlace(input.placeName) && !hasCityMention(text, input.cityName)) {
    return { ok: false, score: 0, reason: "chain_needs_city" };
  }

  let score = 28;

  if (visitHit) score += 22;
  if (catHit) score += 12;
  if (practicalHit) score += 8;
  if (hasCityMention(text, input.cityName)) score += 8;
  if (hasPlaceMention(input.title, input.placeName)) score += 10;

  if (LISTICLE.test(text)) {
    const focusedGuide = placeInTitleFront(input.title, input.placeName) && practicalHit;
    score -= focusedGuide ? 6 : 12;
  }

  const pool = Math.max(1, input.searchPoolSize ?? 10);
  const rank = input.searchRank ?? 0;
  score += Math.round(((pool - rank) / pool) * 15);

  score += recencyBoost(input.publishedAt);
  score += viewBoost(input.viewCount);

  score = Math.max(0, Math.min(100, score));
  // Stronger city weight for short / ambiguous names
  if (!hasCityMention(text, input.cityName) && input.placeName.replace(/\s+/g, "").length <= 4) {
    score -= 8;
  }
  score = Math.max(0, Math.min(100, score));
  const threshold = visitScoreThreshold(input.category);
  if (score < threshold) {
    return { ok: false, score, reason: "below_threshold" };
  }
  return { ok: true, score };
}
