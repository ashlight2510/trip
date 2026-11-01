/**
 * Build a nationwide cafe-tour workbook (~700 rows).
 *
 * Ranking uses Naver blog visit-intent + YouTube views already stored in
 * this repo (Instagram Graph API is not wired). Franchise chains are
 * dropped; places need recent review coverage as an "operating" proxy.
 *
 *   yarn cafe:tour
 *   yarn cafe:tour -- --limit 700 --out exports/cafe-tour.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import ExcelJS from "exceljs";
import { isFranchiseChainName } from "../src/db/curation";
import { categorySeedTags } from "../src/lib/place-tags";
import { loadEnv, read } from "./lib/store";
import { isChainOrBranchPlace } from "./lib/source-relevance";

const GENERIC_TAGS = new Set(["카페", "커피", "coffee", "cafe", "카페투어"]);
const SEED_TAGS = new Set(categorySeedTags.cafe);

/** Cafe menu phrases commonly mentioned in review titles/snippets (longest first). */
const MENU_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /말차\s*라떼|말차라떼|녹차\s*라떼/g, label: "말차라떼" },
  { re: /딸기\s*라떼|딸기라떼/g, label: "딸기라떼" },
  { re: /고구마\s*라떼|고구마라떼/g, label: "고구마라떼" },
  { re: /흑임자\s*라떼|흑임자라떼/g, label: "흑임자라떼" },
  { re: /밤\s*라떼|밤라떼/g, label: "밤라떼" },
  { re: /바닐라\s*라떼|바닐라라떼/g, label: "바닐라라떼" },
  { re: /돌체\s*라떼|돌체라떼/g, label: "돌체라떼" },
  { re: /카라멜\s*마키아토|카라멜마키아토/g, label: "카라멜마키아토" },
  { re: /아인슈페너/g, label: "아인슈페너" },
  { re: /플랫\s*화이트|플랫화이트/g, label: "플랫화이트" },
  { re: /카페\s*라떼|카페라떼|\b라떼\b/g, label: "카페라떼" },
  { re: /카푸치노/g, label: "카푸치노" },
  { re: /아메리카노/g, label: "아메리카노" },
  { re: /에스프레소/g, label: "에스프레소" },
  { re: /콜드\s*브루|콜드브루/g, label: "콜드브루" },
  { re: /더치\s*커피|더치커피/g, label: "더치커피" },
  { re: /드립\s*커피|핸드드립|드립커피/g, label: "드립커피" },
  { re: /게이샤/g, label: "게이샤커피" },
  { re: /시그니처\s*커피|시그니처커피/g, label: "시그니처커피" },
  { re: /티라미수/g, label: "티라미수" },
  { re: /치즈\s*케이크|치즈케이크/g, label: "치즈케이크" },
  { re: /생크림\s*케이크|생크림케이크/g, label: "생크림케이크" },
  { re: /당근\s*케이크|당근케이크/g, label: "당근케이크" },
  { re: /레몬\s*케이크|레몬케이크/g, label: "레몬케이크" },
  { re: /소금\s*빵|소금빵/g, label: "소금빵" },
  { re: /크루아상|크로와상/g, label: "크루아상" },
  { re: /스콘/g, label: "스콘" },
  { re: /크로플/g, label: "크로플" },
  { re: /와플/g, label: "와플" },
  { re: /빙수/g, label: "빙수" },
  { re: /마카롱/g, label: "마카롱" },
  { re: /휘낭시에/g, label: "휘낭시에" },
  { re: /브라우니/g, label: "브라우니" },
  { re: /쿠키/g, label: "쿠키" },
  { re: /베이글/g, label: "베이글" },
  { re: /샌드위치/g, label: "샌드위치" },
  { re: /팬케이크|핫케이크/g, label: "팬케이크" },
  { re: /밀크\s*티|밀크티/g, label: "밀크티" },
  { re: /허브\s*티|허브티/g, label: "허브티" },
  { re: /카모마일/g, label: "카모마일" },
  { re: /레몬에이드|자몽에이드|청포도에이드/g, label: "에이드" },
  { re: /스무디/g, label: "스무디" },
  { re: /프라페|프라푸치노/g, label: "프라페" },
  { re: /디저트\s*플레이트|디저트플레이트/g, label: "디저트플레이트" },
];

/** Soft category words — only used if no specific menu is found. */
const GENERIC_MENU_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /케이크/g, label: "케이크" },
  { re: /베이커리|수제빵|빵집/g, label: "베이커리" },
  { re: /브런치/g, label: "브런치" },
  { re: /디저트/g, label: "디저트" },
];

const TAG_MENU_HINTS: { re: RegExp; label: string }[] = [
  { re: /베이커리|빵집/, label: "베이커리" },
  { re: /디저트|케이크/, label: "시그니처디저트" },
  { re: /브런치/, label: "브런치" },
  { re: /로스터리|원두|드립/, label: "드립커피" },
  { re: /커피맛집|스페셜티/, label: "시그니처커피" },
];

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "700" },
    out: { type: "string", default: "exports/전국_카페투어_700.xlsx" },
    "min-blogs": { type: "string", default: "3" },
  },
});

loadEnv();

const limit = Math.max(1, Number(values.limit) || 700);
const minBlogs = Math.max(1, Number(values["min-blogs"]) || 3);
const outPath = path.resolve(process.cwd(), values.out ?? "exports/전국_카페투어_700.xlsx");

type Region = ReturnType<typeof read<"regions">>[number];
type Place = ReturnType<typeof read<"places">>[number];
type Source = ReturnType<typeof read<"sources">>[number];

const places = read("places");
const regions = read("regions");
const sources = read("sources");
const links = read("place_sources");

const regionById = new Map(regions.map((r) => [r.id, r]));
const sourceById = new Map(sources.map((s) => [s.id, s]));
const linksByPlace = new Map<string, typeof links>();
for (const link of links) {
  const arr = linksByPlace.get(link.place_id) ?? [];
  arr.push(link);
  linksByPlace.set(link.place_id, arr);
}

function walkAncestors(regionId: string | null | undefined): Region[] {
  const out: Region[] = [];
  let cur = regionId ? regionById.get(regionId) : undefined;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur);
    cur = cur.parent_id ? regionById.get(cur.parent_id) : undefined;
  }
  return out;
}

function regionLabels(regionId: string) {
  const chain = walkAncestors(regionId);
  const province = chain.find((r) => r.level === "province") ?? null;
  const city = chain.find((r) => r.level === "city") ?? null;
  const district = chain.find((r) => r.level === "district") ?? null;
  return {
    province: province?.name ?? "",
    city: city?.name ?? "",
    district: district?.name ?? "",
  };
}

function isKrCafe(place: Place) {
  if (place.category !== "cafe") return false;
  const chain = walkAncestors(place.region_id);
  return chain.some((r) => r.country_code === "KR") || place.id.startsWith("kr-");
}

function pickFeatureKeywords(tags: string[], menu: string): [string, string] {
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  const scored = unique.map((tag) => {
    let score = 2;
    if (GENERIC_TAGS.has(tag.toLowerCase()) || GENERIC_TAGS.has(tag)) score -= 3;
    if (SEED_TAGS.has(tag)) score -= 1;
    if (tag === menu || tag.includes(menu) || menu.includes(tag)) score -= 4;
    if (/뷰|루프탑|오션|한옥|베이커리|디저트|포토|야경|정원|브런치|로스터리|감성|힐링|데이트|바다|숲|호수|테라스/.test(tag)) {
      score += 3;
    }
    return { tag, score };
  });
  scored.sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag, "ko"));
  const picked = scored
    .map((s) => s.tag)
    .filter((t) => !GENERIC_TAGS.has(t) && !GENERIC_TAGS.has(t.toLowerCase()) && t !== menu);
  const filled = [...picked, ...scored.map((s) => s.tag)].filter((t, i, arr) => arr.indexOf(t) === i && t !== menu);
  while (filled.length < 2) filled.push("-");
  return [filled[0], filled[1]];
}

function countMenuMentions(texts: string[], patterns: { re: RegExp; label: string }[]) {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    const text = raw ?? "";
    if (!text) continue;
    for (const { re, label } of patterns) {
      re.lastIndex = 0;
      const matches = text.match(re);
      if (matches?.length) counts.set(label, (counts.get(label) ?? 0) + matches.length);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

/** Pick the most-mentioned menu from review text; fall back to tag hints. */
function pickSignatureMenu(texts: string[], tags: string[]): string {
  const specific = countMenuMentions(texts, MENU_PATTERNS);
  if (specific[0]?.[1] > 0) return specific[0][0];

  const generic = countMenuMentions(texts, GENERIC_MENU_PATTERNS);
  if (generic[0]?.[1] > 0) return generic[0][0];

  for (const { re, label } of TAG_MENU_HINTS) {
    if (tags.some((t) => re.test(t))) return label;
  }
  return "시그니처커피";
}

type CafeRow = {
  place: Place;
  province: string;
  city: string;
  district: string;
  blogCount: number;
  ytCount: number;
  ytViews: number;
  avgBlogScore: number;
  latestPublished: string | null;
  score: number;
  keywords: [string, string];
  menu: string;
};

const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 540; // ~18 months

const candidates: CafeRow[] = [];

for (const place of places) {
  if (!isKrCafe(place)) continue;
  if (isFranchiseChainName(place.name) || isChainOrBranchPlace(place.name)) continue;
  if (/점$/u.test(place.name.trim()) && /스타벅스|투썸|이디야|메가|컴포즈|빽다방|할리스|폴바셋|엔제리너스|커피빈|탐앤탐스|카페베네/.test(place.name)) {
    continue;
  }

  const placeLinks = linksByPlace.get(place.id) ?? [];
  let blogCount = 0;
  let ytCount = 0;
  let ytViews = 0;
  let blogScoreSum = 0;
  let latestMs = 0;
  let latestPublished: string | null = null;
  const reviewTexts: string[] = [];

  for (const link of placeLinks) {
    const src = sourceById.get(link.source_id) as Source | undefined;
    if (!src) continue;
    if (src.title || src.snippet) reviewTexts.push(`${src.title ?? ""}\n${src.snippet ?? ""}`);
    if (src.type === "blog") {
      blogCount += 1;
      blogScoreSum += src.score ?? 0;
      if (src.published_at) {
        const ms = Date.parse(src.published_at);
        if (!Number.isNaN(ms) && ms > latestMs) {
          latestMs = ms;
          latestPublished = src.published_at.slice(0, 10);
        }
      }
    } else if (src.type === "youtube") {
      ytCount += 1;
      ytViews += src.view_count ?? 0;
    }
  }

  if (blogCount < minBlogs) continue;
  // Operating proxy: enough review coverage, preferably with a recent post.
  const recentEnough = latestMs === 0 || latestMs >= cutoff;
  if (!recentEnough && blogCount < minBlogs + 2) continue;

  const avgBlogScore = blogCount ? blogScoreSum / blogCount : 0;
  const labels = regionLabels(place.region_id);
  // SNS-style popularity proxy: blog volume/quality + YouTube reach.
  const score =
    blogCount * 12 +
    avgBlogScore * 0.35 +
    (ytCount > 0 ? 40 : 0) +
    (ytViews > 0 ? Math.log10(ytViews + 1) * 18 : 0) +
    (latestMs >= cutoff ? 8 : 0);

  const tags = place.tags ?? [];
  const menu = pickSignatureMenu(reviewTexts, tags);
  candidates.push({
    place,
    province: labels.province || "기타",
    city: labels.city || labels.district || "",
    district: labels.district,
    blogCount,
    ytCount,
    ytViews,
    avgBlogScore,
    latestPublished,
    score,
    keywords: pickFeatureKeywords(tags, menu),
    menu,
  });
}

candidates.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "ko"));

/** Nationwide balance: seed every province, then fill by score. */
function pickNationwide(rows: CafeRow[], n: number): CafeRow[] {
  const byProvince = new Map<string, CafeRow[]>();
  for (const row of rows) {
    const list = byProvince.get(row.province) ?? [];
    list.push(row);
    byProvince.set(row.province, list);
  }
  const provinces = [...byProvince.keys()].sort((a, b) => a.localeCompare(b, "ko"));
  const selected: CafeRow[] = [];
  const used = new Set<string>();

  const seedPerProvince = Math.max(8, Math.floor(n / Math.max(provinces.length, 1)));
  for (const province of provinces) {
    const list = byProvince.get(province) ?? [];
    for (const row of list.slice(0, seedPerProvince)) {
      if (selected.length >= n) break;
      if (used.has(row.place.id)) continue;
      used.add(row.place.id);
      selected.push(row);
    }
  }

  for (const row of rows) {
    if (selected.length >= n) break;
    if (used.has(row.place.id)) continue;
    used.add(row.place.id);
    selected.push(row);
  }

  selected.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "ko"));
  return selected.slice(0, n).map((row, i) => ({ ...row, rank: i + 1 }) as CafeRow & { rank: number });
}

const picked = pickNationwide(candidates, limit) as (CafeRow & { rank?: number })[];
picked.forEach((row, i) => {
  row.rank = i + 1;
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const workbook = new ExcelJS.Workbook();
workbook.creator = "풍경너머";
workbook.created = new Date();

const meta = workbook.addWorksheet("안내");
meta.addRows([
  ["전국 카페 투어 데이터베이스"],
  ["생성일", new Date().toISOString().slice(0, 10)],
  ["건수", picked.length],
  ["활용 목적", "전국 카페 투어 및 여행"],
  ["순위 기준", "네이버 블로그 방문의도 점수·건수 + 유튜브 조회수 종합 (인스타그램 API 미연동으로 동일 목적 SNS 노출 지표로 대체)"],
  ["운영 여부", "프랜차이즈 제외 + 후기(블로그) 다건 보유를 운영 중 프록시로 사용. 현장 폐업은 별도 재확인 권장."],
  ["키워드", "특징 2개(태그) + 대표메뉴 1개(후기에서 가장 많이 언급된 메뉴, 없으면 태그 기반 추정)"],
  ["후보 풀", `${candidates.length}곳 (KR 카페, 프랜차이즈 제외, 블로그 ≥ ${minBlogs})`],
]);
meta.getColumn(1).width = 16;
meta.getColumn(2).width = 90;

const headers = [
  "순위",
  "시/도",
  "시/군",
  "구/동",
  "카페명",
  "주소",
  "특징1",
  "특징2",
  "대표메뉴",
  "SNS종합점수",
  "블로그수",
  "유튜브수",
  "유튜브조회수합",
  "최근후기일",
] as const;

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4965" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
}

function addDataSheet(name: string, rows: (CafeRow & { rank?: number })[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow([...headers]);
  styleHeader(sheet);
  for (const row of rows) {
    sheet.addRow([
      row.rank ?? "",
      row.province,
      row.city,
      row.district,
      row.place.name,
      row.place.address ?? "",
      row.keywords[0],
      row.keywords[1],
      row.menu,
      Math.round(row.score * 10) / 10,
      row.blogCount,
      row.ytCount,
      row.ytViews || "",
      row.latestPublished ?? "",
    ]);
  }
  sheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 28 },
    { width: 36 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
  ];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

addDataSheet("전국TOP", picked);

const byProvince = new Map<string, (CafeRow & { rank?: number })[]>();
for (const row of picked) {
  const list = byProvince.get(row.province) ?? [];
  list.push(row);
  byProvince.set(row.province, list);
}

const regionSheet = workbook.addWorksheet("지역별요약");
regionSheet.addRow(["시/도", "선정 수", "최고점수 카페", "평균 SNS점수"]);
styleHeader(regionSheet);
for (const province of [...byProvince.keys()].sort((a, b) => a.localeCompare(b, "ko"))) {
  const list = byProvince.get(province) ?? [];
  const avg = list.reduce((s, r) => s + r.score, 0) / Math.max(list.length, 1);
  regionSheet.addRow([province, list.length, list[0]?.place.name ?? "", Math.round(avg * 10) / 10]);
}
regionSheet.columns = [{ width: 16 }, { width: 10 }, { width: 28 }, { width: 14 }];

for (const province of [...byProvince.keys()].sort((a, b) => a.localeCompare(b, "ko"))) {
  const list = (byProvince.get(province) ?? []).slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const safeName = province.replace(/[\\/?*[\]:]/g, "").slice(0, 28) || "기타";
  addDataSheet(safeName, list);
}

await workbook.xlsx.writeFile(outPath);

const provinceCounts = [...byProvince.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([p, list]) => `${p}:${list.length}`)
  .join(", ");

console.log(`Wrote ${picked.length} cafes → ${outPath}`);
console.log(`Candidates: ${candidates.length} | min blogs: ${minBlogs}`);
console.log(`By province: ${provinceCounts}`);
