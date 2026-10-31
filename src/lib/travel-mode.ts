export type TravelMode = "walk" | "motorcycle" | "car";

export type TravelPose = { lat: number; lng: number; heading: number; speedMps: number };

export const TRAVEL_MODES: {
  id: TravelMode;
  label: string;
  hint: string;
  /** Map feel speed (m/s). Scaled up from real-world so the map game is playable. */
  speedMps: number;
  turnDegPerSec: number;
}[] = [
  { id: "walk", label: "도보", hint: "천천히 골목 탐험", speedMps: 12, turnDegPerSec: 90 },
  { id: "motorcycle", label: "오토바이", hint: "기동성 있게 이동", speedMps: 48, turnDegPerSec: 120 },
  { id: "car", label: "자동차", hint: "빠르게 멀리", speedMps: 72, turnDegPerSec: 75 },
];

export function travelModeMeta(id: TravelMode) {
  return TRAVEL_MODES.find((m) => m.id === id) ?? TRAVEL_MODES[0]!;
}

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Move `meters` along bearing (degrees clockwise from north). */
export function offsetLatLng(lat: number, lng: number, bearingDeg: number, meters: number) {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const ang = meters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br));
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(br) * Math.sin(ang) * Math.cos(lat1), Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180 };
}
