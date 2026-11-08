import "server-only";
import type { LayerSpec } from "@/lib/sound/engine";
import { compareSourceSort } from "@/lib/source-rank";
import { SOURCE_VOTE_HIDE_AT } from "./curation";
import { readTable } from "./json-table";
import * as s from "./schema";

/**
 * Read-side data access. JSON is loaded from disk on each call so collect scripts
 * show up on the map without a rebuild. Swap this module for Postgres later.
 */

function load<T extends s.TableName>(name: T): s.Row<T>[] {
  return readTable(name);
}

function snapshot() {
  return {
    regions: load("regions"),
    places: load("places"),
    sources: load("sources"),
    placeSources: load("place_sources"),
    placeSourceBoosts: load("place_source_boosts"),
    placeSourceVoteScores: load("place_source_vote_scores"),
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
  /** Outbound blog/video links for this place (place-trip solo explore). */
  sources?: MapPlaceSource[];
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
  /** Manual editor boost from place_source_boosts (0 = default). */
  boost: number;
  /** Community net score (up − down). Hidden when ≤ SOURCE_VOTE_HIDE_AT. */
  community_score: number;
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
  district_name_en: string | null;
  city_id: string | null;
  city_name: string | null;
  city_name_en: string | null;
  region_name: string | null;
  address: string | null;
  description: string | null;
  tags: string[];
  search_query: string;
  source_count: number;
  /** Community place likes (toggle heart). Feeds pin_score moderately. */
  like_count: number;
  /** Editorial 풍경너머 픽 membership (any collection). */
  is_pick: boolean;
  /** In the “좋은 카페” (pn-cafe) pick list — distinct map pin shape. */
  is_cafe_pick: boolean;
  /** Browse-pin ranking: reviews / likes / picks / demote chains. Higher = better pin. */
  pin_score: number;
  cover_url: string | null;
  sources: MapPlaceSource[];
  course_id: string | null;
}

export interface MapArea {
  id: string;
  name: string;
  name_en: string | null;
  level: "city" | "district";
  parent_id: string | null;
  lat: number;
  lng: number;
  place_count: number;
  child_count: number;
}

export async function listMapPlaces(): Promise<MapPlace[]> {
  const { queryMapPlaces } = await import("./map-query");
  return queryMapPlaces({ limit: 500 });
}

export async function listMapAreas(): Promise<MapArea[]> {
  const { listMapAreasFast } = await import("./map-query");
  return listMapAreasFast();
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
  const boostOf = (sourceId: string) =>
    db.placeSourceBoosts.find((b) => b.place_id === id && b.source_id === sourceId)?.boost ?? 0;
  const voteOf = (sourceId: string) =>
    db.placeSourceVoteScores.find((v) => v.place_id === id && v.source_id === sourceId)?.score ?? 0;
  const sources = db.placeSources
    .filter((ps) => ps.place_id === id)
    .flatMap((ps) => {
      const source = db.sources.find((src) => src.id === ps.source_id);
      if (!source) return [];
      const community_score = voteOf(ps.source_id);
      if (community_score <= SOURCE_VOTE_HIDE_AT) return [];
      return [
        {
          ...source,
          relevance: ps.relevance,
          note: ps.note,
          timestamp_sec: ps.timestamp_sec,
          boost: boostOf(ps.source_id),
          community_score,
          rank: ps.rank,
        },
      ];
    })
    .sort((a, b) =>
      compareSourceSort(
        {
          boost: a.boost + a.community_score,
          relevance: a.relevance,
          view_count: a.view_count,
          rank: a.rank,
        },
        {
          boost: b.boost + b.community_score,
          relevance: b.relevance,
          view_count: b.view_count,
          rank: b.rank,
        },
      ),
    );
  return {
    place,
    region: db.regions.find((r) => r.id === place.region_id),
    sources,
    soundscape: soundscapeFor(db, id),
    media: mediaFor(db, id),
  };
}

/** Single-stop “나홀로 여행” view — Kakao roadview at place coords, no course required. */
export async function getPlaceTrip(placeId: string): Promise<CourseView | null> {
  const detail = await getPlace(placeId);
  if (!detail) return null;
  const { place, region, sources, soundscape, media } = detail;
  const city = cityOf(snapshot(), place.region_id);
  const now = new Date().toISOString();
  const course: s.Course = {
    id: `solo-${place.id}`,
    title: `${place.name} · 나홀로 여행`,
    subtitle: city?.name ? `${city.name}에서 먼저 서 보기` : "로드뷰로 그 자리에 서 보기",
    country_code: region?.country_code ?? "KR",
    cover: (place.palette as [string, string] | null) ?? ["#1b4965", "#5fa8a3"],
    visibility: "unlisted",
    created_at: now,
    updated_at: now,
  };
  const stop: StopView = {
    place,
    region,
    heading: place.view_heading ?? 0,
    tip: "드래그해서 둘러보세요. 후기는 원문 링크로 이어집니다.",
    searchQuery: searchQueryFor(place, city),
    soundscape,
    media,
    sources: sources.map((src, i) => ({
      id: src.id,
      type: src.type,
      title: src.title,
      url: src.url,
      author: src.author,
      provider: src.provider,
      published_at: src.published_at,
      snippet: src.snippet,
      relevance: src.relevance,
      rank: i + 1,
      score: src.score,
      view_count: src.view_count,
      boost: src.boost,
      community_score: src.community_score,
    })),
  };
  return { course, stops: [stop] };
}
