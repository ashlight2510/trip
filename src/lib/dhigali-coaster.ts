import { DHIGALI_COAST } from "@/lib/dhigali-coast";
import { ARRIVAL, DHIGALI_CENTER } from "@/lib/dhigali-geo";

export type CoasterSample = { lat: number; lng: number; lift: number };

const COS = Math.cos((DHIGALI_CENTER.lat * Math.PI) / 180);

function shift(lat: number, lng: number, east: number, north: number) {
  return {
    lat: lat + north / 110540,
    lng: lng + east / (111320 * COS),
  };
}

function fromCenter(lat: number, lng: number, meters: number) {
  const east = (lng - DHIGALI_CENTER.lng) * 111320 * COS;
  const north = (lat - DHIGALI_CENTER.lat) * 110540;
  const len = Math.hypot(east, north) || 1;
  return shift(lat, lng, (east / len) * meters, (north / len) * meters);
}

function buildTrack() {
  const ring = DHIGALI_COAST.slice(0, -1);
  let start = 0;
  let best = Infinity;
  ring.forEach(([lat, lng], i) => {
    const d = (lat - ARRIVAL.lat) ** 2 + (lng - ARRIVAL.lng) ** 2;
    if (d < best) {
      best = d;
      start = i;
    }
  });
  const ordered = ring.slice(start).concat(ring.slice(0, start));
  const shore = ordered[0] ?? [ARRIVAL.lat, ARRIVAL.lng];
  const beach = fromCenter(shore[0], shore[1], -18);
  const track: CoasterSample[] = [];
  for (let i = 0; i < ordered.length; i += 2) {
    const point = ordered[i];
    if (!point) continue;
    track.push({ ...fromCenter(point[0], point[1], 46), lift: 3.4 });
  }
  const count = track.length || 1;
  for (let i = 0; i < track.length; i++) {
    const sample = track[i];
    if (!sample) continue;
    const u = i / count;
    let lift = 5.6 + Math.sin(u * Math.PI * 4) * 4.4 + Math.sin(u * Math.PI * 2) * 1.5;
    if (u > 0.46 && u < 0.62) {
      const dip = Math.sin(((u - 0.46) / 0.16) * Math.PI);
      lift = lift * (1 - dip) + -2.4 * dip;
    }
    if (u < 0.05 || u > 0.96) lift = 3.4;
    sample.lift = lift;
  }
  return { beach, track };
}

const built = buildTrack();

/** Lagoon rail just outside the cay. One lap dips under the surface. */
export const LAGOON_TRACK = built.track;

/** Sand beside the station, where the buggy stops. */
export const COASTER_BEACH = built.beach;

export const COASTER_STATION = built.track[0] ?? {
  lat: ARRIVAL.lat,
  lng: ARRIVAL.lng,
  lift: 3.4,
};

export function coasterAt(t: number) {
  const path = LAGOON_TRACK;
  const count = path.length;
  const first = path[0] ?? COASTER_STATION;
  if (count <= 1) return first;
  const u = Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0;
  const dist = u * count;
  const index = Math.floor(dist) % count;
  const blend = dist - Math.floor(dist);
  const a = path[index] ?? first;
  const b = path[(index + 1) % count] ?? a;
  return {
    lat: a.lat + (b.lat - a.lat) * blend,
    lng: a.lng + (b.lng - a.lng) * blend,
    lift: a.lift + (b.lift - a.lift) * blend,
  };
}
