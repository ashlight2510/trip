import type { MapPlace } from "@/db/repo";
import type { TripBrief } from "@/lib/trip-brief";
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

export async function fetchMapSearch(
  params: Record<string, string | number | undefined>,
): Promise<MapSearchResponse> {
  const places = await queryStaticPlaces(paramsToQuery(params));
  return {
    places,
    brief: null,
    dayOffer: null,
    briefNeedsLoc: false,
  };
}

export async function fetchPlaceDetail(id: string): Promise<MapPlace | null> {
  return getStaticPlace(id);
}
