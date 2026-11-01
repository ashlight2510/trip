import type { Place } from "@/db/schema";

export type WanderMode = "walk" | "drive5" | "drive10";

export const WANDER_RADIUS_KM: Record<WanderMode, number> = {
  walk: 1,
  drive5: 5,
  drive10: 10,
};

/** Zoom that roughly frames the wander radius. */
export const WANDER_FIT_ZOOM: Record<WanderMode, number> = {
  walk: 15,
  drive5: 13,
  drive10: 12,
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

export function formatDistanceKm(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)}m`;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
}
