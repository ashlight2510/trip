/**
 * Offline orphan-source relinker (0 external API calls).
 *
 * Scans unreferenced blog/video rows in `sources` and links high-confidence,
 * visit-worthy matches to:
 *   1) Under-cap places (`< MAX_BLOG_SOURCES_PER_PLACE` / `< MAX_SOURCES_PER_PLACE`)
 *      with strict word-boundary, geo-context, non-nearby-shop, and
 *      `scoreVisitRelevance` checks (compatible with `yarn source:prune`).
 *   2) Empty/under-cap city `region_sources` (`<= MAX_SOURCES_PER_REGION`).
 *
 * Usage:
 *   yarn source:relink                        # dry-run summary + samples
 *   yarn source:relink -- --apply             # write updated links & tags
 *   yarn source:relink -- --apply --gc        # also drop remaining orphan/stub sources
 *   yarn source:relink -- --apply --force-write  # bypass active-batch guard
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  MAX_BLOG_SOURCES_PER_PLACE,
  MAX_SOURCES_PER_PLACE,
  MAX_SOURCES_PER_REGION,
  MAX_YOUTUBE_SOURCES_PER_PLACE,
  STUB_SOURCE_PROVIDERS,
  VISIT_PRIORITY_CATEGORIES,
} from "../src/db/curation";
import type { Place, PlaceSource, Region, RegionSource, Source } from "../src/db/schema";
import { enrichPlaceTags } from "../src/lib/place-tags";
import { evaluatePlaceQuality } from "./lib/place-quality";
import { scoreVisitRelevance } from "./lib/source-relevance";
import { DATA_DIR, loadEnv, now, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    gc: { type: "boolean", default: false },
    "force-write": { type: "boolean", default: false },
    sample: { type: "string", default: "20" },
  },
});

loadEnv();

const MAX_PER_AUTHOR = 2;
const ACTIVE_BATCH_WINDOW_MS = 45_000;
const STUB_PROVIDERS = new Set<string>(STUB_SOURCE_PROVIDERS);
const COMPASS_ONLY = /^(중|동|서|남|북)$/u;

/** Generic facility nouns that exist in almost every city — require explicit city in title. */
const GENERIC_PLACE_NAMES = new Set([
  "공원",
  "해변",
  "해수욕장",
  "시장",
  "중앙시장",
  "전통시장",
  "종합시장",
  "수산시장",
  "공설시장",
  "동부시장",
  "서부시장",
  "남부시장",
  "북부시장",
  "동구시장",
  "서구시장",
  "야시장",
  "전망대",
  "수목원",
  "휴양림",
  "자연휴양림",
  "박물관",
  "미술관",
  "시립박물관",
  "국립박물관",
  "향교",
  "읍성",
  "성당",
  "사찰",
  "한옥마을",
  "카페거리",
  "먹자골목",
  "벽화마을",
  "출렁다리",
  "케이블카",
  "스카이워크",
  "오토캠핑장",
  "캠핑장",
  "산책로",
  "둘레길",
  "호수공원",
  "시민공원",
  "체육공원",
  "근린공원",
  "어린이공원",
  "생태공원",
  "수변공원",
  "문화공원",
  "역사공원",
  "조각공원",
]);

const RETAIL_OR_CLINIC_NAME =
  /안경|렌즈|약국|의원|병원|치과|한의원|피부과|성형|부동산|공인중개|세탁|수선|카센터|정비|타이어|주유소|충전소|은행|우체국|택배|대리점|휴대폰|텔레콤/u;

const CONFLICT_DESTINATIONS = [
  "오사카",
  "도쿄",
  "후쿠오카",
  "교토",
  "삿포로",
  "오키나와",
  "나고야",
  "고베",
  "요코하마",
  "괌",
  "사이판",
  "다낭",
  "나트랑",
  "방콕",
  "치앙마이",
  "타이베이",
  "대만",
  "홍콩",
  "마카오",
  "싱가포르",
  "발리",
  "세부",
  "보홀",
];

const BAD_RIGHT_SUFFIX_RE = /^(사진관|사우나|사무소|사무실|사거리|아파트|오피스텔|빌라|초등학교|중학교|고등학교|어린이집|유치원|약국|병원|의원|치과)/u;

const LISTICLE_RE = /총정리|BEST\s*\d|\d+\s*선|\d+\s*곳\s*추천|전국\s*가볼|수량\s*약/i;
const REGION_GUIDE_RE = /가볼\s*만한\s*곳|여행\s*코스|당일치기|1박\s*2일|2박\s*3일|핫플|명소|갈만한\s*곳/i;
const JUNK_QUICK_RE =
  /체험단|원고료|광고|협찬|쿠팡파트너스|클릭하면|제휴마케팅|수익인증|도배|버스\s*노선|버스시간표|나라장터|입찰|채용|구인|원룸|오피스텔|분양|대출|보험|주식|코인|변호사|피부과|치과|성형|인테리어견적|사건\s*사고|토토|카지노/i;

function checkActiveBatchGuard() {
  if (!values.apply || values["force-write"]) return;
  const watchFiles = ["places.json", "place_sources.json", "sources.part-001.json"];
  const nowMs = Date.now();
  for (const f of watchFiles) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) continue;
    const ageMs = nowMs - fs.statSync(p).mtimeMs;
    if (ageMs < ACTIVE_BATCH_WINDOW_MS) {
      console.error(
        `[중단] ${f} 파일이 ${Math.round(ageMs / 1000)}초 전에 수정되었습니다. ` +
          `현재 실행 중인 수집/링크 배치(blog:link 등)와 덮어쓰기 충돌을 막기 위해 쓰기를 보류합니다.\n` +
          `배치 종료 후 다시 실행하거나, 강제 반영하려면 --force-write 옵션을 추가하세요.`,
      );
      process.exit(2);
    }
  }
}

checkActiveBatchGuard();

const places = read("places");
const regions = read("regions");
const sources = read("sources");
const links = read("place_sources");
const regionLinks = read("region_sources");
const boosts = read("place_source_boosts");
const voteScores = read("place_source_vote_scores");
const votes = read("place_source_votes");
const contribs = read("user_contributions");
const reports = read("source_reports");

type EnrichFlag = {
  source_id: string;
  place_id: string;
  visit_ok: boolean;
  soft_junk: boolean;
  geo_mismatch: boolean;
};

const enrichFlags: EnrichFlag[] = (() => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "source_enrich_flags.json"), "utf8"),
    ) as EnrichFlag[];
  } catch {
    return [];
  }
})();
const enrichByKey = new Map(enrichFlags.map((f) => [`${f.place_id}::${f.source_id}`, f]));
const bannedSourceIds = new Set(
  reports
    .filter((r) => r.status === "open" && (r.reason === "spam" || r.reason === "deleted"))
    .flatMap((r) => (r.source_id ? [r.source_id] : [])),
);
const wrongPlacePairs = new Set(
  reports
    .filter((r) => r.status === "open" && r.reason === "wrong_place" && r.source_id)
    .map((r) => `${r.place_id}::${r.source_id}`),
);

const regionById = new Map(regions.map((r) => [r.id, r]));
const sourceById = new Map(sources.map((s) => [s.id, s]));

function ancestors(regionId: string): Region[] {
  const out: Region[] = [];
  const seen = new Set<string>();
  let id: string | null = regionId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const r = regionById.get(id);
    if (!r) break;
    out.push(r);
    id = r.parent_id;
  }
  return out;
}

function bareRegionName(name: string): string {
  return name.replace(/(특별자치도|특별자치시|광역시|특별시|시|군|구|읍|면|동)$/u, "").trim();
}

function normCompact(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function stripNonWord(s: string): string {
  return normCompact(s).replace(/[^\p{L}\p{N}]/gu, "");
}

const isWordChar = (ch: string | undefined) => Boolean(ch && /[\p{L}\p{N}]/u.test(ch));

/**
 * True if `needleRaw` appears in `text` at a valid left boundary:
 * either preceded by non-letter/number (space, bracket, start of string)
 * OR preceded directly by one of `allowedPrefixes` (e.g. "대구동구시장", "강릉중앙시장").
 */
function hasBoundaryMatch(text: string, needleCompact: string, allowedPrefixes: string[]): boolean {
  // Build compact string + map each compact index back to original string index
  const chars: string[] = [];
  const origIdx: number[] = [];
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i]!;
    if (/\s/u.test(ch)) continue;
    chars.push(ch);
    origIdx.push(i);
  }
  const hay = chars.join("");
  let pos = hay.indexOf(needleCompact);
  while (pos !== -1) {
    const after = hay.slice(pos + needleCompact.length);
    if (BAD_RIGHT_SUFFIX_RE.test(after)) {
      pos = hay.indexOf(needleCompact, pos + 1);
      continue;
    }

    if (pos === 0) return true;
    const origStart = origIdx[pos]!;
    const prevOrig = lower[origStart - 1];
    if (!isWordChar(prevOrig)) return true;

    // Check if immediately preceded in compact text by an allowed geo prefix (at its own boundary)
    const before = hay.slice(0, pos);
    for (const prefix of allowedPrefixes) {
      if (!prefix || !before.endsWith(prefix)) continue;
      const prefixPos = pos - prefix.length;
      if (prefixPos === 0) return true;
      const prefixOrigStart = origIdx[prefixPos]!;
      if (!isWordChar(lower[prefixOrigStart - 1])) return true;
    }
    pos = hay.indexOf(needleCompact, pos + 1);
  }
  return false;
}

/** Reject posts that are actually reviewing a restaurant/cafe/hotel *near* a non-food sight. */
function isNearbyShopReviewForSight(title: string, placeName: string, category: Place["category"]): boolean {
  if (!VISIT_PRIORITY_CATEGORIES.has(category) || category === "market") return false;
  const escaped = placeName
    .replace(/\([^)]*\)/g, "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s*");
  if (!escaped) return false;
  const nearShopRe = new RegExp(
    `${escaped}\\s*(근처|주변|인근|앞|옆)?\\s*(맛집|카페|베이커리|브런치|와플|디저트|술집|밥집|식당|횟집|고깃집|중국집|국밥|숙소|호텔|펜션)`,
    "iu",
  );
  if (!nearShopRe.test(title)) return false;
  const directSightVisitRe = /입장료|관람|야간\s*개장|단풍|산책로|전시|트레킹|등산|일출|일몰|해수욕|물놀이|예약\s*방법/iu;
  return !directSightVisitRe.test(title);
}

const referencedBefore = new Set<string>();
for (const l of links) referencedBefore.add(l.source_id);
for (const l of regionLinks) referencedBefore.add(l.source_id);
for (const c of contribs) if (c.source_id) referencedBefore.add(c.source_id);

type IndexedOrphan = {
  src: Source;
  isYt: boolean;
  titleLower: string;
  titleCompact: string;
  fullCompact: string;
  isListicle: boolean;
};

const orphanPool: IndexedOrphan[] = [];
for (const src of sources) {
  if (referencedBefore.has(src.id)) continue;
  if (STUB_PROVIDERS.has(src.provider)) continue;
  if (bannedSourceIds.has(src.id)) continue;
  const full = `${src.title} ${src.snippet ?? ""}`;
  if (JUNK_QUICK_RE.test(full)) continue;
  const isYt = src.type === "youtube" || src.provider === "youtube";
  orphanPool.push({
    src,
    isYt,
    titleLower: src.title.toLowerCase(),
    titleCompact: stripNonWord(src.title),
    fullCompact: stripNonWord(full),
    isListicle: LISTICLE_RE.test(full),
  });
}

// Trigram inverted index over `titleCompact` for fast candidate lookup
const trigramIndex = new Map<string, number[]>();
orphanPool.forEach((item, idx) => {
  const t = item.titleCompact;
  const seen = new Set<string>();
  for (let i = 0; i <= t.length - 3; i++) {
    const tri = t.slice(i, i + 3);
    if (seen.has(tri)) continue;
    seen.add(tri);
    let bucket = trigramIndex.get(tri);
    if (!bucket) {
      bucket = [];
      trigramIndex.set(tri, bucket);
    }
    bucket.push(idx);
  }
});

const linksByPlace = new Map<string, PlaceSource[]>();
for (const l of links) {
  const arr = linksByPlace.get(l.place_id) ?? [];
  arr.push(l);
  linksByPlace.set(l.place_id, arr);
}

type RelinkSample = {
  place_id: string;
  place: string;
  city: string;
  category: Place["category"];
  before: number;
  added: number;
  titles: string[];
};

const newlyLinkedSourceIds = new Set<string>();
let placesMatched = 0;
let zeroLinkPlacesFilled = 0;
let totalPlaceLinksAdded = 0;
const samples: RelinkSample[] = [];
const sampleLimit = Math.max(5, Number(values.sample) || 20);
const ts = now();

// All city bare names + overseas destinations for cross-city conflict rejection
const ALL_CONFLICT_GEO = [
  ...new Set([
    ...regions
      .filter((r) => r.level === "city")
      .map((r) => stripNonWord(bareRegionName(r.name)))
      .filter((s) => s.length >= 2),
    ...CONFLICT_DESTINATIONS.map(stripNonWord),
  ]),
];

// Prioritize visit categories & 0-link places first
const sortedPlaces = [...places].sort((a, b) => {
  const aZero = (linksByPlace.get(a.id)?.length ?? 0) === 0 ? 0 : 1;
  const bZero = (linksByPlace.get(b.id)?.length ?? 0) === 0 ? 0 : 1;
  if (aZero !== bZero) return aZero - bZero;
  const aPri = VISIT_PRIORITY_CATEGORIES.has(a.category) ? 0 : 1;
  const bPri = VISIT_PRIORITY_CATEGORIES.has(b.category) ? 0 : 1;
  return aPri - bPri || a.id.localeCompare(b.id);
});

for (const place of sortedPlaces) {
  if (RETAIL_OR_CLINIC_NAME.test(place.name)) continue;
  const curLinks = linksByPlace.get(place.id) ?? [];
  if (
    !evaluatePlaceQuality({
      name: place.name,
      category: place.category,
      linkCount: curLinks.length,
    }).keep
  ) {
    continue;
  }

  const curYt = curLinks.filter((l) => {
    const s = sourceById.get(l.source_id);
    return s && (s.type === "youtube" || s.provider === "youtube");
  });
  const curBlogs = curLinks.filter((l) => {
    const s = sourceById.get(l.source_id);
    return s && s.type !== "youtube" && s.provider !== "youtube";
  });

  const blogRoom = Math.min(
    MAX_BLOG_SOURCES_PER_PLACE - curBlogs.length,
    MAX_SOURCES_PER_PLACE - curLinks.length,
  );
  const ytRoom = Math.min(
    MAX_YOUTUBE_SOURCES_PER_PLACE - curYt.length,
    MAX_SOURCES_PER_PLACE - curLinks.length,
  );
  if (blogRoom <= 0 && ytRoom <= 0) continue;

  const baseName = place.name.replace(/\([^)]*\)/g, "").trim();
  const needle = stripNonWord(baseName);
  const needleWithPunct = normCompact(baseName);
  if (needle.length < 3) continue;

  const chain = ancestors(place.region_id);
  const city = chain.find((r) => r.level === "city") ?? null;
  const district = chain.find((r) => r.level === "district") ?? null;
  const province = chain.find((r) => r.level === "province") ?? null;
  const country = chain.find((r) => r.level === "country") ?? null;

  const geoTokens: string[] = [];
  const cityBare = city ? normCompact(bareRegionName(city.name)) : "";
  const cityBareCompact = stripNonWord(cityBare);
  if (cityBare.length >= 2) geoTokens.push(cityBare);
  if (district) {
    const dBare = normCompact(bareRegionName(district.name));
    // Exclude district token if it's already a substring of the place name itself (e.g. 와룡면 vs 와룡사)
    if (dBare.length >= 2 && !COMPASS_ONLY.test(dBare) && !needle.includes(stripNonWord(dBare))) {
      geoTokens.push(dBare);
    }
  }
  // Only Jeju uses island-wide "제주" across 제주시/서귀포시; other provinces (경기도/경상북도) are too wide!
  if (province?.name.includes("제주")) geoTokens.push("제주");
  if (country?.country_code === "GU") geoTokens.push("괌", "guam");
  if (country?.country_code === "JP" && city) geoTokens.push(normCompact(city.name));

  if (geoTokens.length === 0) continue;

  const isGeneric = GENERIC_PLACE_NAMES.has(needle);
  const nameEmbedsGeo = geoTokens.some((g) => needle.startsWith(g) && needle.length >= g.length + 2);

  // Intersect rarest trigram posting list
  let posting: number[] | null = null;
  for (let i = 0; i <= needle.length - 3; i++) {
    const tri = needle.slice(i, i + 3);
    const list = trigramIndex.get(tri);
    if (!list) {
      posting = [];
      break;
    }
    if (!posting || list.length < posting.length) posting = list;
  }
  if (!posting || posting.length === 0) continue;

  const existingIds = new Set(curLinks.map((l) => l.source_id));
  const existingUrls = new Set(
    curLinks.map((l) => sourceById.get(l.source_id)?.url).filter((u): u is string => Boolean(u)),
  );
  const seenTitleKeys = new Set(
    curLinks
      .map((l) => sourceById.get(l.source_id)?.title)
      .filter((t): t is string => Boolean(t))
      .map(stripNonWord),
  );
  const authorCounts = new Map<string, number>();
  for (const l of curBlogs) {
    const s = sourceById.get(l.source_id);
    if (!s) continue;
    const key = (s.author || s.url).toLowerCase();
    authorCounts.set(key, (authorCounts.get(key) ?? 0) + 1);
  }

  const allowedGeoCompact = new Set(geoTokens.map(stripNonWord));
  const blogHits: { src: Source; score: number }[] = [];
  const ytHits: { src: Source; score: number }[] = [];

  for (const idx of posting) {
    const cand = orphanPool[idx]!;
    if (!cand.titleCompact.includes(needle)) continue;
    if (existingIds.has(cand.src.id) || existingUrls.has(cand.src.url)) continue;
    if (seenTitleKeys.has(cand.titleCompact)) continue;
    if (wrongPlacePairs.has(`${place.id}::${cand.src.id}`)) continue;
    const ef = enrichByKey.get(`${place.id}::${cand.src.id}`);
    if (ef && (ef.soft_junk || ef.geo_mismatch || !ef.visit_ok)) continue;

    // Boundary check in raw title so "안동구시장" never matches "동구시장"
    if (!hasBoundaryMatch(cand.src.title, needleWithPunct, geoTokens)) continue;

    // Generic place names ("중앙시장", "동구시장") MUST have city/district in the title itself
    const titleHasGeo = nameEmbedsGeo || geoTokens.some((g) => cand.titleCompact.includes(stripNonWord(g)));
    const fullHasGeo = titleHasGeo || geoTokens.some((g) => cand.fullCompact.includes(stripNonWord(g)));
    if (!fullHasGeo) continue;
    if (isGeneric && !titleHasGeo) continue;

    // Reject if title names ANY other city/country while NOT naming this place's city!
    const titleHasOwnCity = Boolean(cityBareCompact && cand.titleCompact.includes(cityBareCompact));
    if (!titleHasOwnCity) {
      const hasConflictCityInTitle = ALL_CONFLICT_GEO.some(
        (otherGeo) =>
          !allowedGeoCompact.has(otherGeo) &&
          !needle.includes(otherGeo) &&
          hasBoundaryMatch(cand.src.title, otherGeo, []),
      );
      if (hasConflictCityInTitle) continue;
    }

    // Listicles only allowed if focused on this place at the front of the title
    if (cand.isListicle && !cand.titleCompact.slice(0, 22).includes(needle)) continue;

    // Avoid linking nearby restaurant/cafe reviews onto landmarks/parks/heritage
    if (isNearbyShopReviewForSight(cand.src.title, baseName, place.category)) continue;

    // Official visit-intent relevance gate (ensures 100% compatibility with `source:prune`)
    const rel = scoreVisitRelevance({
      title: cand.src.title,
      snippet: cand.src.snippet ?? "",
      placeName: place.name,
      category: place.category,
      cityName: city?.name ?? null,
      publishedAt: cand.src.published_at,
      viewCount: cand.src.view_count,
    });
    if (!rel.ok) continue;

    if (cand.isYt) {
      ytHits.push({ src: cand.src, score: rel.score });
    } else {
      blogHits.push({ src: cand.src, score: rel.score });
    }
  }

  if (blogHits.length === 0 && ytHits.length === 0) continue;

  blogHits.sort((a, b) => b.score - a.score || (b.src.score ?? 0) - (a.src.score ?? 0));
  ytHits.sort((a, b) => (b.src.view_count ?? 0) - (a.src.view_count ?? 0) || b.score - a.score);

  const pickedBlogs: { src: Source; score: number }[] = [];
  for (const h of blogHits) {
    if (pickedBlogs.length >= blogRoom) break;
    const tKey = stripNonWord(h.src.title);
    if (seenTitleKeys.has(tKey)) continue;
    const aKey = (h.src.author || h.src.url).toLowerCase();
    const ac = authorCounts.get(aKey) ?? 0;
    if (ac >= MAX_PER_AUTHOR) continue;
    authorCounts.set(aKey, ac + 1);
    seenTitleKeys.add(tKey);
    pickedBlogs.push(h);
  }

  const slotsLeftAfterBlogs = MAX_SOURCES_PER_PLACE - curLinks.length - pickedBlogs.length;
  const pickedYts = ytHits.slice(0, Math.min(ytRoom, Math.max(0, slotsLeftAfterBlogs)));
  const added = [...pickedBlogs, ...pickedYts];
  if (added.length === 0) continue;

  const wasZero = curLinks.length === 0;

  // Merge with existing links and re-pack ranks cleanly 1..N by relevance
  const combined: { source: Source; relevance: number; note: string | null; timestamp_sec: number | null }[] = [
    ...curLinks.flatMap((l) => {
      const s = sourceById.get(l.source_id);
      return s ? [{ source: s, relevance: l.relevance, note: l.note, timestamp_sec: l.timestamp_sec }] : [];
    }),
    ...added.map((a) => {
      a.src.score = Math.max(a.src.score ?? 0, a.score);
      newlyLinkedSourceIds.add(a.src.id);
      return {
        source: a.src,
        relevance: Number((a.score / 100).toFixed(2)),
        note: "orphan_relink",
        timestamp_sec: null,
      };
    }),
  ];

  combined.sort((a, b) => b.relevance - a.relevance);
  const repacked: PlaceSource[] = combined.slice(0, MAX_SOURCES_PER_PLACE).map((row, i) => ({
    place_id: place.id,
    source_id: row.source.id,
    rank: i + 1,
    relevance: row.relevance,
    note: row.note,
    timestamp_sec: row.timestamp_sec,
  }));

  linksByPlace.set(place.id, repacked);
  place.tags = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: combined.map((c) => `${c.source.title} ${c.source.snippet ?? ""}`),
  });
  place.updated_at = ts;

  placesMatched++;
  if (wasZero) zeroLinkPlacesFilled++;
  totalPlaceLinksAdded += added.length;

  if (samples.length < sampleLimit) {
    samples.push({
      place_id: place.id,
      place: place.name,
      city: city?.name ?? country?.name ?? "",
      category: place.category,
      before: curLinks.length,
      added: added.length,
      titles: added.map((a) => a.src.title),
    });
  }
}

// Step 2: Also fill `region_sources` (max 3 per city) from city-guide orphans!
const regionLinksByRegion = new Map<string, RegionSource[]>();
for (const rl of regionLinks) {
  const arr = regionLinksByRegion.get(rl.region_id) ?? [];
  arr.push(rl);
  regionLinksByRegion.set(rl.region_id, arr);
}

let regionsMatched = 0;
let totalRegionLinksAdded = 0;
const cities = regions.filter((r) => r.level === "city");

for (const city of cities) {
  const cur = regionLinksByRegion.get(city.id) ?? [];
  const need = MAX_SOURCES_PER_REGION - cur.length;
  if (need <= 0) continue;

  const bare = bareRegionName(city.name);
  const bareNorm = stripNonWord(bare);
  if (bareNorm.length < 2) continue;

  const existingIds = new Set(cur.map((c) => c.source_id));
  const cands: { src: Source; score: number }[] = [];
  const authorSeen = new Set<string>();

  for (const item of orphanPool) {
    if (item.isYt) continue;
    if (newlyLinkedSourceIds.has(item.src.id) || existingIds.has(item.src.id)) continue;
    if (!item.titleCompact.startsWith(bareNorm) && !hasBoundaryMatch(item.src.title, normCompact(bare), [])) {
      continue;
    }
    if (!REGION_GUIDE_RE.test(item.src.title)) continue;
    const score = item.src.score ?? 75;
    if (score < 70) continue;
    const aKey = (item.src.author || item.src.url).toLowerCase();
    if (authorSeen.has(aKey)) continue;
    authorSeen.add(aKey);
    cands.push({ src: item.src, score });
  }

  if (!cands.length) continue;
  cands.sort((a, b) => b.score - a.score);
  const picked = cands.slice(0, need);
  const merged = [
    ...cur,
    ...picked.map((p, idx) => {
      newlyLinkedSourceIds.add(p.src.id);
      return {
        region_id: city.id,
        source_id: p.src.id,
        rank: (cur.length + idx + 1) as 1 | 2 | 3,
        category: null,
        relevance: Number(Math.min(1, p.score / 100).toFixed(2)),
        note: "orphan_relink",
      };
    }),
  ].slice(0, MAX_SOURCES_PER_REGION);

  regionLinksByRegion.set(city.id, merged);
  regionsMatched++;
  totalRegionLinksAdded += picked.length;
}

const nextPlaceLinks: PlaceSource[] = [];
for (const rows of linksByPlace.values()) nextPlaceLinks.push(...rows);

const nextRegionLinks: RegionSource[] = [];
for (const rows of regionLinksByRegion.values()) nextRegionLinks.push(...rows);

const referencedAfter = new Set<string>();
for (const l of nextPlaceLinks) referencedAfter.add(l.source_id);
for (const l of nextRegionLinks) referencedAfter.add(l.source_id);
for (const c of contribs) if (c.source_id) referencedAfter.add(c.source_id);

const remainingOrphans = sources.filter((s) => !referencedAfter.has(s.id) || STUB_PROVIDERS.has(s.provider));

console.log(
  JSON.stringify(
    {
      dry_run: !values.apply,
      gc_requested: Boolean(values.gc),
      orphans_scanned: orphanPool.length,
      places_matched: placesMatched,
      zero_link_places_filled: zeroLinkPlacesFilled,
      place_links_before: links.length,
      place_links_after: nextPlaceLinks.length,
      place_links_added: totalPlaceLinksAdded,
      cities_matched_for_region_sources: regionsMatched,
      region_links_added: totalRegionLinksAdded,
      unique_orphan_sources_rescued: newlyLinkedSourceIds.size,
      remaining_unreferenced_sources: remainingOrphans.length,
      samples,
    },
    null,
    2,
  ),
);

if (!values.apply) {
  console.log("\ndry-run 완료. 실제 반영하려면: yarn source:relink -- --apply (남은 고아 정리 포함 시 --gc 추가)");
  process.exit(0);
}

write("place_sources", nextPlaceLinks);
write("region_sources", nextRegionLinks);
write("places", places);

if (values.gc) {
  const dropIds = new Set(remainingOrphans.map((s) => s.id));
  const keptSources = sources.filter((s) => !dropIds.has(s.id));
  const keptBoosts = boosts.filter((b) => !dropIds.has(b.source_id));
  const keptVoteScores = voteScores.filter((v) => !dropIds.has(v.source_id));
  const keptVotes = votes.filter((v) => !dropIds.has(v.source_id));
  const keptReports = reports.map((r) =>
    r.source_id && dropIds.has(r.source_id) ? { ...r, source_id: null } : r,
  );
  write("sources", keptSources);
  write("place_source_boosts", keptBoosts);
  write("place_source_vote_scores", keptVoteScores);
  write("place_source_votes", keptVotes);
  write("source_reports", keptReports);
  console.log(`반영 및 GC 완료: sources ${sources.length} → ${keptSources.length} (-${dropIds.size})`);
} else {
  write("sources", sources);
  console.log("반영 완료 (남은 고아 소스는 유지됨 · 정리하려면 yarn source:gc -- --apply)");
}
