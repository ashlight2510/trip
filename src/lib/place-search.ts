import type { Place } from "@/db/schema";
import { categoryLabel } from "@/lib/categories";

/** Search aliases → place categories (compound queries like 숲카페). */
const CATEGORY_ALIASES: { alias: string; categories: Place["category"][] }[] = (
  [
    { alias: "카페", categories: ["cafe"] },
    { alias: "커피", categories: ["cafe"] },
    { alias: "베이커리", categories: ["cafe"] },
    { alias: "맛집", categories: ["restaurant"] },
    { alias: "식당", categories: ["restaurant"] },
    { alias: "음식점", categories: ["restaurant"] },
    { alias: "숲", categories: ["forest"] },
    { alias: "수목원", categories: ["forest"] },
    { alias: "휴양림", categories: ["forest"] },
    { alias: "공원", categories: ["park"] },
    { alias: "해변", categories: ["beach"] },
    { alias: "해수욕장", categories: ["beach"] },
    { alias: "바다", categories: ["beach"] },
    { alias: "시장", categories: ["market"] },
    { alias: "명소", categories: ["landmark"] },
    { alias: "관광", categories: ["landmark"] },
    { alias: "사찰", categories: ["heritage"] },
    { alias: "한옥", categories: ["heritage"] },
    { alias: "궁", categories: ["heritage"] },
    { alias: "문화재", categories: ["heritage"] },
    { alias: "전망", categories: ["viewpoint"] },
    { alias: "야경", categories: ["viewpoint"] },
    { alias: "거리", categories: ["street"] },
    { alias: "골목", categories: ["street"] },
  ] as const satisfies { alias: string; categories: Place["category"][] }[]
).slice().sort((a, b) => b.alias.length - a.alias.length);

export type PlaceSearchFields = {
  name: string;
  nameEn?: string | null;
  category: Place["category"];
  address?: string | null;
  description?: string | null;
  tags?: string[] | null;
  cityName?: string | null;
  districtName?: string | null;
};

export type ParsedPlaceQuery = {
  raw: string;
  /** Remaining name-like tokens after category aliases are peeled. */
  tokens: string[];
  categories: Place["category"][];
  /** Alias strings that were detected (e.g. 카페, 숲). */
  aliases: string[];
};

export function parsePlaceQuery(qRaw: string): ParsedPlaceQuery {
  const raw = qRaw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return { raw: "", tokens: [], categories: [], aliases: [] };

  let rest = raw;
  const categories: Place["category"][] = [];
  const aliases: string[] = [];
  for (const { alias, categories: cats } of CATEGORY_ALIASES) {
    if (!rest.includes(alias)) continue;
    aliases.push(alias);
    for (const c of cats) {
      if (!categories.includes(c)) categories.push(c);
    }
    rest = rest.split(alias).join(" ");
  }
  const tokens = rest
    .split(/\s+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter((t) => t.length >= 1);

  return { raw, tokens, categories, aliases };
}

function haystack(place: PlaceSearchFields): string {
  const cat = categoryLabel[place.category] ?? place.category;
  return [
    place.name,
    place.nameEn ?? "",
    place.address ?? "",
    place.description ?? "",
    cat,
    place.cityName ?? "",
    place.districtName ?? "",
    ...(place.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function fieldBlob(place: PlaceSearchFields): {
  name: string;
  city: string;
  district: string;
  address: string;
  tags: string;
  cat: string;
  all: string;
} {
  const name = [place.name, place.nameEn ?? ""].filter(Boolean).join(" ").toLowerCase();
  const city = (place.cityName ?? "").toLowerCase();
  const district = (place.districtName ?? "").toLowerCase();
  const address = (place.address ?? "").toLowerCase();
  const tags = (place.tags ?? []).join(" ").toLowerCase();
  const cat = (categoryLabel[place.category] ?? "").toLowerCase();
  return {
    name,
    city,
    district,
    address,
    tags,
    cat,
    all: haystack(place),
  };
}

/**
 * Score a place against a free-text query across the whole catalog.
 * Supports compounds like "숲카페" (forest + cafe) and plain names.
 */
export function scorePlaceSearch(place: PlaceSearchFields, qRaw: string): number {
  const parsed = parsePlaceQuery(qRaw);
  if (!parsed.raw) return 0;

  const f = fieldBlob(place);
  const q = parsed.raw;

  // Exact / strong name hits first
  if (f.name === q) return 1000;
  if (f.name.startsWith(q)) return 920;
  if (f.name.includes(q)) return 780;

  // Category constraint from aliases (숲카페 → must be cafe, preferably forest-ish)
  if (parsed.categories.length) {
    if (!parsed.categories.includes(place.category)) {
      // Allow if name still contains the full query or every alias literally
      const aliasOk = parsed.aliases.every((a) => f.all.includes(a));
      if (!aliasOk) return 0;
    }
  }

  // Multi-token AND: every leftover token must appear somewhere
  for (const t of parsed.tokens) {
    if (!f.all.includes(t.replace(/\s+/g, ""))) return 0;
  }

  let score = 0;

  if (parsed.categories.includes(place.category)) score += 180;
  for (const a of parsed.aliases) {
    if (f.name.includes(a)) score += 120;
    else if (f.tags.includes(a) || f.cat.includes(a)) score += 80;
    else if (f.all.includes(a)) score += 40;
  }

  for (const t of parsed.tokens) {
    const needle = t.replace(/\s+/g, "");
    if (f.name === needle) score += 400;
    else if (f.name.startsWith(needle)) score += 320;
    else if (f.name.includes(needle)) score += 260;
    else if (f.tags.includes(needle)) score += 200;
    else if (f.address.includes(needle)) score += 120;
    else if (f.district.includes(needle) || f.city.includes(needle)) score += 90;
    else if (f.all.includes(needle)) score += 60;
  }

  // Pure category search: "카페" alone
  if (!parsed.tokens.length && parsed.categories.length) {
    if (parsed.categories.includes(place.category)) score = Math.max(score, 160);
    if (f.name.includes(parsed.aliases[0] ?? "")) score += 40;
  }

  // District / city only queries still work when no category peel matched
  if (!parsed.categories.length && !parsed.tokens.length) {
    if (f.district === q || f.district.startsWith(q)) return 500;
    if (f.city === q || f.city.startsWith(q)) return 400;
  } else if (!parsed.categories.length) {
    if (f.district === q || f.district.startsWith(q)) score = Math.max(score, 500);
    if (f.city === q || f.city.startsWith(q)) score = Math.max(score, 400);
    if (f.district.includes(q) || f.city.includes(q)) score = Math.max(score, 300);
    if (f.address.includes(q)) score = Math.max(score, 200);
    const qBare = q.replace(/^#/, "");
    if ((place.tags ?? []).some((t) => t.toLowerCase() === qBare || t.toLowerCase().includes(qBare))) {
      score = Math.max(score, 450);
    }
  }

  return score > 0 ? score : 0;
}
