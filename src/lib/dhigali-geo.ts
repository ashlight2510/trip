import { DHIGALI_NPCS, DHIGALI_SPOTS } from "@/lib/dhigali";
import { DHIGALI_COAST } from "@/lib/dhigali-coast";
import { haversineM, offsetLatLng } from "@/lib/travel-mode";

export { DHIGALI_COAST };

const latSum = DHIGALI_COAST.reduce((s, p) => s + p[0], 0);
const lngSum = DHIGALI_COAST.reduce((s, p) => s + p[1], 0);

/** Center of the mapped cay, not the resort GPS pin. */
export const DHIGALI_CENTER = {
  lat: latSum / DHIGALI_COAST.length,
  lng: lngSum / DHIGALI_COAST.length,
};

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

export const GEO_SPOTS: GeoSpot[] = DHIGALI_SPOTS.map((spot) => ({
  ...spot,
  ...placeOnIsland(spot.x, spot.y),
}));

export const GEO_NPCS = DHIGALI_NPCS.map((npc) => ({
  ...npc,
  path: npc.path.map((p) => placeOnIsland(p.x, p.y)),
}));

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
