/**
 * Seed tourism POIs for overseas cities via OpenStreetMap Overpass.
 * Reads data/world-cities.json (Guam, Japan, …).
 *
 *   yarn collect:osm
 *   yarn collect:osm -- --country JP
 *   yarn collect:osm -- --country GU --limit 2
 *   yarn collect:osm -- --city jp-tokyo
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import type { Place, PlaceExternalRef, Region } from "../src/db/schema";
import { now, read, write } from "./lib/store";

interface CitySeed {
  id: string;
  name: string;
  name_en: string;
  country_id: string;
  country_name: string;
  country_name_en: string;
  country_code: string;
  province_id: string;
  province_name: string;
  province_name_en?: string | null;
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
];
const PER_CITY = 40;
const SLEEP_MS = 1200;
const UA = "pungyeong-neomeo/0.1 (travel map seed; osm overseas)";

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    city: { type: "string" },
    country: { type: "string" },
    dry: { type: "boolean", default: false },
  },
});

const citiesPath = path.join(process.cwd(), "data", "world-cities.json");
let cities = JSON.parse(fs.readFileSync(citiesPath, "utf8")) as CitySeed[];
if (values.country) {
  const cc = values.country.toUpperCase();
  cities = cities.filter((c) => c.country_code.toUpperCase() === cc);
}
if (values.city) cities = cities.filter((c) => c.id === values.city);
if (values.limit) cities = cities.slice(0, Number(values.limit));
if (!cities.length) {
  console.error("수집할 도시가 없습니다. data/world-cities.json 을 확인하세요.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guessCategory(tags: Record<string, string>): Place["category"] {
  const tourism = tags.tourism ?? "";
  const historic = tags.historic ?? "";
  const leisure = tags.leisure ?? "";
  const amenity = tags.amenity ?? "";
  const natural = tags.natural ?? "";
  const name = `${tags.name ?? ""} ${tags["name:en"] ?? ""} ${tags["name:ko"] ?? ""} ${tags["name:ja"] ?? ""}`;

  if (/beach|beach_resort/i.test(tourism) || /beach|해수욕|해변/i.test(name)) return "beach";
  if (natural === "beach" || leisure === "beach_resort") return "beach";
  if (tourism === "viewpoint" || leisure === "viewpoint") return "viewpoint";
  if (leisure === "park" || leisure === "garden" || leisure === "nature_reserve") return "park";
  if (/forest|woods|bamboo|수목|숲/i.test(name) || natural === "wood") return "forest";
  if (amenity === "cafe" || amenity === "ice_cream") return "cafe";
  if (amenity === "restaurant" || amenity === "fast_food") return "restaurant";
  if (amenity === "marketplace" || /market|시장/i.test(name)) return "market";
  if (amenity === "place_of_worship" || historic || tourism === "gallery") return "heritage";
  if (tourism === "museum" || tourism === "zoo" || tourism === "theme_park" || tourism === "aquarium") return "landmark";
  if (tourism === "attraction" || tourism === "yes") return "landmark";
  return "landmark";
}

function placeName(tags: Record<string, string>, preferLang: "ko" | "ja" | "en") {
  const ordered =
    preferLang === "ja"
      ? [tags["name:ko"], tags["name:ja"], tags.name, tags["name:en"]]
      : preferLang === "en"
        ? [tags["name:ko"], tags["name:en"], tags.name, tags["name:ja"]]
        : [tags["name:ko"], tags.name, tags["name:en"], tags["name:ja"]];
  for (const n of ordered) {
    const t = n?.trim();
    if (t && t.length >= 2) return t;
  }
  return "";
}

function districtLabel(tags: Record<string, string>, cityName: string) {
  const raw =
    tags["addr:district"] ||
    tags["addr:suburb"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:quarter"] ||
    tags["addr:city_district"] ||
    tags["addr:ward"] ||
    "";
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (cleaned) return cleaned;
  return `${cityName} 일대`;
}

function slugPart(s: string) {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}

function districtId(cityId: string, label: string) {
  return `${cityId}-d-${slugPart(label)}`;
}

async function fetchCity(city: CitySeed): Promise<OsmEl[]> {
  const q = `
[out:json][timeout:55];
(
  nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|aquarium|gallery|beach_resort)$"](around:${city.radius_m},${city.lat},${city.lng});
  nwr["historic"~"^(monument|memorial|castle|ruins|tomb|shrine|temple|wayside_shrine)$"](around:${city.radius_m},${city.lat},${city.lng});
  nwr["leisure"~"^(park|garden|nature_reserve|beach_resort)$"](around:${city.radius_m},${city.lat},${city.lng});
  node["natural"="beach"](around:${city.radius_m},${city.lat},${city.lng});
  node["amenity"~"^(cafe|place_of_worship)$"](around:${Math.min(city.radius_m, 5000)},${city.lat},${city.lng});
);
out center 80;
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

function score(el: OsmEl, countryCode: string) {
  const tags = el.tags ?? {};
  let s = 0;
  if (tags["name:ko"]) s += 5;
  if (countryCode === "JP" && tags["name:ja"]) s += 4;
  if (tags["name:en"]) s += 3;
  if (tags.name) s += 2;
  if (tags.wikipedia || tags.wikidata) s += 2;
  if (tags.tourism === "attraction" || tags.tourism === "museum") s += 2;
  if (tags.historic) s += 1;
  if (tags.natural === "beach" || tags.tourism === "beach_resort") s += 3;
  if (tags.tourism === "hotel" || tags.tourism === "guest_house") s -= 5;
  return s;
}

const regions = read("regions");
const places = read("places");
const refs = read("place_external_refs");
const ts = now();

function ensureRegion(row: Region) {
  const i = regions.findIndex((r) => r.id === row.id);
  if (i >= 0) regions[i] = { ...regions[i]!, ...row };
  else regions.push(row);
}

let addedPlaces = 0;
let skipped = 0;

for (let i = 0; i < cities.length; i++) {
  const city = cities[i]!;
  console.log(`[${i + 1}/${cities.length}] ${city.country_name} · ${city.name} 수집 중…`);

  ensureRegion({
    id: city.country_id,
    parent_id: null,
    level: "country",
    name: city.country_name,
    name_en: city.country_name_en,
    country_code: city.country_code,
    lat: city.lat,
    lng: city.lng,
  });
  ensureRegion({
    id: city.province_id,
    parent_id: city.country_id,
    level: "province",
    name: city.province_name,
    name_en: city.province_name_en ?? null,
    country_code: city.country_code,
    lat: city.lat,
    lng: city.lng,
  });
  ensureRegion({
    id: city.id,
    parent_id: city.province_id,
    level: "city",
    name: city.name,
    name_en: city.name_en,
    country_code: city.country_code,
    lat: city.lat,
    lng: city.lng,
  });

  const existingInCity = places.filter((p) => {
    const reg = regions.find((r) => r.id === p.region_id);
    if (!reg) return false;
    if (reg.id === city.id) return true;
    if (reg.parent_id === city.id) return true;
    return false;
  }).length;
  if (existingInCity >= PER_CITY) {
    console.log(`  이미 ${existingInCity}곳 — skip`);
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

  const preferLang = city.country_code === "JP" ? "ja" : city.country_code === "GU" ? "en" : "ko";
  const picked = elements
    .map((el) => ({
      el,
      c: coords(el),
      name: placeName(el.tags ?? {}, preferLang),
      sc: score(el, city.country_code),
    }))
    .filter((x) => x.c && x.name.length >= 2)
    .sort((a, b) => b.sc - a.sc);

  const seenName = new Set<string>();
  const chosen: typeof picked = [];
  for (const row of picked) {
    const key = row.name.replace(/\s+/g, "").toLowerCase();
    if (seenName.has(key)) continue;
    const near = places.some(
      (p) => Math.hypot((p.lat - row.c!.lat) * 111_000, (p.lng - row.c!.lng) * 88_000) < 80,
    );
    if (near) {
      skipped++;
      continue;
    }
    seenName.add(key);
    chosen.push(row);
    if (chosen.length >= PER_CITY) break;
  }

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
      country_code: city.country_code,
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
      name_en: tags["name:en"] ?? (preferLang === "en" ? row.name : null),
      category: guessCategory(tags),
      region_id: dId,
      address: [city.country_name, city.province_name, city.name, dLabel, tags["addr:street"]]
        .filter(Boolean)
        .join(" "),
      lat: row.c!.lat,
      lng: row.c!.lng,
      description: null,
      tags: [city.country_code.toLowerCase(), tags.tourism, tags.historic, tags.leisure, tags.natural].filter(
        (x): x is string => Boolean(x),
      ),
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

  console.log(`  OSM ${elements.length}건 → 추가 ${toAdd.length}곳 (기존 ${existingInCity} / 목표 ${PER_CITY})`);

  if (!values.dry) {
    write("regions", regions);
    write("places", places);
    write("place_external_refs", refs);
  }

  if (i < cities.length - 1) await sleep(SLEEP_MS);
}

console.log(
  `완료: 장소 +${addedPlaces}, skip ${skipped}, regions=${regions.length}, places=${places.length}`,
);
