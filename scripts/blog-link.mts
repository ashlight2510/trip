/**
 * Link top Naver blog posts to places (metadata + URL only).
 * Default: keep at most MAX_BLOG_SOURCES_PER_PLACE ranked visit-intent links,
 * preserving existing YouTube rows (up to MAX_YOUTUBE_SOURCES_PER_PLACE).
 *
 *   npm run blog:link -- <place_id>
 *   npm run blog:link -- --limit 100
 *   npm run blog:link -- --force --limit 50
 *
 * Popularity: Naver search API has no view count — visit-intent score on
 * title/snippet + search rank. YouTube fills real view_count later.
 */
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import {
  MAX_BLOG_SOURCES_PER_PLACE,
  MAX_SOURCES_PER_PLACE,
  MAX_YOUTUBE_SOURCES_PER_PLACE,
} from "../src/db/curation";
import type { Place, PlaceSource, Region, Source } from "../src/db/schema";
import { enrichPlaceTags } from "../src/lib/place-tags";
import { searchNaverBlogs, type NaverBlogItem } from "./lib/naver-search";
import { sortPlacesVisitFirst } from "./lib/place-quality";
import {
  placeSearchQuery,
  placeSearchQueryAlt,
  scoreVisitRelevance,
} from "./lib/source-relevance";
import { loadEnv, now, read, write } from "./lib/store";

const USAGE = `사용법:
  yarn blog:link -- <place_id> [--query "<검색어>"] [--count 7]
  yarn blog:link -- --limit 100
  yarn blog:link -- --force --only-thin --limit 200
  yarn blog:link -- --category landmark,park,beach --budget 5000
  yarn blog:link -- --empty-only --country KR --category landmark,heritage,park,forest,beach,viewpoint,street,market --budget 20000`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    query: { type: "string" },
    count: { type: "string", default: String(MAX_BLOG_SOURCES_PER_PLACE) },
    limit: { type: "string" },
    force: { type: "boolean", default: false },
    "only-thin": { type: "boolean", default: false },
    "empty-only": { type: "boolean", default: false },
    category: { type: "string" },
    /** ISO country code, e.g. KR — skips overseas Naver (low relevance). */
    country: { type: "string" },
    budget: { type: "string" },
  },
});

loadEnv();

const places = read("places");
const regions = read("regions");
const sources = read("sources");
let links = read("place_sources");

const want = Math.min(MAX_BLOG_SOURCES_PER_PLACE, Math.max(1, Number(values.count)));
const fetchN = Math.min(20, Math.max(want * 3, want));
const CHECKPOINT_EVERY = 25;
const MAX_PER_AUTHOR = 2;
/** If primary query yields fewer than this, run alt query. */
const ALT_QUERY_IF_BELOW = Math.max(3, Math.ceil(want / 2));

function cityName(regionId: string, regs: Region[]) {
  const seen = new Set<string>();
  let id: string | null = regionId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const r = regs.find((x) => x.id === id);
    if (!r) break;
    if (r.level === "city") return r.name;
    id = r.parent_id;
  }
  return null;
}

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

const asUrl = (s: string) => {
  if (!s) return null;
  try {
    return new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).toString();
  } catch {
    return null;
  }
};

const providerOf = (url: string) =>
  url.includes("blog.naver.com") ? "naver_blog" : url.includes("tistory.com") ? "tistory" : "blog";

function hasRealNaverBlog(placeId: string) {
  return links.some((l) => {
    if (l.place_id !== placeId) return false;
    const src = sources.find((s) => s.id === l.source_id);
    return src?.provider === "naver_blog" || src?.provider === "tistory";
  });
}

function realBlogCount(placeId: string) {
  return links.filter((l) => {
    if (l.place_id !== placeId) return false;
    const src = sources.find((s) => s.id === l.source_id);
    return src?.provider === "naver_blog" || src?.provider === "tistory";
  }).length;
}

type Cand = { source: Source; relevance: number; score: number; authorKey: string };

function ingestItems(
  place: Place,
  city: string | null,
  items: NaverBlogItem[],
  ts: string,
  into: Map<string, Cand>,
) {
  items.forEach((item, i) => {
    const url = asUrl(item.link);
    if (!url || into.has(url)) return;
    const title = clean(item.title) || "(제목 없음)";
    const snippet = clean(item.description).slice(0, 400) || "";
    const published = /^\d{8}$/.test(item.postdate)
      ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
      : null;
    const author = clean(item.bloggername) || null;

    const scored = scoreVisitRelevance({
      title,
      snippet,
      placeName: place.name,
      category: place.category,
      cityName: city,
      searchRank: i,
      searchPoolSize: Math.max(items.length, fetchN),
      publishedAt: published,
    });
    if (!scored.ok) return;

    const score = scored.score;
    let src = sources.find((s) => s.url === url);
    if (!src) {
      src = {
        id: `blog-${createHash("sha1").update(url).digest("hex").slice(0, 12)}`,
        type: "blog",
        provider: providerOf(url),
        url,
        title,
        author,
        author_url: asUrl(item.bloggerlink),
        published_at: published,
        snippet: snippet || null,
        thumbnail_url: null,
        view_count: null,
        score,
        fetched_at: ts,
      };
      sources.push(src);
    } else {
      src.score = Math.max(src.score ?? 0, score);
      src.title = title;
      src.snippet = snippet || src.snippet;
      if (author) src.author = author;
      src.fetched_at = ts;
    }
    into.set(url, {
      source: src,
      relevance: score / 100,
      score,
      authorKey: (author || src.author || url).toLowerCase(),
    });
  });
}

function pickDiverse(cands: Cand[], limit: number): Cand[] {
  const sorted = [...cands].sort((a, b) => b.score - a.score);
  const authorCount = new Map<string, number>();
  const out: Cand[] = [];
  for (const c of sorted) {
    const n = authorCount.get(c.authorKey) ?? 0;
    if (n >= MAX_PER_AUTHOR) continue;
    authorCount.set(c.authorKey, n + 1);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

async function linkPlace(place: Place, queryOverride?: string): Promise<number> {
  if (!values.force && hasRealNaverBlog(place.id)) return 0;

  const city = cityName(place.region_id, regions);
  const primary = queryOverride ?? placeSearchQuery(place.name, city, place.category);
  const ts = now();
  const byUrl = new Map<string, Cand>();

  const primaryItems = await searchNaverBlogs(primary, fetchN);
  ingestItems(place, city, primaryItems, ts, byUrl);

  if (!queryOverride && byUrl.size < ALT_QUERY_IF_BELOW) {
    const alt = placeSearchQueryAlt(place.name, city, place.category);
    if (alt !== primary) {
      await sleep(60);
      const altItems = await searchNaverBlogs(alt, fetchN);
      ingestItems(place, city, altItems, ts, byUrl);
    }
  }

  const top = pickDiverse([...byUrl.values()], want);

  const keepYt = links
    .filter((l) => l.place_id === place.id)
    .flatMap((l) => {
      const s = sources.find((x) => x.id === l.source_id);
      if (!s) return [];
      if (s.type === "youtube" || s.provider === "youtube") {
        return [{ source: s, relevance: l.relevance, score: s.score ?? Math.round(l.relevance * 100) }];
      }
      return [];
    })
    .sort((a, b) => (b.source.view_count ?? 0) - (a.source.view_count ?? 0) || b.score - a.score)
    .slice(0, MAX_YOUTUBE_SOURCES_PER_PLACE);

  const mixed = [
    ...top.map((c) => ({ source: c.source, relevance: c.relevance, score: c.score })),
    ...keepYt,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCES_PER_PLACE);

  links = links.filter((l) => l.place_id !== place.id);
  const nextLinks: PlaceSource[] = mixed.map((c, i) => ({
    place_id: place.id,
    source_id: c.source.id,
    rank: i + 1,
    relevance: c.relevance,
    note: null,
    timestamp_sec: null,
  }));
  links.push(...nextLinks);

  place.tags = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: mixed.map((c) => [c.source.title, c.source.snippet ?? ""].join(" ")),
  });
  place.updated_at = ts;

  if (positionals[0]) {
    console.log(
      `"${primary}" → 후보 ${byUrl.size}건 중 상위 ${nextLinks.length}건 연결 (${place.name})` +
        (nextLinks.length
          ? `\n  ${nextLinks.map((l, i) => `${i + 1}. [${mixed[i].source.type}] ${mixed[i].source.title} (${mixed[i].score})`).join("\n  ")}`
          : "") +
        `\n  tags ${place.tags.map((t) => `#${t}`).join(" ")}`,
    );
  }

  return nextLinks.filter((l) => {
    const s = mixed.find((m) => m.source.id === l.source_id)?.source;
    return s && s.type !== "youtube" && s.provider !== "youtube";
  }).length;
}

const categoryFilter = values.category
  ? new Set(
      values.category
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;
const countryFilter = values.country?.trim().toUpperCase() || null;
const apiBudget = values.budget ? Math.max(1, Number(values.budget)) : Infinity;
const onlyThin = Boolean(values["only-thin"]);
const emptyOnly = Boolean(values["empty-only"]);

const regionById = new Map(regions.map((r) => [r.id, r]));
function placeCountryCode(place: Place) {
  const reg = regionById.get(place.region_id);
  if (reg?.country_code) return reg.country_code.toUpperCase();
  const prefix = place.id.split("-")[0]?.toUpperCase();
  return prefix && prefix.length === 2 ? prefix : "KR";
}

let targets = places;
if (positionals[0]) {
  const one = places.find((p) => p.id === positionals[0]);
  if (!one) {
    console.error(`place ${positionals[0]} 가 places.json 에 없습니다.`);
    process.exit(1);
  }
  targets = [one];
} else {
  targets = sortPlacesVisitFirst(places);
  if (countryFilter) {
    targets = targets.filter((p) => placeCountryCode(p) === countryFilter);
  }
  if (categoryFilter?.size) {
    targets = targets.filter((p) => categoryFilter.has(p.category));
  }
  if (onlyThin) {
    targets = targets.filter((p) => {
      const n = realBlogCount(p.id);
      return n >= 1 && n <= 2;
    });
  } else if (emptyOnly) {
    targets = targets.filter((p) => !hasRealNaverBlog(p.id));
  }
  if (values.limit) {
    targets = targets.slice(0, Number(values.limit));
  }
}

if (!targets.length) {
  console.log(USAGE);
  process.exit(1);
}

let linked = 0;
let placesTouched = 0;
let skipped = 0;
let errors = 0;
let apiCalls = 0;

for (let i = 0; i < targets.length; i++) {
  const place = targets[i]!;
  if (!values.force && hasRealNaverBlog(place.id)) {
    skipped++;
    continue;
  }
  if (onlyThin && !values.force) {
    // thin refresh requires re-search
  }
  if (apiCalls >= apiBudget) {
    console.log(`API budget ${apiBudget} 소진 — 중단 (touched=${placesTouched})`);
    break;
  }
  try {
    const before = apiCalls;
    // each linkPlace does 1–2 searches; approximate after by counting attempts
    const n = await linkPlace(place, positionals[0] ? values.query : undefined);
    apiCalls = before + 2; // upper bound per place (primary + optional alt)
    if (n) {
      linked += n;
      placesTouched++;
    }
  } catch (e) {
    errors++;
    console.error(`[${i + 1}/${targets.length}] ${place.id} 실패:`, e instanceof Error ? e.message : e);
    if (errors >= 5) {
      console.error("연속 오류가 많아 중단합니다. 진행분까지 저장합니다.");
      break;
    }
    await sleep(1000);
    continue;
  }
  errors = 0;

  // Checkpoint on successes, and also every N attempts so long zero-hit stretches still flush/log.
  const attemptCheckpoint = (i + 1) % 100 === 0 || i === targets.length - 1;
  const successCheckpoint = placesTouched > 0 && placesTouched % CHECKPOINT_EVERY === 0;
  if (!positionals[0] && (successCheckpoint || attemptCheckpoint)) {
    write("sources", sources);
    write("place_sources", links);
    write("places", places);
    console.log(
      `[${i + 1}/${targets.length}] 연결 ${placesTouched}곳 (+${linked}링크) skip=${skipped} api~${apiCalls}`,
    );
  }

  if (!positionals[0]) await sleep(40);
}

write("sources", sources);
write("place_sources", links);
write("places", places);

if (!positionals[0]) {
  console.log(
    `완료: ${placesTouched}곳 연결, skip=${skipped}, sources=${sources.length}, place_sources=${links.length}`,
  );
}
