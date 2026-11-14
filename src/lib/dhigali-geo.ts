import { DHIGALI_FEATURES } from "@/lib/dhigali-collected";
import { DHIGALI_NPCS, DHIGALI_SPOTS } from "@/lib/dhigali";
import { DHIGALI_COAST } from "@/lib/dhigali-coast";
import { haversineM, offsetLatLng } from "@/lib/travel-mode";

export { DHIGALI_FEATURES };

export { DHIGALI_COAST };

const latSum = DHIGALI_COAST.reduce((s, p) => s + p[0], 0);
const lngSum = DHIGALI_COAST.reduce((s, p) => s + p[1], 0);

/** Center of the mapped cay, not the resort GPS pin. */
export const DHIGALI_CENTER = {
  lat: latSum / DHIGALI_COAST.length,
  lng: lngSum / DHIGALI_COAST.length,
};

/** East meters, north meters from the cay center. */
export function toLocal(lat: number, lng: number) {
  const cos = Math.cos((DHIGALI_CENTER.lat * Math.PI) / 180);
  return {
    x: (lng - DHIGALI_CENTER.lng) * 111320 * cos,
    z: (lat - DHIGALI_CENTER.lat) * 110540,
  };
}

export function onDhigaliLand(lat: number, lng: number) {
  const ring = DHIGALI_COAST;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i]![0];
    const xi = ring[i]![1];
    const yj = ring[j]![0];
    const xj = ring[j]![1];
    const hit = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function localToLatLng(eastM: number, southM: number) {
  const east = offsetLatLng(DHIGALI_CENTER.lat, DHIGALI_CENTER.lng, 90, eastM);
  return offsetLatLng(east.lat, east.lng, 180, southM);
}

function segmentDistance(lat: number, lng: number, a: [number, number], b: [number, number]) {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const l2 = dx * dx + dy * dy || 1e-12;
  const t = Math.max(0, Math.min(1, ((lng - a[1]) * dx + (lat - a[0]) * dy) / l2));
  return haversineM(lat, lng, a[0] + t * dy, a[1] + t * dx);
}

export function onCollectedPath(lat: number, lng: number, reach = 18) {
  for (const feature of DHIGALI_FEATURES) {
    if (feature.kind === "wood") continue;
    const pts = feature.points;
    for (let i = 0; i < pts.length - 1; i++) {
      if (segmentDistance(lat, lng, pts[i]!, pts[i + 1]!) <= reach) return true;
    }
  }
  return false;
}

export function canWalk(lat: number, lng: number) {
  return onDhigaliLand(lat, lng) || onCollectedPath(lat, lng);
}

function nearestVertex(lat: number, lng: number, kinds: string[]) {
  let best: { lat: number; lng: number } | null = null;
  let bestD = Infinity;
  for (const feature of DHIGALI_FEATURES) {
    if (!kinds.includes(feature.kind)) continue;
    for (const [la, ln] of feature.points) {
      const d = haversineM(lat, lng, la, ln);
      if (d < bestD) {
        bestD = d;
        best = { lat: la, lng: ln };
      }
    }
  }
  return best ? { ...best, d: bestD } : null;
}

const SNAP_KIND: Record<string, string[]> = {
  villas: ["pier"],
  jetty: ["pier", "footway"],
  dive: ["footway", "service"],
  splash: ["pier", "footway"],
  arrival: ["pier", "service"],
  faru: ["pier", "footway"],
};

/** Drop a layout point onto the real cay, pulling inward until it sits on land. */
export function placeOnIsland(xEast: number, ySouth: number) {
  let east = xEast * 2.5;
  let south = ySouth * 1.15;
  for (let i = 0; i < 14; i++) {
    const p = localToLatLng(east, south);
    if (onDhigaliLand(p.lat, p.lng)) return p;
    east *= 0.72;
    south *= 0.72;
  }
  return { lat: DHIGALI_CENTER.lat, lng: DHIGALI_CENTER.lng };
}

export type GeoSpot = (typeof DHIGALI_SPOTS)[number] & { lat: number; lng: number };

export const GEO_SPOTS: GeoSpot[] = DHIGALI_SPOTS.map((spot) => {
  const guess = placeOnIsland(spot.x, spot.y);
  const kinds = SNAP_KIND[spot.id] ?? ["service", "footway", "pier"];
  const hit = nearestVertex(guess.lat, guess.lng, kinds);
  const at = hit && hit.d < 140 ? { lat: hit.lat, lng: hit.lng } : guess;
  return { ...spot, ...at };
});

const PATHS = DHIGALI_FEATURES.filter((feature) => feature.kind === "service" || feature.kind === "footway");

export const GEO_NPCS = DHIGALI_NPCS.map((npc, index) => {
  const line = PATHS[index % PATHS.length];
  const path = (line?.points ?? []).map(([lat, lng]) => ({ lat, lng }));
  return {
    ...npc,
    path: path.length ? path : npc.path.map((p) => placeOnIsland(p.x, p.y)),
  };
});

export const ARRIVAL = GEO_SPOTS.find((s) => s.id === "arrival") ?? GEO_SPOTS[0]!;

export function nearestGeoSpot(lat: number, lng: number, reach = 42) {
  let best: GeoSpot | null = null;
  let bestD = reach;
  for (const spot of GEO_SPOTS) {
    const d = haversineM(lat, lng, spot.lat, spot.lng);
    if (d < bestD) {
      best = spot;
      bestD = d;
    }
  }
  return best;
}

export function bearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
