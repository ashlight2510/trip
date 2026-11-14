import "server-only";
import { compareSourceSort } from "@/lib/source-rank";
import { scorePlaceSearch } from "@/lib/place-search";
import { sampleByCategory } from "@/lib/sample-by-category";
import {
  briefFillDay,
  buildTripBrief,
  parseTripBrief,
  type ParsedTripBrief,
  type TripBrief,
} from "@/lib/trip-brief";
import { isFranchiseChainName, SOURCE_VOTE_HIDE_AT } from "./curation";
import { readTable, tableStamp } from "./json-table";
import * as s from "./schema";
import type { MapArea, MapPlace, MapPlaceSource } from "./repo";

type Db = {
  regions: s.Region[];
  places: s.Place[];
  sources: s.Source[];
  placeSources: s.PlaceSource[];
  placeSourceBoosts: s.PlaceSourceBoost[];
  placeSourceVoteScores: s.PlaceSourceVoteScore[];
  placeLikeScores: s.PlaceLikeScore[];
  placePicks: s.PlacePick[];
  media: s.PlaceMedia[];
  courses: s.Course[];
  courseStops: s.CourseStop[];
};

type Indexes = {
  regionById: Map<string, s.Region>;
  sourceById: Map<string, s.Source>;
  placeSourcesByPlace: Map<string, s.PlaceSource[]>;
  boostByPlaceSource: Map<string, number>;
  voteScoreByPlaceSource: Map<string, number>;
  likesByPlace: Map<string, number>;
  pickCollectionsByPlace: Map<string, s.PlacePickCollection[]>;
  mediaByPlace: Map<string, s.PlaceMedia[]>;
  /** First linked source thumbnail (usually YouTube) for list/cover fallback. */
  thumbByPlace: Map<string, string>;
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

function loadTable<T extends s.TableName>(name: T): s.Row<T>[] {
  return readTable(name);
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
  const voteScoreByPlaceSource = new Map(
    db.placeSourceVoteScores.map((v) => [`${v.place_id}::${v.source_id}`, v.score]),
  );
  const likesByPlace = new Map(db.placeLikeScores.map((r) => [r.place_id, r.likes]));
  const pickCollectionsByPlace = new Map<string, s.PlacePickCollection[]>();
  for (const pick of db.placePicks) {
    const list = pickCollectionsByPlace.get(pick.place_id);
    if (list) {
      if (!list.includes(pick.collection)) list.push(pick.collection);
    } else {
      pickCollectionsByPlace.set(pick.place_id, [pick.collection]);
    }
  }
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

  const thumbByPlace = new Map<string, string>();
  for (const [placeId, links] of placeSourcesByPlace) {
    for (const ps of links) {
      const src = sourceById.get(ps.source_id);
      const thumb = src?.thumbnail_url;
      if (thumb) {
        thumbByPlace.set(placeId, thumb);
        break;
      }
    }
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
    voteScoreByPlaceSource,
    likesByPlace,
    pickCollectionsByPlace,
    mediaByPlace,
    thumbByPlace,
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
    "place_source_vote_scores",
    "place_like_scores",
    "place_picks",
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
    placeSourceVoteScores: loadTable("place_source_vote_scores"),
    placeLikeScores: loadTable("place_like_scores"),
    placePicks: loadTable("place_picks"),
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

function isLikelyChainPlace(name: string) {
  return isFranchiseChainName(name) || /점$/u.test(name.trim()) || /\d+호점/u.test(name);
}

/** Prefer reviewed / liked / picked places for browse pins; demote chains. */
function computePinScore(place: s.Place, ix: Indexes): number {
  const links = ix.placeSourcesByPlace.get(place.id) ?? [];
  let score = links.length * 10;
  let maxView = 0;
  let sumSrcScore = 0;
  let hasYt = false;
  for (const ps of links) {
    const src = ix.sourceById.get(ps.source_id);
    if (!src) continue;
    if (src.type === "youtube") hasYt = true;
    if (src.view_count != null && src.view_count > maxView) maxView = src.view_count;
    sumSrcScore += src.score ?? 0;
  }
  if (hasYt) score += 25;
  if (maxView > 0) score += Math.log10(maxView + 1) * 15;
  score += sumSrcScore * 0.01;
  // Community likes: meaningful but won't dominate a well-reviewed place.
  const likes = ix.likesByPlace.get(place.id) ?? 0;
  if (likes > 0) score += Math.log10(likes + 1) * 28;
  // Editorial 풍경너머 픽 — soft boost onto the map.
  const picks = ix.pickCollectionsByPlace.get(place.id);
  if (picks?.length) score += 40 + (picks.length - 1) * 8;
  if (isLikelyChainPlace(place.name)) score *= 0.4;
  return score;
}

function sourcesFor(ix: Indexes, placeId: string): MapPlaceSource[] {
  const links = ix.placeSourcesByPlace.get(placeId) ?? [];
  const rows = links.flatMap((ps) => {
    const src = ix.sourceById.get(ps.source_id);
    if (!src) return [];
    const key = `${placeId}::${ps.source_id}`;
    const community_score = ix.voteScoreByPlaceSource.get(key) ?? 0;
    if (community_score <= SOURCE_VOTE_HIDE_AT) return [];
    const boost = ix.boostByPlaceSource.get(key) ?? 0;
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
        community_score,
      },
    ];
  });
  rows.sort((a, b) =>
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
    city_name_en: city?.name_en ?? null,
    district_name_en: district?.name_en ?? null,
    region_name: region?.name ?? null,
    address: place.address,
    description: place.description,
    tags: place.tags,
    search_query: searchQueryFor(place, city),
    source_count: sourceCount,
    like_count: ix.likesByPlace.get(place.id) ?? 0,
    is_pick: (ix.pickCollectionsByPlace.get(place.id)?.length ?? 0) > 0,
    is_cafe_pick: (ix.pickCollectionsByPlace.get(place.id) ?? []).includes("pn-cafe"),
    pin_score: computePinScore(place, ix),
    cover_url: cover?.url ?? ix.thumbByPlace.get(place.id) ?? null,
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
  return scorePlaceSearch(
    {
      name: place.name,
      nameEn: place.name_en,
      category: place.category,
      address: place.address,
      description: place.description,
      tags: place.tags,
      cityName,
      districtName,
    },
    q,
  );
}

/** Strip common admin suffixes so "주교" matches region "주교동". */
function bareAreaName(name: string) {
  return name
    .toLowerCase()
    .replace(/(특별자치시|광역시|특별시|시|군|구|동|읍|면)$/u, "")
    .trim();
}

/** Strong area-name hits only — used to expand "동/시" search to nearby places. */
function regionQueryScore(regionName: string, q: string): number {
  const n = regionName.toLowerCase();
  if (!n || !q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q) && q.length >= 2) return 90;
  const bare = bareAreaName(regionName);
  const qBare = bareAreaName(q);
  // "주교" → 주교동/주교면. "주교동" must not also expand 주교면 via bare strip.
  if (q === qBare && bare && bare === qBare) return 95;
  return 0;
}

function regionNameScore(region: s.Region, q: string): number {
  return Math.max(regionQueryScore(region.name, q), regionQueryScore(region.name_en ?? "", q));
}

export type OutlineRegion = {
  id: string;
  name: string;
  nameEn: string | null;
  level: s.Region["level"];
  countryCode: string;
};

/** Best admin area to outline for a search. District beats a looser city/country tie. */
export function matchOutlineRegion(qRaw: string | undefined): OutlineRegion | null {
  const q = qRaw?.trim().toLowerCase() ?? "";
  if (q.length < 2) return null;
  const { db } = getMapDb();
  const levelRank: Record<s.Region["level"], number> = {
    district: 4,
    city: 3,
    province: 2,
    country: 1,
  };
  let best: { region: s.Region; score: number } | null = null;
  for (const region of db.regions) {
    const score = regionNameScore(region, q);
    if (score < 90) continue;
    const exact =
      region.name.toLowerCase() === q || (region.name_en ?? "").toLowerCase() === q;
    const bestExact =
      best != null &&
      (best.region.name.toLowerCase() === q || (best.region.name_en ?? "").toLowerCase() === q);
    const better =
      !best ||
      score > best.score ||
      (score === best.score &&
        exact &&
        bestExact &&
        levelRank[region.level] < levelRank[best.region.level]) ||
      (score === best.score &&
        !(exact && bestExact) &&
        levelRank[region.level] > levelRank[best.region.level]);
    if (better) best = { region, score };
  }
  if (!best) return null;
  return {
    id: best.region.id,
    name: best.region.name,
    nameEn: best.region.name_en,
    level: best.region.level,
    countryCode: best.region.country_code,
  };
}

/** How far around a matched 동/시 to also show places (km). */
const SEARCH_AREA_RADIUS_KM = 3;

export type MapPlaceQuery = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  q?: string;
  /** When "near" with lat/lng, text search is limited to radiusKm around the user. */
  scope?: "near" | "all";
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
  const nearScope =
    query.scope === "near" && query.lat != null && query.lng != null && Boolean(q);
  const nearRadiusKm = query.radiusKm ?? 25;

  type Cand = { place: s.Place; score: number; dist: number };
  const cands: Cand[] = [];
  const seen = new Set<string>();

  // Area anchors: matched 동/시/구 so we can show places nearby even if name doesn't contain q.
  // Skip nationwide area expansion when searching near the user — stay local.
  const areaAnchors: { lat: number; lng: number; score: number; regionId: string }[] = [];
  const broadRegionIds = new Set<string>();
  if (q && !nearScope) {
    for (const r of db.regions) {
      const rs = regionNameScore(r, q);
      if (rs <= 0) continue;
      if (r.level === "country" || r.level === "province") {
        if (rs >= 90) broadRegionIds.add(r.id);
        continue;
      }
      if (r.level !== "district" && r.level !== "city") continue;
      areaAnchors.push({ lat: r.lat, lng: r.lng, score: rs, regionId: r.id });
    }
    areaAnchors.sort((a, b) => b.score - a.score);
  }
  const matchedRegionIds = new Set(areaAnchors.map((a) => a.regionId));
  // Prefer strongest anchors (exact 동) when expanding geographically.
  const expandAnchors = areaAnchors.filter((a) => a.score >= 90).slice(0, 5);
  /** Radius around a matched 동/시 — independent of user near-me radius. */
  const areaRadius = SEARCH_AREA_RADIUS_KM;

  const pushCand = (place: s.Place, score: number, dist: number) => {
    if (seen.has(place.id)) {
      const existing = cands.find((c) => c.place.id === place.id);
      if (existing && score > existing.score) {
        existing.score = score;
        existing.dist = dist;
      }
      return;
    }
    seen.add(place.id);
    cands.push({ place, score, dist });
  };

  for (const place of db.places) {
    const city = ix.cityByRegion.get(place.region_id);
    const district = ix.districtByRegion.get(place.region_id);

    // Free-text search is nationwide — don't require a selected city/district.
    if (!q) {
      if (query.cityId && city?.id !== query.cityId) continue;
      if (query.districtId && district?.id !== query.districtId) continue;
    }

    // Bbox only for browse/pan loads — text search stays nationwide.
    if (
      !q &&
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
      const radius = nearScope ? nearRadiusKm : (query.radiusKm ?? 30);
      if ((!q || nearScope) && dist > radius) continue;
    }

    if (q) {
      let score = placeMatchScore(place, city?.name, district?.name, q);

      // Place belongs to a matched district/city region.
      if (score <= 0 && matchedRegionIds.has(place.region_id)) {
        score = 480;
      }
      if (score <= 0 && district && matchedRegionIds.has(district.id)) {
        score = 470;
      }
      if (score <= 0 && city && matchedRegionIds.has(city.id)) {
        score = 420;
      }
      if (score <= 0 && broadRegionIds.size) {
        const chain = ancestors(ix.regionById, place.region_id);
        if (chain.some((r) => broadRegionIds.has(r.id))) score = 430;
      }

      // Near a matched 동/시 centroid (the main fix for "주교동" → nearby pins).
      let bestNear = Infinity;
      if (expandAnchors.length) {
        for (const a of expandAnchors) {
          const d = haversineKm(a.lat, a.lng, place.lat, place.lng);
          if (d < bestNear) bestNear = d;
        }
        if (score <= 0 && bestNear <= areaRadius) {
          dist = bestNear;
          score = Math.max(50, Math.round(320 - bestNear * 40));
        }
        // Drop weak substring hits far from the matched area (e.g. "경주교동" for q=주교동).
        // Do not apply this to strong keyword/category hits (숲카페 등 전국 검색).
        if (score > 0 && score < 400 && bestNear > areaRadius * 4) {
          score = 0;
        }
      }

      if (score <= 0) continue;
      if (Number.isFinite(bestNear) && bestNear < Infinity) dist = bestNear;
      pushCand(place, score, dist);
    } else if (query.lat != null && query.lng != null) {
      pushCand(place, Math.max(0, 1000 - dist * 10), dist);
    } else {
      pushCand(place, 1, dist);
    }
  }

  // If text hits exist but no area match, still fan out a bit around top hits
  // so a landmark search also shows nearby food/cafe pins.
  if (q && !expandAnchors.length) {
    const seeds = [...cands].sort((a, b) => b.score - a.score).slice(0, 8);
    if (seeds.length) {
      for (const place of db.places) {
        if (seen.has(place.id)) continue;
        let best = Infinity;
        for (const s of seeds) {
          const d = haversineKm(s.place.lat, s.place.lng, place.lat, place.lng);
          if (d < best) best = d;
        }
        if (best <= Math.min(areaRadius, 2)) {
          pushCand(place, Math.max(40, Math.round(200 - best * 50)), best);
        }
      }
    }
  }

  cands.sort((a, b) => {
    if (q && nearScope) return a.dist - b.dist || b.score - a.score || a.place.name.localeCompare(b.place.name, "ko");
    if (q) return b.score - a.score || a.dist - b.dist || a.place.name.localeCompare(b.place.name, "ko");
    if (query.lat != null) return a.dist - b.dist;
    return b.score - a.score;
  });

  // Bbox browse: diversify categories, prefer high pin_score within each.
  const ranked =
    !q && query.lat == null
      ? sampleByCategory(
          cands,
          limit,
          (c) => c.place.category,
          (c) => computePinScore(c.place, ix),
        )
      : cands.slice(0, limit);

  return ranked.map((c) => toMapPlace(c.place, ix, { includeSources }));
}

export type MapSearchResult = {
  places: MapPlace[];
  brief: TripBrief | null;
  dayOffer: { name: string } | null;
  briefNeedsLoc: boolean;
};

function shortRegionName(name: string): string {
  const stripped = name
    .replace(/(특별자치시|특별자치도|광역시|특별시)$/u, "")
    .replace(/(시|군|구)$/u, "")
    .trim();
  return stripped || name;
}

function bestBriefRegion(q: string): s.Region | null {
  const { db } = getMapDb();
  let best: { region: s.Region; score: number } | null = null;
  for (const region of db.regions) {
    if (region.level !== "city" && region.level !== "district") continue;
    const score = regionNameScore(region, q);
    if (score < 90) continue;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && region.level === "city" && best.region.level !== "city") ||
      (score === best.score && region.level === best.region.level && region.name.length < best.region.name.length);
    if (better) best = { region, score };
  }
  return best?.region ?? null;
}

/** City or district for a brief. Token fallback is for "제주 협재", not a bare place name. */
function matchBriefRegion(qRaw: string, allowTokens: boolean): { region: s.Region; name: string } | null {
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2) return null;
  const direct = bestBriefRegion(q);
  if (direct) return { region: direct, name: shortRegionName(direct.name) };
  if (!allowTokens) return null;
  const parts = q.split(/\s+/).filter((part) => part.length >= 2);
  if (parts.length <= 1) return null;
  let best: { region: s.Region; score: number } | null = null;
  for (const part of parts) {
    const region = bestBriefRegion(part);
    if (!region) continue;
    const score = regionNameScore(region, part);
    const better =
      !best ||
      score > best.score ||
      (score === best.score && region.level === "city" && best.region.level !== "city");
    if (better) best = { region, score };
  }
  return best ? { region: best.region, name: shortRegionName(best.region.name) } : null;
}

/** Strong place-name hit. A pile of loose substring matches is not an anchor. */
function matchBriefPlace(qRaw: string): s.Place | null {
  const { db, ix } = getMapDb();
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2) return null;
  const pick = (query: string) => {
    let topScore = 0;
    let top: s.Place[] = [];
    for (const place of db.places) {
      const city = ix.cityByRegion.get(place.region_id);
      const district = ix.districtByRegion.get(place.region_id);
      const score = placeMatchScore(place, city?.name, district?.name, query);
      if (score < 780) continue;
      if (score > topScore) {
        topScore = score;
        top = [place];
      } else if (score === topScore) {
        top.push(place);
      }
    }
    if (!top.length) return null;
    if (topScore < 920 && top.length > 1) return null;
    top.sort((a, b) => computePinScore(b, ix) - computePinScore(a, ix));
    return top[0] ?? null;
  };
  const direct = pick(q);
  if (direct) return direct;
  const parts = q.split(/\s+/).filter((part) => part.length >= 2);
  if (parts.length <= 1) return null;
  return pick(parts[parts.length - 1] ?? "");
}

function placesForBriefRegion(region: s.Region): MapPlace[] {
  const { db, ix } = getMapDb();
  const matched: s.Place[] = [];
  for (const place of db.places) {
    if (region.level === "city") {
      if (ix.cityByRegion.get(place.region_id)?.id !== region.id) continue;
    } else {
      const district = ix.districtByRegion.get(place.region_id);
      if (district?.id !== region.id && place.region_id !== region.id) continue;
    }
    matched.push(place);
  }
  matched.sort(
    (a, b) => computePinScore(b, ix) - computePinScore(a, ix) || a.name.localeCompare(b.name, "ko"),
  );
  return matched.slice(0, 500).map((place) => toMapPlace(place, ix, { includeSources: false }));
}

/** Nearby pool with each category kept, so a dense cafe cluster cannot hide a park. */
function placesNearAnchor(lat: number, lng: number, radiusKm: number): MapPlace[] {
  const { db, ix } = getMapDb();
  const buckets = new Map<string, { place: s.Place; dist: number }[]>();
  for (const place of db.places) {
    const dist = haversineKm(lat, lng, place.lat, place.lng);
    if (dist > radiusKm) continue;
    const list = buckets.get(place.category) ?? [];
    list.push({ place, dist });
    buckets.set(place.category, list);
  }
  const picked: s.Place[] = [];
  for (const list of buckets.values()) {
    list.sort(
      (a, b) => computePinScore(b.place, ix) - computePinScore(a.place, ix) || a.dist - b.dist,
    );
    for (const row of list.slice(0, 40)) picked.push(row.place);
  }
  return picked.map((place) => toMapPlace(place, ix, { includeSources: false }));
}

type BriefAnchor = {
  kind: "region" | "place" | "near";
  name: string;
  lat: number;
  lng: number;
  regionId?: string;
  placeId?: string;
};

function resolveBriefAnchor(
  parsed: ParsedTripBrief,
  query: MapPlaceQuery,
): BriefAnchor | null {
  if (parsed.near) {
    if (query.lat == null || query.lng == null) return null;
    return { kind: "near", name: parsed.nearLabel ?? "근처", lat: query.lat, lng: query.lng };
  }
  const region = parsed.rest ? matchBriefRegion(parsed.rest, true) : null;
  if (region) {
    return {
      kind: "region",
      name: region.name,
      lat: region.region.lat,
      lng: region.region.lng,
      regionId: region.region.id,
    };
  }
  const place = parsed.rest ? matchBriefPlace(parsed.rest) : null;
  if (!place) return null;
  return { kind: "place", name: place.name, lat: place.lat, lng: place.lng, placeId: place.id };
}

function composeTripBrief(anchor: BriefAnchor, parsed: ParsedTripBrief): TripBrief | null {
  const { db, ix } = getMapDb();
  const region = anchor.regionId ? ix.regionById.get(anchor.regionId) : undefined;
  const pool =
    anchor.kind === "region" && region
      ? placesForBriefRegion(region)
      : placesNearAnchor(anchor.lat, anchor.lng, anchor.kind === "place" ? 3 : 12);

  let anchorPlace: MapPlace | null = null;
  if (anchor.kind === "place" && anchor.placeId) {
    anchorPlace = pool.find((p) => p.id === anchor.placeId) ?? null;
    if (!anchorPlace) {
      const raw = db.places.find((p) => p.id === anchor.placeId);
      if (raw) anchorPlace = toMapPlace(raw, ix, { includeSources: false });
    }
  }

  const fillDay = briefFillDay(parsed);
  const shape = anchor.kind === "place" && !fillDay ? "addon" : "day";
  return buildTripBrief({
    pool,
    origin: { lat: anchor.lat, lng: anchor.lng },
    anchorPlace,
    anchorName: anchor.name,
    wishes: parsed.wishes,
    fillDay: shape === "addon" ? false : fillDay,
    shape,
    day: parsed.day,
  });
}

export function searchMapPlaces(query: MapPlaceQuery): MapSearchResult {
  const places = queryMapPlaces(query);
  const parsed = parseTripBrief(query.q ?? "");
  if (!query.q?.trim()) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: false };
  }
  if (!parsed.isBrief) {
    const region =
      parsed.rest && !parsed.near && !parsed.day && parsed.wishes.length === 0
        ? matchBriefRegion(parsed.rest, false)
        : null;
    return {
      places,
      brief: null,
      dayOffer: region ? { name: region.name } : null,
      briefNeedsLoc: false,
    };
  }
  if (parsed.near && (query.lat == null || query.lng == null)) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: true };
  }
  const anchor = resolveBriefAnchor(parsed, query);
  if (!anchor) return { places, brief: null, dayOffer: null, briefNeedsLoc: false };
  return {
    places,
    brief: composeTripBrief(anchor, parsed),
    dayOffer: null,
    briefNeedsLoc: false,
  };
}

export function getMapPlace(id: string): MapPlace | null {
  const { db, ix } = getMapDb();
  const place = db.places.find((p) => p.id === id);
  if (!place) return null;
  return toMapPlace(place, ix, { includeSources: true });
}

export type PlacePickCard = {
  collection: s.PlacePickCollection;
  note: string | null;
  rank: number;
  place: MapPlace;
};

/** Curated 풍경너머 픽 lists for /picks. */
export function listPlacePicks(collection?: s.PlacePickCollection): PlacePickCard[] {
  const { db, ix } = getMapDb();
  const rows = collection ? db.placePicks.filter((p) => p.collection === collection) : db.placePicks;
  const cards: PlacePickCard[] = [];
  for (const pick of rows) {
    const place = db.places.find((p) => p.id === pick.place_id);
    if (!place) continue;
    cards.push({
      collection: pick.collection,
      note: pick.note,
      rank: pick.rank,
      place: toMapPlace(place, ix, { includeSources: false }),
    });
  }
  cards.sort(
    (a, b) =>
      a.collection.localeCompare(b.collection) ||
      a.rank - b.rank ||
      a.place.name.localeCompare(b.place.name, "ko"),
  );
  return cards;
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
        name_en: city.name_en,
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
        name_en: d.name_en,
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
