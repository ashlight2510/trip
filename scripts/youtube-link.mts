/**
 * Link top YouTube videos to places (metadata + URL only).
 * Mix policy: keep up to 2 blogs, add 1 YouTube → max MAX_SOURCES_PER_PLACE.
 *
 *   npm run youtube:link -- <place_id>
 *   npm run youtube:link -- --limit 50
 */
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { MAX_SOURCES_PER_PLACE } from "../src/db/curation";
import type { Place, PlaceSource, Region, Source } from "../src/db/schema";
import { enrichPlaceTags } from "../src/lib/place-tags";
import { loadEnv, now, read, write } from "./lib/store";
import { searchYoutubeVideos } from "./lib/youtube-search";

const USAGE = `사용법:
  npm run youtube:link -- <place_id>
  npm run youtube:link -- --limit 50`;

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
const sources = read("sources");
let links = read("place_sources");

const CHECKPOINT_EVERY = 20;
const MAX_YT = 1;
const MAX_BLOG = Math.max(1, MAX_SOURCES_PER_PLACE - MAX_YT);

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

function hasYoutube(placeId: string) {
  return links.some((l) => {
    if (l.place_id !== placeId) return false;
    const src = sources.find((s) => s.id === l.source_id);
    return src?.type === "youtube" || src?.provider === "youtube";
  });
}

function existingSourcesFor(placeId: string): Source[] {
  return links
    .filter((l) => l.place_id === placeId)
    .sort((a, b) => a.rank - b.rank)
    .flatMap((l) => {
      const s = sources.find((x) => x.id === l.source_id);
      return s ? [s] : [];
    });
}

async function linkPlace(place: Place): Promise<number> {
  if (!values.force && hasYoutube(place.id)) return 0;

  const city = cityName(place.region_id, regions);
  const query = [city?.replace(/(시|군|구)$/, ""), place.name, "여행"].filter(Boolean).join(" ");
  const ts = now();
  const items = await searchYoutubeVideos(query, 5);
  if (!items.length) return 0;

  // Prefer higher view count among top search hits
  const picked = [...items].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, MAX_YT);

  const ytSources: Source[] = [];
  for (const item of picked) {
    let src = sources.find((s) => s.url === item.url);
    if (!src) {
      src = {
        id: `yt-${createHash("sha1").update(item.url).digest("hex").slice(0, 12)}`,
        type: "youtube",
        provider: "youtube",
        url: item.url,
        title: item.title,
        author: item.channelTitle || null,
        author_url: item.channelId ? `https://www.youtube.com/channel/${item.channelId}` : null,
        published_at: item.publishedAt ? item.publishedAt.slice(0, 10) : null,
        snippet: item.description || null,
        thumbnail_url: item.thumbnailUrl,
        view_count: item.viewCount,
        score: item.viewCount != null ? Math.min(100, Math.round(Math.log10(item.viewCount + 1) * 20)) : 50,
        fetched_at: ts,
      };
      sources.push(src);
    } else {
      src.view_count = item.viewCount ?? src.view_count;
      src.thumbnail_url = item.thumbnailUrl ?? src.thumbnail_url;
      src.fetched_at = ts;
      src.score = Math.max(src.score ?? 0, item.viewCount != null ? Math.min(100, Math.round(Math.log10(item.viewCount + 1) * 20)) : 0);
    }
    ytSources.push(src);
  }

  const prev = existingSourcesFor(place.id);
  const blogs = prev.filter((s) => s.type !== "youtube" && s.provider !== "youtube").slice(0, MAX_BLOG);
  const mixed = [...blogs, ...ytSources].slice(0, MAX_SOURCES_PER_PLACE);

  links = links.filter((l) => l.place_id !== place.id);
  const next: PlaceSource[] = mixed.map((s, i) => ({
    place_id: place.id,
    source_id: s.id,
    rank: (i + 1) as 1 | 2 | 3,
    relevance: (s.score ?? 50) / 100,
    note: null,
    timestamp_sec: null,
  }));
  links.push(...next);

  place.tags = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: mixed.map((s) => `${s.title} ${s.snippet ?? ""}`),
  });
  place.updated_at = ts;

  if (positionals[0]) {
    console.log(
      `"${query}" → 유튜브 ${ytSources.length}건 믹스 (${place.name})\n` +
        mixed.map((s, i) => `  ${i + 1}. [${s.type}] ${s.title}`).join("\n"),
    );
  }
  return ytSources.length;
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
let skipped = 0;
let errors = 0;

for (let i = 0; i < targets.length; i++) {
  const place = targets[i]!;
  if (!values.force && hasYoutube(place.id)) {
    skipped++;
    continue;
  }
  try {
    const n = await linkPlace(place);
    if (n) {
      linked += n;
      placesTouched++;
    }
  } catch (e) {
    errors++;
    console.error(`[${i + 1}/${targets.length}] ${place.id} 실패:`, e instanceof Error ? e.message : e);
    if (errors >= 5) {
      console.error("연속 오류로 중단. 진행분 저장.");
      break;
    }
    await sleep(1000);
    continue;
  }
  errors = 0;

  if (
    !positionals[0] &&
    placesTouched > 0 &&
    (placesTouched % CHECKPOINT_EVERY === 0 || i === targets.length - 1)
  ) {
    write("sources", sources);
    write("place_sources", links);
    write("places", places);
    console.log(`[${i + 1}/${targets.length}] 유튜브 ${placesTouched}곳 (+${linked}) skip=${skipped}`);
  }
  if (!positionals[0] && placesTouched > 0) await sleep(120);
}

write("sources", sources);
write("place_sources", links);
write("places", places);

if (!positionals[0]) {
  console.log(`완료: 유튜브 ${placesTouched}곳, skip=${skipped}, sources=${sources.length}`);
}
