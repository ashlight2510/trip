import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { compareSourceSort } from "@/lib/source-rank";
import * as s from "./schema";
import type { MapArea, MapPlace, MapPlaceSource } from "./repo";

const DATA = path.join(process.cwd(), "data");

type Db = {
  regions: s.Region[];
  places: s.Place[];
  sources: s.Source[];
  placeSources: s.PlaceSource[];
  placeSourceBoosts: s.PlaceSourceBoost[];
  media: s.PlaceMedia[];
  courses: s.Course[];
  courseStops: s.CourseStop[];
};

type Indexes = {
  regionById: Map<string, s.Region>;
  sourceById: Map<string, s.Source>;
  placeSourcesByPlace: Map<string, s.PlaceSource[]>;
  boostByPlaceSource: Map<string, number>;
  mediaByPlace: Map<string, s.PlaceMedia[]>;
  courseByPlace: Map<string, string>;
  cityByRegion: Map<string, s.Region | undefined>;
  districtByRegion: Map<string, s.Region | null>;
};

type Cache = {
  stamp: string;
  db: Db;
  ix: Indexes;
};

let cache: Cache | null = null;

function tableStamp(name: string) {
  try {
    return `${name}:${fs.statSync(path.join(DATA, `${name}.json`)).mtimeMs}`;
  } catch {
    return `${name}:0`;
  }
}

function loadTable<T extends s.TableName>(name: T): s.Row<T>[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA, `${name}.json`), "utf8"));
  return z.array(s.tables[name]).parse(raw) as s.Row<T>[];
}

function ancestors(regionById: Map<string, s.Region>, regionId: string | null | undefined): s.Region[] {
  const chain: s.Region[] = [];
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

function buildIndexes(db: Db): Indexes {
  const regionById = new Map(db.regions.map((r) => [r.id, r]));
  const sourceById = new Map(db.sources.map((x) => [x.id, x]));
  const boostByPlaceSource = new Map(
    db.placeSourceBoosts.map((b) => [`${b.place_id}::${b.source_id}`, b.boost]),
  );
  const placeSourcesByPlace = new Map<string, s.PlaceSource[]>();
  for (const ps of db.placeSources) {
    const list = placeSourcesByPlace.get(ps.place_id);
    if (list) list.push(ps);
    else placeSourcesByPlace.set(ps.place_id, [ps]);
  }
  for (const list of placeSourcesByPlace.values()) list.sort((a, b) => a.rank - b.rank);

  const mediaByPlace = new Map<string, s.PlaceMedia[]>();
  for (const m of db.media) {
    const list = mediaByPlace.get(m.place_id);
    if (list) list.push(m);
    else mediaByPlace.set(m.place_id, [m]);
  }

  const publicCourses = new Set(db.courses.filter((c) => c.visibility === "public").map((c) => c.id));
  const courseByPlace = new Map<string, string>();
  for (const st of db.courseStops) {
    if (!publicCourses.has(st.course_id)) continue;
    if (!courseByPlace.has(st.place_id)) courseByPlace.set(st.place_id, st.course_id);
  }

  const cityByRegion = new Map<string, s.Region | undefined>();
  const districtByRegion = new Map<string, s.Region | null>();
  for (const p of db.places) {
    if (cityByRegion.has(p.region_id)) continue;
    const chain = ancestors(regionById, p.region_id);
    cityByRegion.set(
      p.region_id,
      chain.find((r) => r.level === "city"),
    );
    const self = regionById.get(p.region_id);
    districtByRegion.set(p.region_id, self?.level === "district" ? self : null);
  }

  return {
    regionById,
    sourceById,
    placeSourcesByPlace,
    boostByPlaceSource,
    mediaByPlace,
    courseByPlace,
    cityByRegion,
    districtByRegion,
  };
}

export function getMapDb(): Cache {
  const stamp = [
    "regions",
    "places",
    "sources",
    "place_sources",
    "place_source_boosts",
    "place_media",
    "courses",
    "course_stops",
  ]
    .map(tableStamp)
    .join("|");
  if (cache?.stamp === stamp) return cache;

  const db: Db = {
    regions: loadTable("regions"),
    places: loadTable("places"),
    sources: loadTable("sources"),
    placeSources: loadTable("place_sources"),
    placeSourceBoosts: loadTable("place_source_boosts"),
    media: loadTable("place_media"),
    courses: loadTable("courses"),
    courseStops: loadTable("course_stops"),
  };
  cache = { stamp, db, ix: buildIndexes(db) };
  return cache;
}

function searchQueryFor(place: s.Place, city: s.Region | undefined) {
  return [city?.name.replace(/(시|군|구)$/, ""), place.name].filter(Boolean).join(" ");
}

function sourcesFor(ix: Indexes, placeId: string): MapPlaceSource[] {
  const links = ix.placeSourcesByPlace.get(placeId) ?? [];
  const rows = links.flatMap((ps) => {
    const src = ix.sourceById.get(ps.source_id);
    if (!src) return [];
    const boost = ix.boostByPlaceSource.get(`${placeId}::${ps.source_id}`) ?? 0;
    return [
      {
        id: src.id,
        type: src.type,
        title: src.title,
        url: src.url,
        author: src.author,
        provider: src.provider,
        published_at: src.published_at,
        snippet: src.snippet,
        relevance: ps.relevance,
        rank: ps.rank,
        score: src.score,
        view_count: src.view_count,
        boost,
      },
    ];
  });
  rows.sort((a, b) =>
    compareSourceSort(
      { boost: a.boost, relevance: a.relevance, view_count: a.view_count, rank: a.rank },
      { boost: b.boost, relevance: b.relevance, view_count: b.view_count, rank: b.rank },
    ),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function toMapPlace(place: s.Place, ix: Indexes, opts: { includeSources: boolean }): MapPlace {
  const city = ix.cityByRegion.get(place.region_id);
  const district = ix.districtByRegion.get(place.region_id) ?? null;
  const region = ix.regionById.get(place.region_id);
  const media = ix.mediaByPlace.get(place.id) ?? [];
  const cover = media.find((m) => m.is_cover && m.kind === "image") ?? media.find((m) => m.kind === "image");
  const sources = opts.includeSources ? sourcesFor(ix, place.id) : [];
  const sourceCount = opts.includeSources
    ? sources.length
    : (ix.placeSourcesByPlace.get(place.id)?.length ?? 0);

  return {
    id: place.id,
    name: place.name,
    name_en: place.name_en,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    region_id: place.region_id,
    district_id: district?.id ?? null,
    district_name: district?.name ?? null,
    city_id: city?.id ?? null,
    city_name: city?.name ?? null,
    region_name: region?.name ?? null,
    address: place.address,
    description: place.description,
    tags: place.tags,
    search_query: searchQueryFor(place, city),
    source_count: sourceCount,
    cover_url: cover?.url ?? null,
    sources,
    course_id: ix.courseByPlace.get(place.id) ?? null,
  };
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function placeMatchScore(place: s.Place, cityName: string | undefined, districtName: string | null | undefined, q: string) {
  const name = place.name.toLowerCase();
  const city = cityName?.toLowerCase() ?? "";
  const district = districtName?.toLowerCase() ?? "";
  const address = place.address?.toLowerCase() ?? "";
  if (name === q) return 1000;
  if (name.startsWith(q)) return 900;
  if (name.includes(q)) return 700;
  if (district === q || district.startsWith(q)) return 500;
  if (city === q || city.startsWith(q)) return 400;
  if (district.includes(q) || city.includes(q)) return 300;
  if (address.includes(q)) return 200;
  const qBare = q.replace(/^#/, "");
  if (place.tags.some((t) => t.toLowerCase() === qBare || t.toLowerCase().includes(qBare))) return 450;
  return 0;
}

export type MapPlaceQuery = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  q?: string;
  cityId?: string;
  districtId?: string;
  limit?: number;
  includeSources?: boolean;
};

export function queryMapPlaces(query: MapPlaceQuery): MapPlace[] {
  const { db, ix } = getMapDb();
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 500);
  const includeSources = Boolean(query.includeSources);
  const q = query.q?.trim().toLowerCase() ?? "";

  type Cand = { place: s.Place; score: number; dist: number };
  const cands: Cand[] = [];

  for (const place of db.places) {
    const city = ix.cityByRegion.get(place.region_id);
    const district = ix.districtByRegion.get(place.region_id);

    if (query.cityId && city?.id !== query.cityId) continue;
    if (query.districtId && district?.id !== query.districtId) continue;

    if (
      query.west != null &&
      query.south != null &&
      query.east != null &&
      query.north != null
    ) {
      if (
        place.lat < query.south ||
        place.lat > query.north ||
        place.lng < query.west ||
        place.lng > query.east
      ) {
        continue;
      }
    }

    let dist = 0;
    if (query.lat != null && query.lng != null) {
      dist = haversineKm(query.lat, query.lng, place.lat, place.lng);
      const radius = query.radiusKm ?? 30;
      if (!q && dist > radius) continue;
    }

    let score = 0;
    if (q) {
      score = placeMatchScore(place, city?.name, district?.name, q);
      if (score <= 0) continue;
    } else if (query.lat != null && query.lng != null) {
      score = Math.max(0, 1000 - dist * 10);
    } else {
      score = 1;
    }

    cands.push({ place, score, dist });
  }

  cands.sort((a, b) => {
    if (q) return b.score - a.score || a.place.name.localeCompare(b.place.name, "ko");
    if (query.lat != null) return a.dist - b.dist;
    return b.score - a.score;
  });

  return cands.slice(0, limit).map((c) => toMapPlace(c.place, ix, { includeSources }));
}

export function getMapPlace(id: string): MapPlace | null {
  const { db, ix } = getMapDb();
  const place = db.places.find((p) => p.id === id);
  if (!place) return null;
  return toMapPlace(place, ix, { includeSources: true });
}

export function listMapAreasFast(): MapArea[] {
  const { db, ix } = getMapDb();
  const cities = db.regions.filter((r) => r.level === "city");
  const districts = db.regions.filter((r) => r.level === "district");

  const cityStats = new Map<string, { count: number; lat: number; lng: number; districts: Set<string> }>();
  const districtStats = new Map<string, { count: number; lat: number; lng: number; parent: string | null }>();

  for (const place of db.places) {
    const city = ix.cityByRegion.get(place.region_id);
    const district = ix.districtByRegion.get(place.region_id);
    if (city) {
      const st = cityStats.get(city.id) ?? { count: 0, lat: 0, lng: 0, districts: new Set() };
      st.count += 1;
      st.lat += place.lat;
      st.lng += place.lng;
      if (district) st.districts.add(district.id);
      cityStats.set(city.id, st);
    }
    if (district) {
      const st = districtStats.get(district.id) ?? {
        count: 0,
        lat: 0,
        lng: 0,
        parent: district.parent_id,
      };
      st.count += 1;
      st.lat += place.lat;
      st.lng += place.lng;
      districtStats.set(district.id, st);
    }
  }

  const cityAreas: MapArea[] = cities.flatMap((city) => {
    const st = cityStats.get(city.id);
    if (!st || st.count === 0) return [];
    return [
      {
        id: city.id,
        name: city.name,
        level: "city" as const,
        parent_id: city.parent_id === city.id ? "kr" : city.parent_id,
        lat: city.lat || st.lat / st.count,
        lng: city.lng || st.lng / st.count,
        place_count: st.count,
        child_count: st.districts.size,
      },
    ];
  });

  const districtAreas: MapArea[] = districts.flatMap((d) => {
    const st = districtStats.get(d.id);
    if (!st || st.count === 0) return [];
    return [
      {
        id: d.id,
        name: d.name,
        level: "district" as const,
        parent_id: d.parent_id,
        lat: d.lat || st.lat / st.count,
        lng: d.lng || st.lng / st.count,
        place_count: st.count,
        child_count: st.count,
      },
    ];
  });

  return [...cityAreas, ...districtAreas];
}
