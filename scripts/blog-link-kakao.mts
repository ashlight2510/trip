/**
 * Link places to outbound review entry points — no Naver/Kakao Search API.
 *
 * Per place (max 3):
 *  1. Kakao Map place detail (from place_external_refs.url)
 *  2. Daum blog search page (Kakao ecosystem)
 *  3. Naver blog search page (outbound only)
 *
 *   npm run blog:link:kakao
 *   npm run blog:link:kakao -- --limit 50
 *   npm run blog:link:kakao -- <place_id>
 */
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { MAX_SOURCES_PER_PLACE } from "../src/db/curation";
import type { Place, PlaceSource, Region, Source } from "../src/db/schema";
import { daumBlogSearchUrl, naverBlogSearchUrl, placeSearchQuery } from "../src/lib/search-links";
import { loadEnv, now, read, write } from "./lib/store";

const USAGE = `사용법:
  npm run blog:link:kakao
  npm run blog:link:kakao -- --limit 50
  npm run blog:link:kakao -- <place_id>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

loadEnv();

const places = read("places");
const regions = read("regions");
const refs = read("place_external_refs");
const sources = read("sources");
let links = read("place_sources");
const ts = now();

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

function upsertSource(partial: Omit<Source, "fetched_at"> & { fetched_at?: string }): Source {
  const existing = sources.find((s) => s.url === partial.url);
  if (existing) {
    existing.title = partial.title;
    existing.snippet = partial.snippet;
    existing.score = Math.max(existing.score ?? 0, partial.score ?? 0);
    existing.fetched_at = ts;
    return existing;
  }
  const row: Source = { ...partial, fetched_at: ts };
  sources.push(row);
  return row;
}

function sourceIdFor(url: string, prefix: string) {
  return `${prefix}-${createHash("sha1").update(url).digest("hex").slice(0, 12)}`;
}

function linkPlace(place: Place): number {
  if (!values.force && links.some((l) => l.place_id === place.id)) return 0;

  const city = cityName(place.region_id, regions);
  const query = placeSearchQuery(place.name, city);
  const kakaoRef = refs.find((r) => r.place_id === place.id && r.provider === "kakao" && r.url);

  const candidates: { source: Source; score: number }[] = [];

  if (kakaoRef?.url) {
    candidates.push({
      score: 100,
      source: upsertSource({
        id: sourceIdFor(kakaoRef.url, "kakao"),
        type: "article",
        provider: "kakao_map",
        url: kakaoRef.url,
        title: `${place.name} · 카카오맵`,
        author: null,
        author_url: null,
        published_at: null,
        snippet: "카카오맵 장소 상세·후기 보기",
        thumbnail_url: null,
        view_count: null,
        score: 100,
      }),
    });
  }

  const daumUrl = daumBlogSearchUrl(query);
  candidates.push({
    score: 80,
    source: upsertSource({
      id: sourceIdFor(daumUrl, "daum"),
      type: "blog",
      provider: "daum_blog_search",
      url: daumUrl,
      title: `${query} · 다음 블로그`,
      author: null,
      author_url: null,
      published_at: null,
      snippet: "다음(카카오) 블로그 검색 결과로 이동",
      thumbnail_url: null,
      view_count: null,
      score: 80,
    }),
  });

  const naverUrl = naverBlogSearchUrl(query);
  candidates.push({
    score: 70,
    source: upsertSource({
      id: sourceIdFor(naverUrl, "naver"),
      type: "blog",
      provider: "naver_blog_search",
      url: naverUrl,
      title: `${query} · 네이버 블로그`,
      author: null,
      author_url: null,
      published_at: null,
      snippet: "네이버 블로그 검색 결과로 이동",
      thumbnail_url: null,
      view_count: null,
      score: 70,
    }),
  });

  const top = candidates.slice(0, MAX_SOURCES_PER_PLACE);
  links = links.filter((l) => l.place_id !== place.id);
  const next: PlaceSource[] = top.map((c, i) => ({
    place_id: place.id,
    source_id: c.source.id,
    rank: (i + 1) as 1 | 2 | 3,
    relevance: c.score / 100,
    note: null,
    timestamp_sec: null,
  }));
  links.push(...next);
  return next.length;
}

let targets = places;
if (positionals[0]) {
  const one = places.find((p) => p.id === positionals[0]);
  if (!one) {
    console.error(`place ${positionals[0]} 없음`);
    process.exit(1);
  }
  targets = [one];
} else if (values.limit) {
  targets = places.slice(0, Number(values.limit));
}

if (!targets.length) {
  console.log(USAGE);
  process.exit(1);
}

let linked = 0;
let placesTouched = 0;
for (const place of targets) {
  const n = linkPlace(place);
  if (n) {
    linked += n;
    placesTouched++;
  }
}

write("sources", sources);
write("place_sources", links);
console.log(
  `완료: ${placesTouched}곳 × 최대 ${MAX_SOURCES_PER_PLACE}링크 (신규/갱신 링크 ${linked}건)` +
    `\n  sources=${sources.length}  place_sources=${links.length}`,
);
