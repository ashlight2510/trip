/**
 * Collect ~30 tourism POIs per Korean city via OpenStreetMap Overpass.
 * Writes into data/regions.json, places.json, place_external_refs.json.
 *
 * Usage:
 *   npm run collect:kr              # all cities in data/kr-cities.json
 *   npm run collect:kr -- --limit 5 # first 5 cities (smoke test)
 *   npm run collect:kr -- --city kr-jeju
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import type { Place, PlaceExternalRef, Region } from "../src/db/schema";
import { now, read, write } from "./lib/store";

interface CitySeed {
  id: string;
  name: string;
  name_en: string;
  province_id: string;
  province_name: string;
  lat: number;
  lng: number;
  radius_m: number;
}

interface OsmEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const PER_CITY = 30;
/** Overpass free servers rate-limit; keep a short pause between cities. */
const SLEEP_MS = 800;
const UA = "pungyeong-neomeo/0.1 (travel map seed; local collector)";

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    city: { type: "string" },
    dry: { type: "boolean", default: false },
  },
});

const citiesPath = path.join(process.cwd(), "data", "kr-cities.json");
let cities = JSON.parse(fs.readFileSync(citiesPath, "utf8")) as CitySeed[];
if (values.city) cities = cities.filter((c) => c.id === values.city);
if (values.limit) cities = cities.slice(0, Number(values.limit));
if (cities.length === 0) {
  console.error("수집할 시가 없습니다.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guessCategory(tags: Record<string, string>): Place["category"] {
  const tourism = tags.tourism ?? "";
  const historic = tags.historic ?? "";
  const leisure = tags.leisure ?? "";
  const amenity = tags.amenity ?? "";
  const name = `${tags.name ?? ""} ${tags["name:ko"] ?? ""}`;

  if (/beach|beach_resort/i.test(tourism) || /해수욕|해변/.test(name)) return "beach";
  if (tourism === "museum" || amenity === "arts_centre") return "landmark";
  if (tourism === "viewpoint" || leisure === "viewpoint") return "viewpoint";
  if (tourism === "zoo" || tourism === "theme_park" || tourism === "aquarium") return "landmark";
  if (leisure === "park" || leisure === "garden" || leisure === "nature_reserve") return "park";
  if (historic || tourism === "attraction") return "heritage";
  if (amenity === "cafe" || amenity === "cafe;restaurant") return "cafe";
  if (amenity === "marketplace" || /시장/.test(name)) return "market";
  if (amenity === "place_of_worship" || tourism === "gallery") return "heritage";
  if (/숲|수목|휴양림|forest|bamboo/i.test(name)) return "forest";
  return "landmark";
}

function placeName(tags: Record<string, string>) {
  return (tags["name:ko"] || tags.name || tags["name:en"] || "").trim();
}

function districtLabel(tags: Record<string, string>, cityName: string) {
  const raw =
    tags["addr:district"] ||
    tags["addr:suburb"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:quarter"] ||
    tags["addr:city_district"] ||
    "";
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (cleaned) return cleaned;
  return `${cityName.replace(/(특별시|광역시|특별자치시|시)$/, "")} 중심`;
}

function slugPart(s: string) {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}

function districtId(cityId: string, label: string) {
  return `${cityId}-d-${slugPart(label)}`;
}

async function fetchCity(city: CitySeed): Promise<OsmEl[]> {
  // Keep the query small — large metros time out on free Overpass servers.
  const q = `
[out:json][timeout:45];
(
  nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|aquarium|gallery)$"](around:${city.radius_m},${city.lat},${city.lng});
  node["historic"~"^(monument|memorial|castle|ruins|tomb)$"](around:${city.radius_m},${city.lat},${city.lng});
);
out center 60;
`.trim();

  let lastErr: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status} @ ${endpoint}`);
        continue;
      }
      const json = (await res.json()) as { elements: OsmEl[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("Overpass failed");
}

function coords(el: OsmEl) {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function score(el: OsmEl) {
  const tags = el.tags ?? {};
  let s = 0;
  if (tags["name:ko"]) s += 5;
  if (tags.name) s += 3;
  if (tags.wikipedia || tags.wikidata) s += 2;
  if (tags.tourism === "attraction" || tags.tourism === "museum") s += 2;
  if (tags.historic) s += 1;
  if (tags.tourism === "hotel") s -= 4;
  return s;
}

const regions = read("regions");
const places = read("places");
const refs = read("place_external_refs");
const ts = now();

function ensureRegion(row: Region) {
  const i = regions.findIndex((r) => r.id === row.id);
  if (i >= 0) regions[i] = { ...regions[i], ...row };
  else regions.push(row);
}

if (!regions.some((r) => r.id === "kr")) {
  ensureRegion({
    id: "kr",
    parent_id: null,
    level: "country",
    name: "대한민국",
    name_en: "South Korea",
    country_code: "KR",
    lat: 36.5,
    lng: 127.9,
  });
}

let addedPlaces = 0;
let skipped = 0;

for (let i = 0; i < cities.length; i++) {
  const city = cities[i];
  console.log(`[${i + 1}/${cities.length}] ${city.name} 수집 중…`);

  ensureRegion({
    id: city.province_id,
    parent_id: "kr",
    level: "province",
    name: city.province_name,
    name_en: null,
    country_code: "KR",
    lat: city.lat,
    lng: city.lng,
  });
  ensureRegion({
    id: city.id,
    parent_id: city.province_id === city.id ? "kr" : city.province_id,
    level: "city",
    name: city.name,
    name_en: city.name_en,
    country_code: "KR",
    lat: city.lat,
    lng: city.lng,
  });

  const already = places.filter((p) => {
    const reg = regions.find((r) => r.id === p.region_id);
    if (!reg) return false;
    if (reg.id === city.id) return true;
    if (reg.parent_id === city.id) return true;
    return false;
  }).length;
  if (already >= PER_CITY) {
    console.log(`  이미 ${already}곳 — skip`);
    continue;
  }

  let elements: OsmEl[] = [];
  try {
    elements = await fetchCity(city);
  } catch (e) {
    console.error(`  실패: ${e instanceof Error ? e.message : e}`);
    await sleep(SLEEP_MS);
    continue;
  }

  const picked = elements
    .map((el) => ({ el, c: coords(el), name: placeName(el.tags ?? {}), sc: score(el) }))
    .filter((x) => x.c && x.name.length >= 2)
    .sort((a, b) => b.sc - a.sc);

  const seenName = new Set<string>();
  const chosen: typeof picked = [];
  for (const row of picked) {
    const key = row.name.replace(/\s+/g, "").toLowerCase();
    if (seenName.has(key)) continue;
    // skip if we already have a place within ~80m
    const near = places.some((p) => Math.hypot((p.lat - row.c!.lat) * 111_000, (p.lng - row.c!.lng) * 88_000) < 80);
    if (near) {
      skipped++;
      continue;
    }
    seenName.add(key);
    chosen.push(row);
    if (chosen.length >= PER_CITY) break;
  }

  // fill existing city places toward 30 by not deleting old ones — only add until city has 30 total from this city_id
  const existingInCity = places.filter((p) => {
    // district under city or direct (legacy)
    const reg = regions.find((r) => r.id === p.region_id);
    if (!reg) return false;
    if (reg.id === city.id) return true;
    if (reg.parent_id === city.id) return true;
    return false;
  }).length;

  const need = Math.max(0, PER_CITY - existingInCity);
  const toAdd = chosen.slice(0, need);

  for (const row of toAdd) {
    const tags = row.el.tags ?? {};
    const dLabel = districtLabel(tags, city.name);
    const dId = districtId(city.id, dLabel);
    ensureRegion({
      id: dId,
      parent_id: city.id,
      level: "district",
      name: dLabel,
      name_en: null,
      country_code: "KR",
      lat: row.c!.lat,
      lng: row.c!.lng,
    });

    const placeId = `${city.id}-n${row.el.type[0]}${row.el.id}`;
    if (places.some((p) => p.id === placeId)) {
      skipped++;
      continue;
    }

    const place: Place = {
      id: placeId,
      name: row.name,
      name_en: tags["name:en"] ?? null,
      category: guessCategory(tags),
      region_id: dId,
      address: [city.province_name, city.name, dLabel, tags["addr:street"]].filter(Boolean).join(" "),
      lat: row.c!.lat,
      lng: row.c!.lng,
      description: null,
      tags: [tags.tourism, tags.historic, tags.leisure].filter((x): x is string => Boolean(x)),
      view_heading: null,
      palette: null,
      created_at: ts,
      updated_at: ts,
    };
    places.push(place);

    const ref: PlaceExternalRef = {
      place_id: placeId,
      provider: "osm",
      external_id: `${row.el.type}/${row.el.id}`,
      url: `https://www.openstreetmap.org/${row.el.type}/${row.el.id}`,
      fetched_at: ts,
    };
    if (!refs.some((r) => r.provider === ref.provider && r.external_id === ref.external_id)) refs.push(ref);
    addedPlaces++;
  }

  console.log(`  OSM ${elements.length}건 → 추가 ${toAdd.length}곳 (시 기존 ${existingInCity} / 목표 ${PER_CITY})`);

  // Persist after each city so an interrupt doesn't lose progress.
  if (!values.dry) {
    write("regions", regions);
    write("places", places);
    write("place_external_refs", refs);
  }

  if (i < cities.length - 1) await sleep(SLEEP_MS);
}

console.log(`완료: 장소 +${addedPlaces}, skip ${skipped}, regions=${regions.length}, places=${places.length}`);
