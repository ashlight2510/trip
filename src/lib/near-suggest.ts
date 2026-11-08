import type { Place } from "@/db/schema";

export type WanderMode = "walk" | "drive5" | "drive10" | "drive20";

export const WANDER_RADIUS_KM: Record<WanderMode, number> = {
  walk: 1,
  drive5: 5,
  drive10: 10,
  drive20: 20,
};

/** Zoom that roughly frames the wander radius. */
export const WANDER_FIT_ZOOM: Record<WanderMode, number> = {
  walk: 15,
  drive5: 13,
  drive10: 12,
  drive20: 11,
};

/** Categories offered as quick picks for near-suggest. */
export const WANDER_CATEGORIES: Place["category"][] = [
  "cafe",
  "restaurant",
  "viewpoint",
  "forest",
  "beach",
  "park",
  "landmark",
  "heritage",
  "market",
  "street",
];

export const WANDER_PICK_COUNT = 6;

export function shufflePick<T>(items: readonly T[], n: number): T[] {
  if (items.length <= n) return [...items].sort(() => Math.random() - 0.5);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, n);
}

/**
 * Prefer curated / reviewed places while still randomizing.
 * Higher weight → more likely to appear in the shortlist.
 */
export function weightedShufflePick<T>(
  items: readonly T[],
  n: number,
  weightOf: (item: T) => number,
): T[] {
  if (items.length <= n) return shufflePick(items, n);
  const pool = items.map((item) => ({ item, w: Math.max(0.05, weightOf(item)) }));
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n && used.size < pool.length) {
    let total = 0;
    for (let i = 0; i < pool.length; i++) {
      if (!used.has(i)) total += pool[i]!.w;
    }
    if (total <= 0) break;
    let r = Math.random() * total;
    let picked = -1;
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue;
      r -= pool[i]!.w;
      if (r <= 0) {
        picked = i;
        break;
      }
    }
    if (picked < 0) break;
    used.add(picked);
    out.push(pool[picked]!.item);
  }
  return out;
}

export function wanderPlaceWeight(place: {
  description?: string | null;
  is_pick?: boolean;
  source_count?: number;
  pin_score?: number;
}): number {
  let w = 1;
  if (place.description) w += 4;
  if (place.is_pick) w += 5;
  if ((place.source_count ?? 0) > 0) w += 2;
  if ((place.pin_score ?? 0) > 40) w += 2;
  return w;
}

export function formatDistanceKm(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)}m`;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
}
