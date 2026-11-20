/**
 * Build browser-facing compact map data for GitHub Pages (no /api).
 *   yarn data:static
 */
import fs from "node:fs";
import path from "node:path";
import { read } from "./lib/store";

const OUT_DIR = path.join(process.cwd(), "public", "static-data");
const MAX_SOURCES = 3;

type CompactSource = {
  id: string;
  type: string;
  title: string;
  url: string;
  provider: string;
  rank: number;
  view_count: number | null;
};

type CompactPlace = {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  lat: number;
  lng: number;
  region_id: string;
  district_id: string | null;
  district_name: string | null;
  city_id: string | null;
  city_name: string | null;
  address: string | null;
  tags: string[];
  search_query: string;
  source_count: number;
  like_count: number;
  is_pick: boolean;
  is_cafe_pick: boolean;
  pick_collections: string[];
  pin_score: number;
  cover_url: string | null;
  sources: CompactSource[];
  course_id: string | null;
  view_heading: number | null;
};

function ancestors(
  regionById: Map<string, ReturnType<typeof read<"regions">>[number]>,
  regionId: string | null | undefined,
) {
  const chain: ReturnType<typeof read<"regions">> = [];
  const seen = new Set<string>();
  let id = regionId ?? null;
  while (id && !seen.has(id)) {
    seen.add(id);
    const r = regionById.get(id);
    if (!r) break;
    chain.push(r);
    id = r.parent_id;
  }
  return chain;
}

function pinScore(opts: {
  sourceCount: number;
  likeCount: number;
  isPick: boolean;
  isCafePick: boolean;
  name: string;
}) {
  let score = Math.min(40, opts.sourceCount * 4) + Math.min(20, opts.likeCount * 2);
  if (opts.isPick) score += 25;
  if (opts.isCafePick) score += 10;
  if (/스타벅스|투썸|이디야|메가커피|컴포즈|빽다방|CU\b|GS25|이마트|다이소/u.test(opts.name)) {
    score -= 15;
  }
  return Math.max(0, score);
}

function main() {
  const regions = read("regions");
  const places = read("places");
  const sources = read("sources");
  const placeSources = read("place_sources");
  const votes = read("place_source_vote_scores");
  const likes = read("place_like_scores");
  const picks = read("place_picks");
  const media = read("place_media");
  const courses = read("courses");
  const courseStops = read("course_stops");

  const regionById = new Map(regions.map((r) => [r.id, r]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const likesByPlace = new Map(likes.map((l) => [l.place_id, l.likes]));
  const voteBy = new Map(votes.map((v) => [`${v.place_id}::${v.source_id}`, v.score]));

  const pickByPlace = new Map<string, Set<string>>();
  for (const p of picks) {
    const set = pickByPlace.get(p.place_id) ?? new Set();
    set.add(p.collection);
    pickByPlace.set(p.place_id, set);
  }

  const linksByPlace = new Map<string, typeof placeSources>();
  for (const ps of placeSources) {
    const list = linksByPlace.get(ps.place_id) ?? [];
    list.push(ps);
    linksByPlace.set(ps.place_id, list);
  }
  for (const list of linksByPlace.values()) list.sort((a, b) => a.rank - b.rank);

  const thumbByPlace = new Map<string, string>();
  for (const [placeId, links] of linksByPlace) {
    for (const ps of links) {
      const thumb = sourceById.get(ps.source_id)?.thumbnail_url;
      if (thumb) {
        thumbByPlace.set(placeId, thumb);
        break;
      }
    }
  }
  for (const m of media) {
    if (!thumbByPlace.has(m.place_id) && m.url) thumbByPlace.set(m.place_id, m.url);
  }

  const publicCourses = new Set(courses.filter((c) => c.visibility === "public").map((c) => c.id));
  const courseByPlace = new Map<string, string>();
  for (const stop of courseStops) {
    if (!publicCourses.has(stop.course_id) || courseByPlace.has(stop.place_id)) continue;
    courseByPlace.set(stop.place_id, stop.course_id);
  }

  const compact: CompactPlace[] = places.map((place) => {
    const chain = ancestors(regionById, place.region_id);
    const city = chain.find((r) => r.level === "city");
    const district = chain.find((r) => r.level === "district") ?? null;
    const collections = [...(pickByPlace.get(place.id) ?? [])];
    const isPick = collections.length > 0;
    const isCafePick = collections.includes("pn-cafe");
    const likeCount = likesByPlace.get(place.id) ?? 0;
    const links = linksByPlace.get(place.id) ?? [];

    const sourceRows: CompactSource[] = [];
    for (const ps of links) {
      if (sourceRows.length >= MAX_SOURCES) break;
      const src = sourceById.get(ps.source_id);
      if (!src) continue;
      const community = voteBy.get(`${place.id}::${ps.source_id}`) ?? 0;
      if (community <= -3) continue;
      sourceRows.push({
        id: src.id,
        type: src.type,
        title: src.title.slice(0, 80),
        url: src.url,
        provider: src.provider,
        rank: ps.rank,
        view_count: src.view_count,
      });
    }

    const searchQuery = [city?.name?.replace(/(시|군|구)$/, ""), place.name].filter(Boolean).join(" ");

    return {
      id: place.id,
      name: place.name,
      name_en: place.name_en,
      category: place.category,
      lat: Number(place.lat.toFixed(5)),
      lng: Number(place.lng.toFixed(5)),
      region_id: place.region_id,
      district_id: district?.id ?? null,
      district_name: district?.name ?? null,
      city_id: city?.id ?? null,
      city_name: city?.name ?? null,
      address: place.address,
      tags: (place.tags ?? []).slice(0, 6),
      search_query: searchQuery,
      source_count: links.length,
      like_count: likeCount,
      is_pick: isPick,
      is_cafe_pick: isCafePick,
      pick_collections: collections,
      pin_score: pinScore({
        sourceCount: links.length,
        likeCount,
        isPick,
        isCafePick,
        name: place.name,
      }),
      cover_url: thumbByPlace.get(place.id) ?? null,
      sources: sourceRows,
      course_id: courseByPlace.get(place.id) ?? null,
      view_heading: place.view_heading ?? null,
    };
  });

  const placeCountByRegion = new Map<string, number>();
  for (const p of compact) {
    placeCountByRegion.set(p.region_id, (placeCountByRegion.get(p.region_id) ?? 0) + 1);
    if (p.city_id) placeCountByRegion.set(p.city_id, (placeCountByRegion.get(p.city_id) ?? 0) + 1);
    if (p.district_id) placeCountByRegion.set(p.district_id, (placeCountByRegion.get(p.district_id) ?? 0) + 1);
  }

  const childCountByParent = new Map<string, number>();
  for (const r of regions) {
    if (!r.parent_id) continue;
    childCountByParent.set(r.parent_id, (childCountByParent.get(r.parent_id) ?? 0) + 1);
  }

  const areas = regions
    .filter((r) => r.level === "city" || r.level === "district")
    .map((r) => ({
      id: r.id,
      name: r.name,
      name_en: r.name_en,
      level: r.level as "city" | "district",
      parent_id: r.parent_id,
      lat: Number(r.lat.toFixed(5)),
      lng: Number(r.lng.toFixed(5)),
      place_count: placeCountByRegion.get(r.id) ?? 0,
      child_count: childCountByParent.get(r.id) ?? 0,
    }));

  const regionLite = regions.map((r) => ({
    id: r.id,
    name: r.name,
    name_en: r.name_en,
    level: r.level,
    parent_id: r.parent_id,
    country_code: r.country_code,
    lat: Number(r.lat.toFixed(5)),
    lng: Number(r.lng.toFixed(5)),
  }));

  const courseLite = courses
    .filter((c) => c.visibility === "public")
    .map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      country_code: c.country_code,
      cover: c.cover,
      stopCount: courseStops.filter((s) => s.course_id === c.id).length,
    }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown) => {
    const file = path.join(OUT_DIR, name);
    fs.writeFileSync(file, `${JSON.stringify(data)}\n`);
    const mb = (fs.statSync(file).size / (1024 * 1024)).toFixed(1);
    console.log(`wrote ${name} (${mb} MB)`);
  };

  write("places.json", compact);
  write("regions.json", regionLite);
  write("areas.json", areas);
  write("courses.json", courseLite);
  write("meta.json", {
    generated_at: new Date().toISOString(),
    places: compact.length,
    areas: areas.length,
    courses: courseLite.length,
  });
}

main();
