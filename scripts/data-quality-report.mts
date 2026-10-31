/**
 * Coverage / orphan / stub report for data quality waves.
 *
 *   yarn data:quality
 *   yarn data:quality -- --sample
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { STUB_SOURCE_PROVIDERS, VISIT_PRIORITY_CATEGORIES } from "../src/db/curation";
import { evaluatePlaceQuality } from "./lib/place-quality";
import { loadEnv, read } from "./lib/store";

const { values } = parseArgs({
  options: {
    sample: { type: "boolean", default: false },
    out: { type: "string" },
  },
});

loadEnv();

const places = read("places");
const sources = read("sources");
const links = read("place_sources");
const regionLinks = read("region_sources");
const reports = read("source_reports");

const stubSet = new Set<string>(STUB_SOURCE_PROVIDERS);
const byId = new Map(sources.map((s) => [s.id, s]));

const linkedIds = new Set<string>();
for (const l of links) linkedIds.add(l.source_id);
for (const l of regionLinks) linkedIds.add(l.source_id);

const orphans = sources.filter((s) => !linkedIds.has(s.id));
const stubs = sources.filter((s) => stubSet.has(s.provider));
const stubLinked = links.filter((l) => {
  const s = byId.get(l.source_id);
  return s && stubSet.has(s.provider);
});

const realProviders = new Set(["naver_blog", "tistory", "youtube"]);
const linksByPlace = new Map<string, number>();
const realByPlace = new Map<string, number>();
for (const l of links) {
  linksByPlace.set(l.place_id, (linksByPlace.get(l.place_id) ?? 0) + 1);
  const s = byId.get(l.source_id);
  if (s && (realProviders.has(s.provider) || s.type === "youtube")) {
    realByPlace.set(l.place_id, (realByPlace.get(l.place_id) ?? 0) + 1);
  }
}

let zero = 0;
let thin = 0;
let rich = 0;
const byCat: Record<string, { n: number; zero: number }> = {};
let hardDrop = 0;
let visitPriority = 0;
let visitPriorityZero = 0;

for (const p of places) {
  const n = realByPlace.get(p.id) ?? 0;
  if (n === 0) zero++;
  else if (n <= 2) thin++;
  else rich++;
  const c = (byCat[p.category] ??= { n: 0, zero: 0 });
  c.n++;
  if (n === 0) c.zero++;
  if (VISIT_PRIORITY_CATEGORIES.has(p.category)) {
    visitPriority++;
    if (n === 0) visitPriorityZero++;
  }
  const q = evaluatePlaceQuality({ name: p.name, category: p.category, linkCount: n });
  if (!q.keep) hardDrop++;
}

const providerCount = new Map<string, number>();
for (const s of sources) {
  providerCount.set(s.provider, (providerCount.get(s.provider) ?? 0) + 1);
}

const report = {
  places: places.length,
  sources: sources.length,
  place_sources: links.length,
  coverage: {
    zero_real_links: zero,
    thin_1_2: thin,
    rich_3plus: rich,
    pct_with_link: Math.round(((places.length - zero) / Math.max(1, places.length)) * 1000) / 10,
    avg_real_links:
      Math.round(
        ([...realByPlace.values()].reduce((a, b) => a + b, 0) / Math.max(1, places.length)) * 100,
      ) / 100,
  },
  visit_priority: {
    places: visitPriority,
    zero_links: visitPriorityZero,
  },
  purge_candidates_hard: hardDrop,
  orphans: orphans.length,
  stubs_in_sources: stubs.length,
  stub_links: stubLinked.length,
  open_reports: reports.filter((r) => r.status === "open").length,
  by_category: byCat,
  top_providers: [...providerCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([provider, count]) => ({ provider, count })),
};

console.log(JSON.stringify(report, null, 2));

if (values.sample) {
  const emptyVisit = places
    .filter((p) => VISIT_PRIORITY_CATEGORIES.has(p.category) && (realByPlace.get(p.id) ?? 0) === 0)
    .slice(0, 50)
    .map((p) => ({ id: p.id, name: p.name, category: p.category, address: p.address }));
  const outDir = values.out ?? path.join(process.cwd(), "data", "quality-samples");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "empty-visit-places.json"), JSON.stringify(emptyVisit, null, 2) + "\n");
  console.log(`sample → ${outDir}/empty-visit-places.json (${emptyVisit.length})`);
}
