/**
 * Link top Naver blog posts to places (metadata + URL only).
 * Default: keep at most MAX_SOURCES_PER_PLACE (3) ranked links.
 *
 *   npm run blog:link -- <place_id>
 *   npm run blog:link -- --limit 100
 *   npm run blog:link -- --force --limit 50
 *
 * Popularity: Naver search API has no view count — we use search rank (sort=sim)
 * as a score proxy. YouTube can fill real view_count later.
 */
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { MAX_SOURCES_PER_PLACE } from "../src/db/curation";
import type { Place, PlaceSource, Region, Source } from "../src/db/schema";
import { enrichPlaceTags } from "../src/lib/place-tags";
import { searchNaverBlogs } from "./lib/naver-search";
import { loadEnv, now, read, write } from "./lib/store";

const USAGE = `사용법:
  npm run blog:link -- <place_id> [--query "<검색어>"] [--count 3]
  npm run blog:link -- --limit 100
  npm run blog:link -- --force --limit 50`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    query: { type: "string" },
    count: { type: "string", default: String(MAX_SOURCES_PER_PLACE) },
    limit: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

loadEnv();

const places = read("places");
const regions = read("regions");
const sources = read("sources");
let links = read("place_sources");

const want = Math.min(MAX_SOURCES_PER_PLACE, Math.max(1, Number(values.count)));
const fetchN = Math.min(20, Math.max(want * 3, want));
const CHECKPOINT_EVERY = 25;

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

const isJunk = (title: string, snippet: string) =>
  /체험단|원고료|광고|협찬|쿠팡파트너스|클릭하면/i.test(`${title} ${snippet}`);

function hasRealNaverBlog(placeId: string) {
  return links.some((l) => {
    if (l.place_id !== placeId) return false;
    const src = sources.find((s) => s.id === l.source_id);
    return src?.provider === "naver_blog" || src?.provider === "tistory";
  });
}

async function linkPlace(place: Place, queryOverride?: string): Promise<number> {
  if (!values.force && hasRealNaverBlog(place.id)) return 0;

  const city = cityName(place.region_id, regions);
  const query =
    queryOverride ?? [city?.replace(/(시|군|구)$/, ""), place.name].filter(Boolean).join(" ");
  const ts = now();
  const items = await searchNaverBlogs(query, fetchN);
  const candidates: { source: Source; relevance: number; score: number }[] = [];

  items.forEach((item, i) => {
    const url = asUrl(item.link);
    if (!url) return;
    const title = clean(item.title) || "(제목 없음)";
    const snippet = clean(item.description).slice(0, 400) || null;
    if (isJunk(title, snippet ?? "")) return;

    const score = Math.round(((fetchN - i) / fetchN) * 100);
    let src = sources.find((s) => s.url === url);
    if (!src) {
      src = {
        id: `blog-${createHash("sha1").update(url).digest("hex").slice(0, 12)}`,
        type: "blog",
        provider: providerOf(url),
        url,
        title,
        author: clean(item.bloggername) || null,
        author_url: asUrl(item.bloggerlink),
        published_at: /^\d{8}$/.test(item.postdate)
          ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
          : null,
        snippet,
        thumbnail_url: null,
        view_count: null,
        score,
        fetched_at: ts,
      };
      sources.push(src);
    } else {
      src.score = Math.max(src.score ?? 0, score);
      src.fetched_at = ts;
    }
    candidates.push({ source: src, relevance: score / 100, score });
  });

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, want);
  links = links.filter((l) => l.place_id !== place.id);
  const nextLinks: PlaceSource[] = top.map((c, i) => ({
    place_id: place.id,
    source_id: c.source.id,
    rank: (i + 1) as 1 | 2 | 3,
    relevance: c.relevance,
    note: null,
    timestamp_sec: null,
  }));
  links.push(...nextLinks);

  place.tags = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: top.map((c) => [c.source.title, c.source.snippet ?? ""].join(" ")),
  });
  place.updated_at = ts;

  if (positionals[0]) {
    console.log(
      `"${query}" → 후보 ${candidates.length}건 중 상위 ${nextLinks.length}건 연결 (${place.name})` +
        (nextLinks.length ? `\n  ${nextLinks.map((l, i) => `${i + 1}. ${top[i].source.title}`).join("\n  ")}` : "") +
        `\n  tags ${place.tags.map((t) => `#${t}`).join(" ")}`,
    );
  }

  return nextLinks.length;
}

let targets = places;
if (positionals[0]) {
  const one = places.find((p) => p.id === positionals[0]);
  if (!one) {
    console.error(`place ${positionals[0]} 가 places.json 에 없습니다.`);
    process.exit(1);
  }
  targets = [one];
} else if (values.limit) {
  targets = places.slice(0, Number(values.limit));
} else if (!values.limit && !positionals[0]) {
  // full catalog — skip already-linked unless --force
  targets = places;
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
  if (!values.force && hasRealNaverBlog(place.id)) {
    skipped++;
    continue;
  }
  try {
    const n = await linkPlace(place, positionals[0] ? values.query : undefined);
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

  // Checkpoint only after real links — skip-only loops used to rewrite ~30MB every place.
  if (
    !positionals[0] &&
    placesTouched > 0 &&
    (placesTouched % CHECKPOINT_EVERY === 0 || i === targets.length - 1)
  ) {
    write("sources", sources);
    write("place_sources", links);
    write("places", places);
    console.log(
      `[${i + 1}/${targets.length}] 연결 ${placesTouched}곳 (+${linked}링크) skip=${skipped}`,
    );
  }

  if (!positionals[0] && placesTouched > 0) await sleep(80);
}

write("sources", sources);
write("place_sources", links);
write("places", places);

if (!positionals[0]) {
  console.log(
    `완료: ${placesTouched}곳 연결, skip=${skipped}, sources=${sources.length}, place_sources=${links.length}`,
  );
}
