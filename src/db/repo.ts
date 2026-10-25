import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { LayerSpec } from "@/lib/sound/engine";
import * as s from "./schema";

/**
 * Read-side data access. JSON is loaded from disk on each call so collect scripts
 * show up on the map without a rebuild. Swap this module for Postgres later.
 */

const DATA = path.join(process.cwd(), "data");

function load<T extends s.TableName>(name: T): s.Row<T>[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA, `${name}.json`), "utf8"));
  return z.array(s.tables[name]).parse(raw) as s.Row<T>[];
}

function snapshot() {
  return {
    regions: load("regions"),
    places: load("places"),
    sources: load("sources"),
    placeSources: load("place_sources"),
    regionSources: load("region_sources"),
    soundscape: load("soundscape_layers"),
    media: load("place_media"),
    courses: load("courses"),
    courseStops: load("course_stops"),
  };
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function soundscapeFor(db: ReturnType<typeof snapshot>, placeId: string): LayerSpec[] {
  return db.soundscape
    .filter((l) => l.place_id === placeId)
    .sort(byPosition)
    .map((l) => ({ kind: l.kind, gain: l.gain, bearing: l.bearing ?? undefined, label: l.label ?? undefined }));
}

function mediaFor(db: ReturnType<typeof snapshot>, placeId: string): s.PlaceMedia[] {
  return db.media.filter((m) => m.place_id === placeId).sort(byPosition);
}

export interface StopView {
  place: s.Place;
  region: s.Region | undefined;
  heading: number;
  tip: string | null;
  searchQuery: string;
  soundscape: LayerSpec[];
  media: s.PlaceMedia[];
}

function ancestors(db: ReturnType<typeof snapshot>, regionId: string | null | undefined): s.Region[] {
  const chain: s.Region[] = [];
  const seen = new Set<string>();
  let id = regionId ?? null;
  while (id && !seen.has(id)) {
    seen.add(id);
    const r = db.regions.find((x) => x.id === id);
    if (!r) break;
    chain.push(r);
    id = r.parent_id;
  }
  return chain;
}

function cityOf(db: ReturnType<typeof snapshot>, regionId: string) {
  return ancestors(db, regionId).find((r) => r.level === "city");
}

function districtOf(db: ReturnType<typeof snapshot>, regionId: string) {
  const r = db.regions.find((x) => x.id === regionId);
  return r?.level === "district" ? r : null;
}

const searchQueryFor = (place: s.Place, city: s.Region | undefined) =>
  [city?.name.replace(/(시|군|구)$/, ""), place.name].filter(Boolean).join(" ");

export interface CourseView {
  course: s.Course;
  stops: StopView[];
}

export async function listCourses(): Promise<(s.Course & { stopCount: number })[]> {
  const db = snapshot();
  return db.courses
    .filter((c) => c.visibility === "public")
    .map((c) => ({ ...c, stopCount: db.courseStops.filter((st) => st.course_id === c.id).length }));
}

export async function getCourse(id: string): Promise<CourseView | null> {
  const db = snapshot();
  const course = db.courses.find((c) => c.id === id);
  if (!course) return null;
  const stops = db.courseStops
    .filter((st) => st.course_id === id)
    .sort(byPosition)
    .flatMap((st) => {
      const place = db.places.find((p) => p.id === st.place_id);
      if (!place) return [];
      const region = db.regions.find((r) => r.id === place.region_id);
      const city = cityOf(db, place.region_id);
      return [
        {
          place,
          region,
          heading: st.heading ?? place.view_heading ?? 0,
          tip: st.tip,
          searchQuery: searchQueryFor(place, city),
          soundscape: soundscapeFor(db, place.id),
          media: mediaFor(db, place.id),
        },
      ];
    });
  return { course, stops };
}

export interface MapPlaceSource {
  id: string;
  type: s.Source["type"];
  title: string;
  url: string;
  author: string | null;
  provider: string;
  published_at: string | null;
  snippet: string | null;
  relevance: number;
  rank: number;
  score: number | null;
  view_count: number | null;
}

export interface MapPlace {
  id: string;
  name: string;
  name_en: string | null;
  category: s.Place["category"];
  lat: number;
  lng: number;
  region_id: string;
  district_id: string | null;
  district_name: string | null;
  city_id: string | null;
  city_name: string | null;
  region_name: string | null;
  address: string | null;
  description: string | null;
  tags: string[];
  search_query: string;
  source_count: number;
  cover_url: string | null;
  sources: MapPlaceSource[];
  course_id: string | null;
}

export interface MapArea {
  id: string;
  name: string;
  level: "city" | "district";
  parent_id: string | null;
  lat: number;
  lng: number;
  place_count: number;
  child_count: number;
}

export async function listMapPlaces(): Promise<MapPlace[]> {
  const db = snapshot();
  return db.places.map((p) => {
    const region = db.regions.find((r) => r.id === p.region_id);
    const city = cityOf(db, p.region_id);
    const district = districtOf(db, p.region_id);
    const media = mediaFor(db, p.id);
    const cover = media.find((m) => m.is_cover && m.kind === "image") ?? media.find((m) => m.kind === "image");
    const links = db.placeSources
      .filter((ps) => ps.place_id === p.id)
      .sort((a, b) => a.rank - b.rank)
      .flatMap((ps) => {
        const src = db.sources.find((s) => s.id === ps.source_id);
        if (!src) return [];
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
          },
        ];
      });
    const stop = db.courseStops.find((st) => st.place_id === p.id);
    const course = stop ? db.courses.find((c) => c.id === stop.course_id && c.visibility === "public") : null;
    return {
      id: p.id,
      name: p.name,
      name_en: p.name_en,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      region_id: p.region_id,
      district_id: district?.id ?? null,
      district_name: district?.name ?? null,
      city_id: city?.id ?? null,
      city_name: city?.name ?? null,
      region_name: region?.name ?? null,
      address: p.address,
      description: p.description,
      tags: p.tags,
      search_query: searchQueryFor(p, city),
      source_count: links.length,
      cover_url: cover?.url ?? null,
      sources: links,
      course_id: course?.id ?? null,
    };
  });
}

export async function listMapAreas(): Promise<MapArea[]> {
  const places = await listMapPlaces();
  const db = snapshot();
  const cities = db.regions.filter((r) => r.level === "city");
  const districts = db.regions.filter((r) => r.level === "district");

  const cityAreas: MapArea[] = cities.flatMap((city) => {
    const cityPlaces = places.filter((p) => p.city_id === city.id);
    if (cityPlaces.length === 0) return [];
    const kids = districts.filter((d) => d.parent_id === city.id);
    const lat = cityPlaces.reduce((sum, p) => sum + p.lat, 0) / cityPlaces.length;
    const lng = cityPlaces.reduce((sum, p) => sum + p.lng, 0) / cityPlaces.length;
    return [
      {
        id: city.id,
        name: city.name,
        level: "city" as const,
        parent_id: city.parent_id === city.id ? "kr" : city.parent_id,
        lat: city.lat || lat,
        lng: city.lng || lng,
        place_count: cityPlaces.length,
        child_count: kids.filter((d) => cityPlaces.some((p) => p.district_id === d.id)).length,
      },
    ];
  });

  const districtAreas: MapArea[] = districts.flatMap((d) => {
    const dPlaces = places.filter((p) => p.district_id === d.id);
    if (dPlaces.length === 0) return [];
    const lat = dPlaces.reduce((sum, p) => sum + p.lat, 0) / dPlaces.length;
    const lng = dPlaces.reduce((sum, p) => sum + p.lng, 0) / dPlaces.length;
    return [
      {
        id: d.id,
        name: d.name,
        level: "district" as const,
        parent_id: d.parent_id,
        lat: d.lat || lat,
        lng: d.lng || lng,
        place_count: dPlaces.length,
        child_count: dPlaces.length,
      },
    ];
  });

  return [...cityAreas, ...districtAreas];
}

export async function listCoursesWithCover(): Promise<(s.Course & { stopCount: number; coverUrl: string | null })[]> {
  const db = snapshot();
  const courses = await listCourses();
  return courses.map((c) => {
    const firstStop = db.courseStops.filter((st) => st.course_id === c.id).sort(byPosition)[0];
    const media = firstStop ? mediaFor(db, firstStop.place_id) : [];
    const cover = media.find((m) => m.is_cover && m.kind === "image") ?? media.find((m) => m.kind === "image");
    return { ...c, coverUrl: cover?.url ?? null };
  });
}

export async function listRegions(): Promise<s.Region[]> {
  return snapshot().regions;
}

export async function getPlace(id: string) {
  const db = snapshot();
  const place = db.places.find((p) => p.id === id);
  if (!place) return null;
  const sources = db.placeSources
    .filter((ps) => ps.place_id === id)
    .sort((a, b) => b.relevance - a.relevance)
    .flatMap((ps) => {
      const source = db.sources.find((src) => src.id === ps.source_id);
      return source ? [{ ...source, relevance: ps.relevance, note: ps.note, timestamp_sec: ps.timestamp_sec }] : [];
    });
  return {
    place,
    region: db.regions.find((r) => r.id === place.region_id),
    sources,
    soundscape: soundscapeFor(db, id),
    media: mediaFor(db, id),
  };
}
