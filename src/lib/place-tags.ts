import type { Place } from "@/db/schema";

/** Category → default vibe tags (always Korean, display-ready without #). */
export const categorySeedTags: Record<Place["category"], string[]> = {
  beach: ["바다", "해변", "여행"],
  cafe: ["카페", "커피맛집", "힐링"],
  forest: ["숲", "자연", "힐링"],
  market: ["시장", "먹거리", "로컬"],
  heritage: ["문화유산", "역사", "가볼만한곳"],
  landmark: ["명소", "가볼만한곳", "포토스팟"],
  restaurant: ["맛집", "로컬맛집"],
  park: ["공원", "산책", "힐링"],
  street: ["거리", "산책", "핫플"],
  viewpoint: ["전망", "야경", "포토스팟"],
};

const CATEGORY_KEYS = new Set<string>([
  "beach",
  "cafe",
  "forest",
  "market",
  "heritage",
  "landmark",
  "restaurant",
  "park",
  "street",
  "viewpoint",
  "관광명소",
  "문화재",
  "해수욕장",
  "전망대",
]);

/** Phrases often found in Naver blog titles/snippets → vibe hashtag. */
const VIBE_PATTERNS: { re: RegExp; tag: string; weight: number }[] = [
  { re: /데이트|커플여행|연인/, tag: "데이트", weight: 3 },
  { re: /야경|야간개장|밤뷰|야간관광/, tag: "야경", weight: 3 },
  { re: /오션뷰|바다뷰|해변뷰|씨뷰/, tag: "오션뷰", weight: 3 },
  { re: /뷰맛집|전망좋|전망대|스카이뷰/, tag: "뷰맛집", weight: 3 },
  { re: /포토스팟|인생샷|사진맛집|포토존|인스타감성/, tag: "포토스팟", weight: 3 },
  { re: /일출|해돋이/, tag: "일출", weight: 3 },
  { re: /일몰|석양|노을/, tag: "일몰", weight: 3 },
  { re: /브런치/, tag: "브런치", weight: 2 },
  { re: /디저트|케이크|베이커리|빵집/, tag: "디저트", weight: 2 },
  { re: /커피|라떼|에스프레소|감성카페|카페투어/, tag: "커피맛집", weight: 2 },
  { re: /맛집|미식|맛있|먹스타그램/, tag: "맛집", weight: 2 },
  { re: /힐링|여유|분위기\s*좋|감성여행/, tag: "힐링", weight: 2 },
  { re: /핫플|핫플레이스|요즘뜨는/, tag: "핫플", weight: 2 },
  { re: /가족여행|아이와|키즈|어린이/, tag: "가족여행", weight: 2 },
  { re: /혼자|혼카페|혼밥|솔로여행/, tag: "혼자여행", weight: 2 },
  { re: /산책|걷기좋은|트레킹|등산로|둘레길/, tag: "산책", weight: 2 },
  { re: /한옥|고궁|궁궐|수문장|전통/, tag: "한옥", weight: 2 },
  { re: /야시장|길거리음식|포장마차/, tag: "야시장", weight: 2 },
  { re: /숨은명소|로컬추천|현지인/, tag: "로컬", weight: 2 },
  { re: /주차|드라이브/, tag: "드라이브", weight: 1 },
  { re: /가볼만한|여행코스|당일치기/, tag: "가볼만한곳", weight: 1 },
  { re: /감성|분위기/, tag: "감성", weight: 1 },
  { re: /자연|숲속|피톤치드/, tag: "자연", weight: 1 },
  { re: /바다|해수욕|해변/, tag: "바다", weight: 1 },
  { re: /카페/, tag: "카페", weight: 1 },
  { re: /공원/, tag: "공원", weight: 1 },
  { re: /시장/, tag: "시장", weight: 1 },
];

const MIN_TAGS = 3;
const MAX_TAGS = 6;

export function normalizeTag(raw: string): string | null {
  let t = raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
  if (!t) return null;
  if (CATEGORY_KEYS.has(t) || CATEGORY_KEYS.has(t.toLowerCase())) return null;
  if (t.length < 2 || t.length > 12) return null;
  if (/^[a-z0-9_-]+$/i.test(t) && !/[가-힣]/.test(t)) return null;
  // Drop pure noise
  if (/^(추천|후기|여행|블로그|일상|리뷰)$/.test(t)) return null;
  return t;
}

function bump(scores: Map<string, number>, tag: string, weight: number) {
  const n = normalizeTag(tag);
  if (!n) return;
  scores.set(n, (scores.get(n) ?? 0) + weight);
}

function extractHashTags(text: string): string[] {
  const out: string[] = [];
  const re = /#([0-9A-Za-z가-힣_]{2,20})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]!);
  return out;
}

const REGION_PREFIX =
  /^(서울|부산|대구|인천|광주|대전|울산|세종|제주|강릉|속초|여수|전주|수원|성남|분당|춘천|경주|포항|창원|김해|평택|용인|고양|파주|남양주|화성|청주|천안|진주|통영|거제|울진|양양|고성|동해|삼척|구미|포천|이천|광주|양평|가평|인제|홍천|평창|정선|영월)/;

function isPlaceNameTag(tag: string, placeName?: string): boolean {
  const t = tag.replace(/\s+/g, "");
  // Region-prefixed SEO tags: #강릉오죽헌 #서울궁궐
  if (REGION_PREFIX.test(t) && t.length >= 4) return true;
  if (!placeName) return false;
  const n = placeName.replace(/\s+/g, "");
  if (!n || n.length < 2) return false;
  if (t === n) return true;
  // "#경복궁야간관람" / "#서울경복궁" — place-name spam, not vibe
  if (t.includes(n) || (n.length >= 3 && n.includes(t))) return true;
  return false;
}

/**
 * Build 3–6 vibe hashtags from category seeds + blog title/snippet signals.
 * We never scrape post bodies — only search metadata we already store.
 */
export function enrichPlaceTags(input: {
  category: Place["category"];
  name?: string;
  existing?: string[];
  texts?: string[];
}): string[] {
  const scores = new Map<string, number>();

  for (const t of categorySeedTags[input.category]) bump(scores, t, 3);
  for (const t of input.existing ?? []) {
    if (isPlaceNameTag(t, input.name)) continue;
    bump(scores, t, 1.2);
  }

  // Prefer blog body signals over place-name hashtags in titles
  const blogBlob = (input.texts ?? []).join("\n");
  const nameBlob = input.name ?? "";
  const blob = [nameBlob, blogBlob].join("\n");

  for (const h of extractHashTags(blogBlob)) {
    if (isPlaceNameTag(h, input.name)) continue;
    const n = normalizeTag(h);
    if (!n) continue;
    // Short vibe tags keep weight; long compounds are usually SEO noise.
    bump(scores, n, n.length <= 5 ? 2.5 : 0.6);
  }
  for (const { re, tag, weight } of VIBE_PATTERNS) {
    if (re.test(blob)) bump(scores, tag, weight);
  }

  // Soft boost: cafe name often implies coffee vibe even without blogs
  if (input.category === "cafe" && /카페|커피|coffee|cafe/i.test(input.name ?? "")) {
    bump(scores, "커피맛집", 1.5);
  }
  if (input.category === "restaurant" && /맛집|식당|음식/.test(input.name ?? "")) {
    bump(scores, "맛집", 1.5);
  }

  const vibeAllow = new Set<string>([
    ...categorySeedTags[input.category],
    ...VIBE_PATTERNS.map((p) => p.tag),
  ]);

  const ranked = [...scores.entries()]
    .filter(([tag]) => !isPlaceNameTag(tag, input.name))
    .sort((a, b) => {
      const av = vibeAllow.has(a[0]) ? 1 : 0;
      const bv = vibeAllow.has(b[0]) ? 1 : 0;
      if (av !== bv) return bv - av;
      return b[1] - a[1] || a[0].localeCompare(b[0], "ko");
    });

  const picked: string[] = [];
  for (const [tag] of ranked) {
    if (picked.includes(tag)) continue;
    // First fill with known vibe tags so the chip row always "feels" right
    if (picked.length < MIN_TAGS && !vibeAllow.has(tag)) continue;
    picked.push(tag);
    if (picked.length >= MAX_TAGS) break;
  }

  for (const t of categorySeedTags[input.category]) {
    if (picked.includes(t)) continue;
    picked.push(t);
    if (picked.length >= MIN_TAGS) break;
  }

  // Optional extras from blogs after the vibe core
  if (picked.length < MAX_TAGS) {
    for (const [tag] of ranked) {
      if (picked.includes(tag)) continue;
      if (!vibeAllow.has(tag) && tag.length > 5) continue;
      picked.push(tag);
      if (picked.length >= MAX_TAGS) break;
    }
  }

  return picked.slice(0, MAX_TAGS);
}

export function formatHashtag(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}
