/**
 * Attach top Naver blog posts to a region (시/구), max MAX_SOURCES_PER_REGION.
 * Metadata + URL only — never store full posts.
 */
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { MAX_SOURCES_PER_REGION, categorySearchHints } from "../src/db/curation";
import { placeCategory, type RegionSource, type Source } from "../src/db/schema";
import { searchNaverBlogs } from "./lib/naver-search";
import { loadEnv, now, read, write } from "./lib/store";

const USAGE = `사용법:
  npm run region:link -- <region_id> [--query "강릉 여행"] [--category landmark] [--count 3]`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    query: { type: "string" },
    category: { type: "string" },
    count: { type: "string", default: String(MAX_SOURCES_PER_REGION) },
  },
});

const regionId = positionals[0];
if (!regionId) {
  console.log(USAGE);
  process.exit(1);
}

loadEnv();

const regions = read("regions");
const sources = read("sources");
let links = read("region_sources");

const region = regions.find((r) => r.id === regionId);
if (!region) {
  console.error(`region ${regionId} 없음`);
  process.exit(1);
}

const category = values.category ? placeCategory.parse(values.category) : null;
const hint = category ? categorySearchHints[category]?.[0] : "여행";
const query = values.query ?? `${region.name.replace(/(특별시|광역시|특별자치시|시|구|동)$/, "")} ${hint}`;
const want = Math.min(MAX_SOURCES_PER_REGION, Math.max(1, Number(values.count)));
const fetchN = Math.min(20, want * 4);

const items = await searchNaverBlogs(query, fetchN);

const clean = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();

const asUrl = (s: string) => {
  try {
    return s ? new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).toString() : null;
  } catch {
    return null;
  }
};

const isJunk = (t: string, s: string) => /체험단|원고료|광고|협찬|쿠팡파트너스/i.test(`${t} ${s}`);
const ts = now();
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
      provider: url.includes("blog.naver.com") ? "naver_blog" : url.includes("tistory.com") ? "tistory" : "blog",
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

links = links.filter((l) => l.region_id !== region.id);
const next: RegionSource[] = top.map((c, i) => ({
  region_id: region.id,
  source_id: c.source.id,
  rank: (i + 1) as 1 | 2 | 3,
  category,
  relevance: c.relevance,
  note: null,
}));
links.push(...next);

write("sources", sources);
write("region_sources", links);
console.log(`"${query}" → ${region.name} 대표 후기 ${next.length}건`);
next.forEach((l, i) => console.log(`  ${i + 1}. ${top[i].source.title}`));
