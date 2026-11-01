import { parseArgs } from "node:util";
import { placeCategory, type Place } from "../src/db/schema";
import { guessKakaoCategory } from "./lib/kakao-category";
import { loadEnv, now, read, requireEnv, write } from "./lib/store";

interface KakaoPlace {
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

const USAGE = `사용법:
  검색:  npm run place:add -- "<검색어>"
  등록:  npm run place:add -- "<검색어>" --pick <번호> --id <slug> --region <region_id> [--category <분류>] [--tags 바다,카페]`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    pick: { type: "string" },
    id: { type: "string" },
    region: { type: "string" },
    category: { type: "string" },
    tags: { type: "string" },
  },
});

const query = positionals.join(" ").trim();
if (!query) {
  console.log(USAGE);
  process.exit(1);
}

loadEnv();
const key = requireEnv("KAKAO_REST_API_KEY");

const res = await fetch(
  `https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=${encodeURIComponent(query)}`,
  { headers: { Authorization: `KakaoAK ${key}` } },
);
if (!res.ok) {
  console.error(`카카오 로컬 API 오류 ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const { documents } = (await res.json()) as { documents: KakaoPlace[] };

if (!values.pick) {
  if (documents.length === 0) console.log("검색 결과가 없습니다.");
  documents.forEach((d, i) =>
    console.log(`${i + 1}. ${d.place_name}  [${d.category_name}]\n   ${d.road_address_name || d.address_name}  (${d.y}, ${d.x})`),
  );
  console.log(`\n${USAGE}`);
  process.exit(0);
}

const picked = documents[Number(values.pick) - 1];
if (!picked) {
  console.error(`--pick ${values.pick} 에 해당하는 결과가 없습니다.`);
  process.exit(1);
}
if (!values.id || !values.region) {
  console.error("--id 와 --region 이 필요합니다.\n" + USAGE);
  process.exit(1);
}

const category = values.category
  ? placeCategory.parse(values.category)
  : guessKakaoCategory(picked);

const places = read("places");
const refs = read("place_external_refs");
const regions = read("regions");

if (!regions.some((r) => r.id === values.region)) {
  console.error(`region ${values.region} 이 regions.json 에 없습니다. 먼저 추가하세요.`);
  process.exit(1);
}
const existingRef = refs.find((r) => r.provider === "kakao" && r.external_id === picked.id);
if (existingRef) {
  console.error(`이미 등록된 장소입니다: ${existingRef.place_id}`);
  process.exit(1);
}
if (places.some((p) => p.id === values.id)) {
  console.error(`id ${values.id} 가 이미 사용 중입니다.`);
  process.exit(1);
}

const lat = Number(picked.y);
const lng = Number(picked.x);
const nearby = places.filter((p) => Math.hypot((p.lat - lat) * 111_000, (p.lng - lng) * 88_000) < 60);
if (nearby.length) console.warn(`주의: 60m 이내에 이미 등록된 장소가 있습니다 → ${nearby.map((p) => p.name).join(", ")}`);

const ts = now();
places.push({
  id: values.id,
  name: picked.place_name,
  name_en: null,
  category,
  region_id: values.region,
  address: picked.road_address_name || picked.address_name || null,
  lat,
  lng,
  description: null,
  tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  view_heading: null,
  palette: null,
  created_at: ts,
  updated_at: ts,
});
refs.push({ place_id: values.id, provider: "kakao", external_id: picked.id, url: picked.place_url || null, fetched_at: ts });

write("places", places);
write("place_external_refs", refs);
console.log(`등록 완료: ${values.id} (${picked.place_name}, ${category})`);
