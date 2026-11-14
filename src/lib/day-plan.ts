import type { MapPlace } from "@/db/repo";
import type { Place } from "@/db/schema";
import { haversineM } from "@/lib/travel-mode";

export type DayRole = "morning" | "lunch" | "afternoon" | "sunset";
export type AccessMode = "walk" | "drive" | "indoor";
export type Verdict = "go" | "ok" | "skip";

export type DayStop = {
  place: MapPlace;
  role: DayRole;
  access: AccessMode;
  verdict: Verdict;
  kmFromPrev: number;
};

const ROLES: { role: DayRole; categories: Place["category"][] }[] = [
  { role: "morning", categories: ["beach", "cafe", "park"] },
  { role: "lunch", categories: ["restaurant", "market", "cafe"] },
  { role: "afternoon", categories: ["heritage", "landmark", "forest"] },
  { role: "sunset", categories: ["viewpoint", "beach"] },
];

export function placeVerdict(place: MapPlace): Verdict {
  if (place.is_pick || place.description || place.source_count >= 3 || (place.pin_score ?? 0) >= 40) {
    return "go";
  }
  if (!place.description && !place.is_pick && place.source_count === 0 && (place.pin_score ?? 0) < 15) {
    return "skip";
  }
  return "ok";
}

export function placeAccess(place: MapPlace, from: { lat: number; lng: number }): AccessMode {
  const tags = place.tags.join(" ");
  const indoor =
    tags.includes("실내") ||
    place.category === "cafe" ||
    place.category === "market" ||
    /박물관|몰|갤러리|극장/u.test(place.name);
  if (indoor && place.category !== "beach") return "indoor";
  const km = haversineM(from.lat, from.lng, place.lat, place.lng) / 1000;
  if (tags.includes("드라이브") || km > 2) return "drive";
  return "walk";
}

function slotScore(place: MapPlace, origin: { lat: number; lng: number }): number {
  const verdict = placeVerdict(place);
  if (verdict === "skip") return -1;
  const km = haversineM(origin.lat, origin.lng, place.lat, place.lng) / 1000;
  let score = verdict === "go" ? 80 : 30;
  score += Math.min(40, place.pin_score ?? 0);
  score += place.is_pick ? 25 : 0;
  score -= Math.min(30, km * 2);
  return score;
}

export function buildDayPlan(places: MapPlace[], origin: { lat: number; lng: number }): DayStop[] {
  const used = new Set<string>();
  const stops: DayStop[] = [];
  let cursor = origin;

  for (const slot of ROLES) {
    const pool = places.filter((p) => {
      if (used.has(p.id)) return false;
      if (slot.role === "afternoon") {
        return (
          slot.categories.includes(p.category) ||
          /박물관/u.test(p.name) ||
          p.tags.includes("실내")
        );
      }
      return slot.categories.includes(p.category);
    });
    const ranked = pool
      .map((place) => ({ place, score: slotScore(place, cursor) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score);
    const pick = ranked[0]?.place;
    if (!pick) continue;
    used.add(pick.id);
    const kmFromPrev = haversineM(cursor.lat, cursor.lng, pick.lat, pick.lng) / 1000;
    stops.push({
      place: pick,
      role: slot.role,
      access: placeAccess(pick, cursor),
      verdict: placeVerdict(pick),
      kmFromPrev,
    });
    cursor = { lat: pick.lat, lng: pick.lng };
  }
  return stops;
}
