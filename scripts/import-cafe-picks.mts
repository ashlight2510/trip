/**
 * Replace `pn-cafe` 풍경너머 픽 with cafes from the SNS ranking workbook.
 *
 *   yarn cafe:picks -- --file "/path/to/전국_카페_500_SNS_추정순위.xlsx"
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import ExcelJS from "exceljs";
import { loadEnv, now, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    file: {
      type: "string",
      default: path.join(process.env.HOME ?? "", "Downloads/전국_카페_500_SNS_추정순위.xlsx"),
    },
  },
});

loadEnv();

const filePath = path.resolve(values.file!);
if (!fs.existsSync(filePath)) {
  console.error(`파일을 찾을 수 없습니다: ${filePath}`);
  process.exit(1);
}

type Place = ReturnType<typeof read<"places">>[number];
type Region = ReturnType<typeof read<"regions">>[number];

const places = read("places");
const regions = read("regions");
const picks = read("place_picks");
const ts = now();

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）【】\[\]·・\-_.]/g, "")
    .replace(/점$/u, "");
}

function slugPart(s: string) {
  // place ids must be ASCII kebab-case — hash Korean names.
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const ascii = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return ascii || `cafe-${hash.toString(36)}`;
}

function keywordNote(raw: string) {
  const parts = raw
    .split(/[·・|,/]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
  return parts.join(" · ") || null;
}

function keywordTags(raw: string) {
  return raw
    .split(/[·・|,/]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
}

const regionById = new Map(regions.map((r) => [r.id, r]));

function walkUp(id: string | null | undefined): Region[] {
  const out: Region[] = [];
  let cur = id ? regionById.get(id) : undefined;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur);
    cur = cur.parent_id ? regionById.get(cur.parent_id) : undefined;
  }
  return out;
}

function resolveRegion(address: string): Region {
  // Prefer longest district/city name match from the address text.
  let best: Region | null = null;
  for (const region of regions) {
    if (region.country_code !== "KR") continue;
    if (region.level !== "district" && region.level !== "city") continue;
    if (!address.includes(region.name)) continue;
    if (!best || region.name.length > best.name.length || (region.name.length === best.name.length && region.level === "district")) {
      best = region;
    }
  }
  if (best) return best;
  const byId = (id: string) => regionById.get(id);
  const byName = (name: string) => regions.find((r) => r.name === name || r.name.includes(name));
  if (/제주/.test(address)) return byId("kr-jeju") ?? byName("제주시") ?? byId("kr-seoul")!;
  if (/서울/.test(address)) return byId("kr-seoul")!;
  if (/부산/.test(address)) return byId("kr-busan") ?? byId("kr-seoul")!;
  if (/인천/.test(address)) return byId("kr-incheon") ?? byId("kr-seoul")!;
  if (/대구/.test(address)) return byId("kr-daegu") ?? byId("kr-seoul")!;
  if (/대전/.test(address)) return byId("kr-daejeon") ?? byId("kr-seoul")!;
  if (/광주/.test(address)) return byId("kr-gwangju") ?? byId("kr-seoul")!;
  if (/울산/.test(address)) return byId("kr-ulsan") ?? byId("kr-seoul")!;
  return byId("kr-seoul")!;
}

function cityHint(address: string) {
  const chain = walkUp(resolveRegion(address).id);
  return chain.find((r) => r.level === "city")?.name ?? "";
}

function scoreCandidate(place: Place, excelName: string, address: string) {
  const pn = norm(place.name);
  const en = norm(excelName);
  let score = 0;
  if (pn === en) score += 100;
  else if (pn.startsWith(en) || en.startsWith(pn)) score += 70;
  else if (pn.includes(en) || en.includes(pn)) score += 40;
  else return -1;

  const city = cityHint(address);
  if (city && (place.address ?? "").includes(city.replace(/특별시|광역시|특별자치시|특별자치도|도$/g, "").slice(0, 2))) {
    score += 25;
  }
  if (address && place.address) {
    const aTokens = address.split(/\s+/).slice(0, 3);
    for (const t of aTokens) {
      if (t.length >= 2 && place.address.includes(t)) score += 8;
    }
  }
  return score;
}

function findPlace(excelName: string, address: string): Place | null {
  let best: { place: Place; score: number } | null = null;
  for (const place of places) {
    if (place.category !== "cafe" && !/카페|커피|베이커리|디저트|티하우스|도넛|베이글/.test(place.name)) {
      // still allow exact cafe-ish names on non-cafe category if exact match
      const pn = norm(place.name);
      const en = norm(excelName);
      if (pn !== en && !pn.startsWith(en) && !en.startsWith(pn)) continue;
    }
    const score = scoreCandidate(place, excelName, address);
    if (score < 70) continue; // require strong match
    if (!best || score > best.score) best = { place, score };
  }
  return best?.place ?? null;
}

type ExcelCafe = {
  rank: number;
  region: string;
  address: string;
  name: string;
  keywords: string;
};

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(filePath);
const sheet = wb.getWorksheet("전국 카페 500 순위") ?? wb.worksheets[0];
const rows: ExcelCafe[] = [];
for (let i = 2; i <= sheet.rowCount; i++) {
  const row = sheet.getRow(i);
  const rank = Number(row.getCell(1).value);
  const name = String(row.getCell(4).value ?? "").trim();
  if (!name || !Number.isFinite(rank)) continue;
  rows.push({
    rank,
    region: String(row.getCell(2).value ?? "").trim(),
    address: String(row.getCell(3).value ?? "").trim(),
    name,
    keywords: String(row.getCell(5).value ?? "").trim(),
  });
}
rows.sort((a, b) => a.rank - b.rank);

const placeById = new Map(places.map((p) => [p.id, p]));
const newPicks: typeof picks = picks.filter((p) => p.collection !== "pn-cafe");
let matched = 0;
let created = 0;
const usedPlaceIds = new Set<string>();

for (const row of rows) {
  const note = keywordNote(row.keywords);
  const tags = keywordTags(row.keywords);
  let place = findPlace(row.name, row.address);

  if (place && usedPlaceIds.has(place.id)) {
    // Same place matched twice — create a distinct pick place for this branch name.
    place = null;
  }

  if (!place) {
    const region = resolveRegion(row.address || row.region);
    const idBase = `kr-pick-${slugPart(row.name) || "cafe"}`;
    let id = idBase;
    let n = 2;
    while (placeById.has(id)) {
      id = `${idBase}-${n++}`;
    }
    const createdPlace: Place = {
      id,
      name: row.name,
      name_en: null,
      category: "cafe",
      region_id: region.id,
      address: row.address || null,
      lat: region.lat,
      lng: region.lng,
      description: note,
      tags: [...new Set(["카페", "커피맛집", ...tags])],
      view_heading: null,
      palette: null,
      created_at: ts,
      updated_at: ts,
    };
    places.push(createdPlace);
    placeById.set(id, createdPlace);
    place = createdPlace;
    created += 1;
  } else {
    matched += 1;
    // Enrich tags / description lightly without wiping existing data.
    const nextTags = [...new Set([...(place.tags ?? []), ...tags])].slice(0, 12);
    place.tags = nextTags;
    if (!place.description && note) place.description = note;
    if (!place.address && row.address) place.address = row.address;
    place.updated_at = ts;
  }

  usedPlaceIds.add(place.id);
  newPicks.push({
    place_id: place.id,
    collection: "pn-cafe",
    note,
    rank: row.rank,
    featured_at: ts,
  });
}

write("places", places);
write("place_picks", newPicks);

console.log(`Imported ${rows.length} cafe picks from ${path.basename(filePath)}`);
console.log(`Matched existing: ${matched} · Created: ${created}`);
console.log(`pn-cafe picks: ${newPicks.filter((p) => p.collection === "pn-cafe").length}`);
