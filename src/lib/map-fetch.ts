import type { MapPlace } from "@/db/repo";
import {
  buildTripBrief,
  parseTripBrief,
  type TripBrief,
} from "@/lib/trip-brief";
import { getStaticPlace, queryStaticPlaces } from "@/lib/static-map-data";

export type MapSearchResponse = {
  places: MapPlace[];
  brief: TripBrief | null;
  dayOffer: { name: string } | null;
  briefNeedsLoc: boolean;
};

export function mergePlaces(prev: MapPlace[], next: MapPlace[]): MapPlace[] {
  const map = new Map(prev.map((p) => [p.id, p]));
  for (const p of next) {
    const old = map.get(p.id);
    if (old?.sources?.length && !p.sources?.length) {
      map.set(p.id, {
        ...p,
        sources: old.sources,
        source_count: Math.max(old.source_count, p.source_count),
        like_count: Math.max(old.like_count ?? 0, p.like_count ?? 0),
        is_pick: Boolean(old.is_pick || p.is_pick),
        is_cafe_pick: Boolean(old.is_cafe_pick || p.is_cafe_pick),
        pin_score: Math.max(old.pin_score ?? 0, p.pin_score ?? 0),
      });
    } else {
      map.set(p.id, {
        ...p,
        is_cafe_pick: Boolean(old?.is_cafe_pick || p.is_cafe_pick),
        is_pick: Boolean(old?.is_pick || p.is_pick),
      });
    }
  }
  return [...map.values()];
}

function paramsToQuery(params: Record<string, string | number | undefined>) {
  return {
    lat: params.lat != null && params.lat !== "" ? Number(params.lat) : undefined,
    lng: params.lng != null && params.lng !== "" ? Number(params.lng) : undefined,
    radiusKm: params.radiusKm != null && params.radiusKm !== "" ? Number(params.radiusKm) : undefined,
    west: params.west != null && params.west !== "" ? Number(params.west) : undefined,
    south: params.south != null && params.south !== "" ? Number(params.south) : undefined,
    east: params.east != null && params.east !== "" ? Number(params.east) : undefined,
    north: params.north != null && params.north !== "" ? Number(params.north) : undefined,
    q: params.q != null ? String(params.q) : undefined,
    scope: params.scope === "near" ? ("near" as const) : ("all" as const),
    cityId: params.cityId != null ? String(params.cityId) : undefined,
    districtId: params.districtId != null ? String(params.districtId) : undefined,
    limit: params.limit != null && params.limit !== "" ? Number(params.limit) : undefined,
    includeSources: params.includeSources === 1 || params.includeSources === "1",
  };
}

export async function fetchPlaces(params: Record<string, string | number | undefined>): Promise<MapPlace[]> {
  return queryStaticPlaces(paramsToQuery(params));
}

function briefFillDay(parsed: ReturnType<typeof parseTripBrief>) {
  return parsed.day || parsed.wishes.length > 0;
}

/** Client-side day brief for static export (no /api). */
async function composeClientBrief(
  q: string,
  params: Record<string, string | number | undefined>,
  places: MapPlace[],
): Promise<Pick<MapSearchResponse, "brief" | "dayOffer" | "briefNeedsLoc" | "places">> {
  const parsed = parseTripBrief(q);
  if (!parsed.isBrief) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: false };
  }
  if (parsed.near && (params.lat == null || params.lng == null)) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: true };
  }

  let origin = {
    lat: params.lat != null ? Number(params.lat) : NaN,
    lng: params.lng != null ? Number(params.lng) : NaN,
  };
  let anchorName = parsed.nearLabel ?? (parsed.rest || "하루");
  let anchorPlace: MapPlace | null = null;

  if (!parsed.near) {
    const rest = parsed.rest.trim();
    if (rest) {
      anchorPlace =
        places.find((p) => p.name === rest) ??
        places.find((p) => p.name.includes(rest) || (p.name_en ?? "").toLowerCase().includes(rest.toLowerCase())) ??
        null;
    }
    if (anchorPlace) {
      origin = { lat: anchorPlace.lat, lng: anchorPlace.lng };
      anchorName = anchorPlace.city_name ? `${anchorPlace.city_name}` : anchorPlace.name;
    } else if (places[0]) {
      origin = { lat: places[0].lat, lng: places[0].lng };
      anchorName = places[0].city_name || rest || places[0].name;
    } else {
      return { places, brief: null, dayOffer: null, briefNeedsLoc: false };
    }
  } else if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: true };
  }

  let pool = places;
  if (pool.length < 40) {
    const extra = await queryStaticPlaces({
      lat: origin.lat,
      lng: origin.lng,
      radiusKm: 35,
      limit: 250,
    });
    pool = mergePlaces(places, extra);
  }

  const fillDay = briefFillDay(parsed);
  const shape = anchorPlace && !fillDay ? "addon" : "day";
  const brief = buildTripBrief({
    pool,
    origin,
    anchorPlace,
    anchorName,
    wishes: parsed.wishes,
    fillDay: shape === "addon" ? false : fillDay,
    shape,
    day: parsed.day,
  });

  const extras = brief
    ? brief.stops.flatMap((stop) => [stop.place, ...stop.alternates])
    : [];
  return {
    places: mergePlaces(places, extras),
    brief,
    dayOffer: null,
    briefNeedsLoc: false,
  };
}

export async function fetchMapSearch(
  params: Record<string, string | number | undefined>,
): Promise<MapSearchResponse> {
  const q = params.q != null ? String(params.q) : "";
  const places = await queryStaticPlaces(paramsToQuery(params));
  if (!q.trim()) {
    return { places, brief: null, dayOffer: null, briefNeedsLoc: false };
  }
  const composed = await composeClientBrief(q, params, places);
  return composed;
}

export async function fetchPlaceDetail(id: string): Promise<MapPlace | null> {
  return getStaticPlace(id);
}
