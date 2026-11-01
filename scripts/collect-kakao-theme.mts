/**
 * Theme-focused Kakao Local seed (숲카페, 뷰카페, 맛집 …).
 * Does not skip cities that already hit the generic per-city cap.
 *
 *   yarn collect:theme
 *   yarn collect:theme -- --city kr-goyang
 *   yarn collect:theme -- --limit 5
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import type { Place, PlaceExternalRef, Region } from "../src/db/schema";
import { categorySeedTags } from "../src/lib/place-tags";
import { guessKakaoCategory } from "./lib/kakao-category";
import { isFranchiseChainName } from "../src/db/curation";
import { isHardDropPlace } from "./lib/place-quality";
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

/** Intentional discovery queries — not generic "카페". */
const THEME_QUERIES = [
  "숲카페",
  "정원카페",
  "뷰카페",
  "오션뷰카페",
  "루프탑카페",
  "한옥카페",
  "북카페",
  "베이커리카페",
  "브런치카페",
  "감성카페",
  "맛집",
  "가볼만한곳",
  "산책코스",
  "수목원",
  "휴양림",
];

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    city: { type: "string" },
    "max-pages": { type: "string", default: "5" },
  },
});

loadEnv();
const key = requireEnv("KAKAO_REST_API_KEY");
const maxPages = Math.max(1, Math.min(15, Number(values["max-pages"] ?? 5)));

let cities = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "kr-cities.json"), "utf8"),
) as CitySeed[];
if (values.city) cities = cities.filter((c) => c.id === values.city);
if (values.limit) cities = cities.slice(0, Number(values.limit));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function districtFromAddress(address: string, cityName: string) {
  const m = address.match(/([가-힣0-9]+(?:구|군|읍|면|동|리))/g);
  if (m?.length) return m[m.length - 1];
  return `${cityName.replace(/(특별시|광역시|특별자치시|시)$/, "")} 중심`;
}

function districtId(cityId: string, label: string) {
  return `${cityId}-d-${createHash("sha1").update(label).digest("hex").slice(0, 8)}`;
}

async function search(
  query: string,
  x: number,
  y: number,
  radius: number,
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
      meta?: { is_end?: boolean };
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

let added = 0;
let reclass = 0;

// Fix existing mis-tags: cafe-like names stuck in forest
for (const p of places) {
  if (p.category !== "forest") continue;
  if (!/카페|커피|디저트|베이커리/.test(p.name)) continue;
  p.category = "cafe";
  p.tags = [...new Set([...(p.tags ?? []), ...categorySeedTags.cafe])];
  p.updated_at = ts;
  reclass++;
}

for (let i = 0; i < cities.length; i++) {
  const city = cities[i]!;
  console.log(`[${i + 1}/${cities.length}] ${city.name} (theme)`);

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

  const short = city.name.replace(/(특별시|광역시|특별자치시|시)$/, "");
  const found = new Map<string, KakaoDoc>();

  for (const tip of THEME_QUERIES) {
    try {
      const docs = await search(`${short} ${tip}`, city.lng, city.lat, city.radius_m);
      for (const d of docs) {
        if (!found.has(d.id)) found.set(d.id, d);
      }
      await sleep(100);
    } catch (e) {
      console.error(`  검색 실패 (${tip}):`, e instanceof Error ? e.message : e);
    }
  }

  let cityAdded = 0;
  for (const d of found.values()) {
    const category = guessKakaoCategory(d);
    if (
      isHardDropPlace({
        name: d.place_name,
        category,
        categoryText: d.category_name,
      })
    ) {
      continue;
    }
    // Skip empty franchise chains for food themes
    if (
      (category === "cafe" || category === "restaurant") &&
      isFranchiseChainName(d.place_name)
    ) {
      continue;
    }
    if (refs.some((r) => r.provider === "kakao" && r.external_id === d.id)) continue;

    const lat = Number(d.y);
    const lng = Number(d.x);
    if (places.some((p) => Math.hypot((p.lat - lat) * 111_000, (p.lng - lng) * 88_000) < 60)) {
      continue;
    }

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
    } satisfies Place);
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
  console.log(`  후보 ${found.size} → 추가 ${cityAdded}`);
}

console.log(`완료: +${added}곳, 재분류 ${reclass}곳, places=${places.length}`);
