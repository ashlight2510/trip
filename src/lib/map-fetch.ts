import type { MapPlace } from "@/db/repo";

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

export async function fetchPlaces(params: Record<string, string | number | undefined>): Promise<MapPlace[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const res = await fetch(`/api/map/places?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const data = (await res.json()) as { places: MapPlace[] };
  return data.places ?? [];
}

export async function fetchPlaceDetail(id: string): Promise<MapPlace | null> {
  const res = await fetch(`/api/map/places/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`place ${res.status}`);
  const data = (await res.json()) as { place: MapPlace };
  return data.place ?? null;
}
