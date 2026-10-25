/**
 * Seed places per Korean city via Kakao Local keyword search (not Overpass).
 * Category-aware queries; caps at MAX_PLACES_PER_CITY.
 *
 * Requires KAKAO_REST_API_KEY in .env.local
 *
 *   npm run collect:kr
 *   npm run collect:kr -- --city kr-gangneung
 *   npm run collect:kr -- --limit 3
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { MAX_PLACES_PER_CITY, categorySearchHints } from "../src/db/curation";
import type { Place, PlaceExternalRef, Region } from "../src/db/schema";
import { categorySeedTags } from "../src/lib/place-tags";
import { loadEnv, now, read, requireEnv, write } from "./lib/store";

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

interface KakaoDoc {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    city: { type: "string" },
  },
});

loadEnv();
const key = requireEnv("KAKAO_REST_API_KEY");

let cities = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "kr-cities.json"), "utf8")) as CitySeed[];
if (values.city) cities = cities.filter((c) => c.id === values.city);
if (values.limit) cities = cities.slice(0, Number(values.limit));

const QUERY_PACK = [
  "관광명소",
  "가볼만한곳",
  "여행코스",
  "명소",
  "해수욕장",
  "해변",
  "카페거리",
  "카페",
  "맛집",
  "시장",
  "공원",
  "박물관",
  "미술관",
  "사찰",
  "성당",
  "전망대",
  "산책로",
  "문화재",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guessCategory(p: KakaoDoc): Place["category"] {
  const text = `${p.place_name} ${p.category_name}`;
  if (/해수욕장|해변/.test(text)) return "beach";
  if (/시장/.test(text)) return "market";
  if (/공원/.test(text)) return "park";
  if (/숲|수목원|휴양림/.test(text)) return "forest";
  if (/전망대/.test(text)) return "viewpoint";
  if (/문화재|유적|고택|사찰|궁|한옥/.test(text)) return "heritage";
  if (p.category_group_code === "CE7" || /카페|커피/.test(text)) return "cafe";
  if (p.category_group_code === "FD6" || /맛집|음식/.test(text)) return "restaurant";
  if (/거리|골목/.test(text)) return "street";
  return "landmark";
}

function districtFromAddress(address: string, cityName: string) {
  const m = address.match(/([가-힣0-9]+(?:구|군|읍|면|동|리))/g);
  if (m?.length) return m[m.length - 1];
  return `${cityName.replace(/(특별시|광역시|특별자치시|시)$/, "")} 중심`;
}

function districtId(cityId: string, label: string) {
  return `${cityId}-d-${createHash("sha1").update(label).digest("hex").slice(0, 8)}`;
}

/** Kakao keyword search: size≤15, page≤45 → up to 675 docs per query. */
async function search(
  query: string,
  x: number,
  y: number,
  radius: number,
  maxPages = 10,
): Promise<KakaoDoc[]> {
  const out: KakaoDoc[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://dapi.kakao.com/v2/local/search/keyword.json?size=15&page=${page}&sort=accuracy` +
      `&x=${x}&y=${y}&radius=${Math.min(20000, radius)}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) throw new Error(`Kakao ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      documents: KakaoDoc[];
      meta?: { is_end?: boolean; pageable_count?: number };
    };
    const docs = json.documents ?? [];
    for (const d of docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        out.push(d);
      }
    }
    if (!docs.length || json.meta?.is_end) break;
    await sleep(80);
  }
  return out;
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

let added = 0;

for (let i = 0; i < cities.length; i++) {
  const city = cities[i];
  console.log(`[${i + 1}/${cities.length}] ${city.name}`);

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

  const existing = places.filter((p) => {
    const reg = regions.find((r) => r.id === p.region_id);
    return reg?.id === city.id || reg?.parent_id === city.id;
  }).length;
  if (existing >= MAX_PLACES_PER_CITY) {
    console.log(`  이미 ${existing}곳 — skip`);
    continue;
  }

  const short = city.name.replace(/(특별시|광역시|특별자치시|시)$/, "");
  const found = new Map<string, KakaoDoc>();

  for (const tip of QUERY_PACK) {
    try {
      const docs = await search(`${short} ${tip}`, city.lng, city.lat, city.radius_m);
      for (const d of docs) {
        if (!found.has(d.id)) found.set(d.id, d);
      }
      await sleep(120);
    } catch (e) {
      console.error(`  검색 실패 (${tip}):`, e instanceof Error ? e.message : e);
    }
  }

  const need = MAX_PLACES_PER_CITY - existing;
  const ranked = [...found.values()].filter((d) => {
    // Prefer tourism-ish categories; still allow cafes/markets that came from those queries
    const t = d.category_name;
    if (/아파트|부동산|중개|학원|병원|은행|주유소|주차장/.test(t)) return false;
    return true;
  });

  let cityAdded = 0;
  for (const d of ranked) {
    if (cityAdded >= need) break;
    if (refs.some((r) => r.provider === "kakao" && r.external_id === d.id)) continue;
    const lat = Number(d.y);
    const lng = Number(d.x);
    if (places.some((p) => Math.hypot((p.lat - lat) * 111_000, (p.lng - lng) * 88_000) < 80)) continue;

    const addr = d.road_address_name || d.address_name || "";
    const dLabel = districtFromAddress(addr, city.name);
    const dId = districtId(city.id, dLabel);
    ensureRegion({
      id: dId,
      parent_id: city.id,
      level: "district",
      name: dLabel,
      name_en: null,
      country_code: "KR",
      lat,
      lng,
    });

    const placeId = `${city.id}-k${d.id}`;
    const category = guessCategory(d);
    places.push({
      id: placeId,
      name: d.place_name,
      name_en: null,
      category,
      region_id: dId,
      address: addr || null,
      lat,
      lng,
      description: null,
      tags: [...categorySeedTags[category]],
      view_heading: null,
      palette: null,
      created_at: ts,
      updated_at: ts,
    });
    const ref: PlaceExternalRef = {
      place_id: placeId,
      provider: "kakao",
      external_id: d.id,
      url: d.place_url || null,
      fetched_at: ts,
    };
    refs.push(ref);
    cityAdded++;
    added++;
  }

  write("regions", regions);
  write("places", places);
  write("place_external_refs", refs);
  console.log(`  후보 ${ranked.length} → 추가 ${cityAdded} (시 합계 목표 ${MAX_PLACES_PER_CITY})`);
}

console.log(`완료: +${added} places, total ${places.length}`);
