/**
 * Offline prune of place_sources using visit-intent scoring (no API calls).
 * Drops junk / no-place-mention / below-threshold blogs; re-ranks survivors.
 *
 *   yarn source:prune
 *   yarn source:prune -- --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  MAX_BLOG_SOURCES_PER_PLACE,
  MAX_SOURCES_PER_PLACE,
  MAX_YOUTUBE_SOURCES_PER_PLACE,
  STUB_SOURCE_PROVIDERS,
} from "../src/db/curation";
import type { PlaceSource, Region, Source } from "../src/db/schema";
import { scoreVisitRelevance } from "./lib/source-relevance";
import { loadEnv, now, read, write } from "./lib/store";

const STUB_PROVIDERS = new Set<string>(STUB_SOURCE_PROVIDERS);
const MAX_PER_AUTHOR = 2;

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});

loadEnv();

const places = read("places");
const regions = read("regions");
const sources = read("sources");
const links = read("place_sources");
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
      fs.readFileSync(path.join(process.cwd(), "data", "source_enrich_flags.json"), "utf8"),
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

const byId = new Map(sources.map((s) => [s.id, s]));
const byPlace = new Map(places.map((p) => [p.id, p]));
const cityByPlace = new Map(places.map((p) => [p.id, cityName(p.region_id, regions)]));

const grouped = new Map<string, PlaceSource[]>();
for (const l of links) {
  const arr = grouped.get(l.place_id) ?? [];
  arr.push(l);
  grouped.set(l.place_id, arr);
}

const nextLinks: PlaceSource[] = [];
let dropped = 0;
let placesChanged = 0;
const emptyBlogPlaceIds: string[] = [];

function pickDiverseBlogs(
  scored: { source: Source; score: number }[],
  limit: number,
): { source: Source; score: number }[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const authorCount = new Map<string, number>();
  const out: { source: Source; score: number }[] = [];
  for (const c of sorted) {
    const key = (c.source.author || c.source.url).toLowerCase();
    const n = authorCount.get(key) ?? 0;
    if (n >= MAX_PER_AUTHOR) continue;
    authorCount.set(key, n + 1);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

for (const [placeId, rows] of grouped) {
  const place = byPlace.get(placeId);
  if (!place) {
    dropped += rows.length;
    continue;
  }
  const city = cityByPlace.get(placeId) ?? null;

  const scored: { source: Source; score: number; isYt: boolean }[] = [];
  for (const row of rows) {
    const src = byId.get(row.source_id);
    if (!src) {
      dropped++;
      continue;
    }
    const isYt = src.type === "youtube" || src.provider === "youtube";
    if (STUB_PROVIDERS.has(src.provider)) {
      dropped++;
      continue;
    }
    if (bannedSourceIds.has(src.id)) {
      dropped++;
      continue;
    }
    const enrich = enrichByKey.get(`${placeId}::${src.id}`);
    if (enrich && (enrich.soft_junk || enrich.geo_mismatch || !enrich.visit_ok)) {
      dropped++;
      continue;
    }

    const visit = scoreVisitRelevance({
      title: src.title,
      snippet: src.snippet ?? "",
      placeName: place.name,
      category: place.category,
      cityName: city,
      publishedAt: src.published_at,
      viewCount: src.view_count,
    });

    if (!visit.ok) {
      dropped++;
      continue;
    }

    const popularity =
      src.view_count != null ? Math.min(100, Math.round(Math.log10(src.view_count + 1) * 20)) : 40;
    const score = isYt ? Math.round(visit.score * 0.55 + popularity * 0.45) : visit.score;
    src.score = Math.max(src.score ?? 0, score);
    scored.push({ source: src, score, isYt });
  }

  const blogs = pickDiverseBlogs(
    scored.filter((s) => !s.isYt),
    MAX_BLOG_SOURCES_PER_PLACE,
  );
  const yts = scored
    .filter((s) => s.isYt)
    .sort(
      (a, b) =>
        (b.source.view_count ?? 0) - (a.source.view_count ?? 0) || b.score - a.score,
    )
    .slice(0, MAX_YOUTUBE_SOURCES_PER_PLACE);

  const mixed = [...blogs, ...yts]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCES_PER_PLACE);

  const beforeIds = [...rows].sort((a, b) => a.rank - b.rank).map((r) => r.source_id);
  const afterIds = mixed.map((m) => m.source.id);
  if (beforeIds.join(",") !== afterIds.join(",")) placesChanged++;

  const hadBlogBefore = rows.some((r) => {
    const s = byId.get(r.source_id);
    return (
      s &&
      s.type !== "youtube" &&
      s.provider !== "youtube" &&
      !STUB_PROVIDERS.has(s.provider)
    );
  });
  if (hadBlogBefore && !blogs.length) emptyBlogPlaceIds.push(placeId);

  mixed.forEach((c, i) => {
    nextLinks.push({
      place_id: placeId,
      source_id: c.source.id,
      rank: i + 1,
      relevance: c.score / 100,
      note: null,
      timestamp_sec: null,
    });
  });
}

const ts = now();
const changedPlaces = new Set<string>();
for (const [placeId, rows] of grouped) {
  const after = nextLinks
    .filter((l) => l.place_id === placeId)
    .map((l) => l.source_id)
    .join(",");
  const before = [...rows]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.source_id)
    .join(",");
  if (before !== after) changedPlaces.add(placeId);
}
for (const p of places) {
  if (changedPlaces.has(p.id)) p.updated_at = ts;
}

console.log(
  JSON.stringify(
    {
      dry_run: values["dry-run"],
      before_links: links.length,
      after_links: nextLinks.length,
      dropped,
      places_changed: placesChanged,
      places_left_without_blog: emptyBlogPlaceIds.length,
      sample_empty_blog: emptyBlogPlaceIds.slice(0, 15),
    },
    null,
    2,
  ),
);

if (!values["dry-run"]) {
  write("place_sources", nextLinks);
  write("sources", sources);
  write("places", places);
  console.log(
    "저장 완료. 블로그가 비는 장소는 yarn blog:link 가 자동으로 다시 채웁니다 (연결된 글이 없으면 skip 안 함).",
  );
}
