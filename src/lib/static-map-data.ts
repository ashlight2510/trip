import type { MapArea, MapPlace, MapPlaceSource } from "@/db/repo";
import { sampleByCategory } from "@/lib/sample-by-category";
import { scorePlaceSearch } from "@/lib/place-search";
import type { Place } from "@/db/schema";

export type StaticPlace = MapPlace & {
  view_heading?: number | null;
  palette?: [string, string] | null;
  pick_collections?: string[];
};

type StaticRegion = {
  id: string;
  name: string;
  name_en: string | null;
  level: string;
  parent_id: string | null;
  country_code: string | null;
  lat: number;
  lng: number;
};

type Bundle = {
  places: StaticPlace[];
  regions: StaticRegion[];
  areas: MapArea[];
  placeById: Map<string, StaticPlace>;
  regionById: Map<string, StaticRegion>;
};

let bundlePromise: Promise<Bundle> | null = null;

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

export function loadStaticBundle(): Promise<Bundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const [places, regions, areas] = await Promise.all([
        loadJson<StaticPlace[]>("/static-data/places.json"),
        loadJson<StaticRegion[]>("/static-data/regions.json"),
        loadJson<MapArea[]>("/static-data/areas.json"),
      ]);
      return {
        places,
        regions,
        areas,
        placeById: new Map(places.map((p) => [p.id, p])),
        regionById: new Map(regions.map((r) => [r.id, r])),
      };
    })();
  }
  return bundlePromise;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function placeMatchScore(place: StaticPlace, q: string) {
  return scorePlaceSearch(
    {
      name: place.name,
      nameEn: place.name_en,
      category: place.category as Place["category"],
      tags: place.tags,
      address: place.address,
      description: place.description,
      cityName: place.city_name,
      districtName: place.district_name,
    },
    q,
  );
}

export type StaticPlaceQuery = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  q?: string;
  scope?: "near" | "all";
  cityId?: string;
  districtId?: string;
  limit?: number;
  includeSources?: boolean;
};

export async function queryStaticPlaces(query: StaticPlaceQuery): Promise<MapPlace[]> {
  const { places } = await loadStaticBundle();
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 500);
  const q = query.q?.trim().toLowerCase() ?? "";
  const nearScope = query.scope === "near" && query.lat != null && query.lng != null && Boolean(q);
  const nearRadiusKm = query.radiusKm ?? 25;

  type Cand = { place: StaticPlace; score: number; dist: number };
  const cands: Cand[] = [];

  for (const place of places) {
    if (!q) {
      if (query.cityId && place.city_id !== query.cityId) continue;
      if (query.districtId && place.district_id !== query.districtId) continue;
    }
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
      const score = placeMatchScore(place, q);
      if (score <= 0) continue;
      cands.push({ place, score, dist });
    } else if (query.lat != null && query.lng != null) {
      cands.push({ place, score: Math.max(0, 1000 - dist * 10), dist });
    } else {
      cands.push({ place, score: place.pin_score || 1, dist });
    }
  }

  cands.sort((a, b) => {
    if (q && nearScope) return a.dist - b.dist || b.score - a.score;
    if (q) return b.score - a.score || a.dist - b.dist;
    if (query.lat != null) return a.dist - b.dist;
    return b.score - a.score;
  });

  const ranked =
    !q && query.lat == null
      ? sampleByCategory(
          cands,
          limit,
          (c) => c.place.category,
          (c) => c.place.pin_score,
        )
      : cands.slice(0, limit);

  return ranked.map(({ place }) => {
    const sources = (query.includeSources ? place.sources : []) as MapPlaceSource[];
    return { ...place, sources };
  });
}

export async function getStaticPlace(id: string): Promise<StaticPlace | null> {
  const { placeById } = await loadStaticBundle();
  return placeById.get(id) ?? null;
}

export async function listStaticAreas(): Promise<MapArea[]> {
  const { areas } = await loadStaticBundle();
  return areas;
}
