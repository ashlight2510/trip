/**
 * Fetch OG/meta + short body text for scoring only — never store full post bodies/images.
 *
 *   yarn source:enrich -- --limit 200
 *   yarn source:enrich -- --dry-run --limit 20
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { STUB_SOURCE_PROVIDERS } from "../src/db/curation";
import type { Place, Region, Source } from "../src/db/schema";
import { scoreVisitRelevance } from "./lib/source-relevance";
import { loadEnv, now, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "300" },
    "dry-run": { type: "boolean", default: false },
    concurrency: { type: "string", default: "4" },
  },
});

loadEnv();

export type EnrichFlag = {
  source_id: string;
  place_id: string;
  visit_ok: boolean;
  soft_junk: boolean;
  geo_mismatch: boolean;
  score: number;
  reason: string | null;
  checked_at: string;
};

const FLAG_FILE = path.join(process.cwd(), "data", "source_enrich_flags.json");

function readFlags(): EnrichFlag[] {
  try {
    return JSON.parse(fs.readFileSync(FLAG_FILE, "utf8")) as EnrichFlag[];
  } catch {
    return [];
  }
}

function writeFlags(rows: EnrichFlag[]) {
  const tmp = `${FLAG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(rows, null, 2)}\n`);
  fs.renameSync(tmp, FLAG_FILE);
}

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

function extractMeta(html: string): { title: string; description: string; bodySample: string } {
  const ogTitle = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1];
  const ogDesc = html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["']\s+property=["']og:description["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const metaDesc = html.match(/name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
  const decode = (s: string) =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  return {
    title: decode(ogTitle || titleTag || ""),
    description: decode(ogDesc || metaDesc || ""),
    bodySample: text,
  };
}

async function fetchSnippet(url: string): Promise<{ title: string; description: string; bodySample: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "PungyeongNeomeoBot/0.1 (+https://github.com/ashlight2510/trip; metadata-only)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    const html = (await res.text()).slice(0, 180_000);
    return extractMeta(html);
  } catch {
    return null;
  }
}

const places = read("places");
const regions = read("regions");
const sources = read("sources");
const links = read("place_sources");
const stub = new Set(STUB_SOURCE_PROVIDERS);
const placeById = new Map(places.map((p) => [p.id, p]));
const sourceById = new Map(sources.map((s) => [s.id, s]));

const pairs: { place: Place; source: Source }[] = [];
for (const l of links) {
  const place = placeById.get(l.place_id);
  const source = sourceById.get(l.source_id);
  if (!place || !source) continue;
  if (stub.has(source.provider as (typeof STUB_SOURCE_PROVIDERS)[number])) continue;
  if (source.type === "youtube") continue;
  pairs.push({ place, source });
}

const limit = Math.max(1, Number(values.limit));
const targets = pairs.slice(0, limit);
const flags = readFlags();
const flagMap = new Map(flags.map((f) => [`${f.place_id}::${f.source_id}`, f]));

let checked = 0;
let softJunk = 0;
let geoBad = 0;
let failed = 0;

console.log(`enrich targets=${targets.length} dry_run=${values["dry-run"]}`);

for (const { place, source } of targets) {
  const city = cityName(place.region_id, regions);
  const meta = values["dry-run"] ? null : await fetchSnippet(source.url);
  if (!values["dry-run"] && !meta) {
    failed++;
    await sleep(120);
    continue;
  }

  const title = meta?.title || source.title;
  const snippet = [meta?.description, meta?.bodySample, source.snippet].filter(Boolean).join(" ").slice(0, 800);
  const visit = scoreVisitRelevance({
    title,
    snippet,
    placeName: place.name,
    category: place.category,
    cityName: city,
    publishedAt: source.published_at,
    viewCount: source.view_count,
  });

  const soft_junk = Boolean(visit.reason === "junk" || /체험단|협찬|광고|쿠팡파트너스/i.test(snippet));
  const geo_mismatch =
    visit.reason === "chain_needs_city" ||
    visit.reason === "no_place_mention" ||
    (!visit.ok && /city|geo|place/i.test(visit.reason ?? ""));

  const row: EnrichFlag = {
    source_id: source.id,
    place_id: place.id,
    visit_ok: visit.ok,
    soft_junk,
    geo_mismatch,
    score: visit.score,
    reason: visit.reason ?? null,
    checked_at: now(),
  };
  flagMap.set(`${place.id}::${source.id}`, row);
  checked++;
  if (soft_junk) softJunk++;
  if (geo_mismatch) geoBad++;

  if (!values["dry-run"] && meta?.title && meta.title.length >= 4) {
    // Refresh title/snippet lightly — still metadata only, never full body.
    source.title = meta.title.slice(0, 200);
    if (meta.description) source.snippet = meta.description.slice(0, 400);
    source.score = Math.max(source.score ?? 0, visit.score);
    source.fetched_at = now();
  }

  if (checked % 25 === 0) {
    console.log(`checked=${checked} soft_junk=${softJunk} geo=${geoBad} fail=${failed}`);
  }
  await sleep(100);
}

if (!values["dry-run"]) {
  writeFlags([...flagMap.values()]);
  write("sources", sources);
}

console.log(
  JSON.stringify(
    {
      checked,
      soft_junk: softJunk,
      geo_mismatch: geoBad,
      fetch_failed: failed,
      flags_file: FLAG_FILE,
      dry_run: values["dry-run"],
    },
    null,
    2,
  ),
);
