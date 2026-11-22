import type { MapPlace } from "@/db/repo";
import { placeAccess, placeVerdict, type DayRole } from "@/lib/day-plan";
import { absoluteUrl } from "@/lib/site";
import { rechainBriefStops, type BriefStop, type TripBrief } from "@/lib/trip-brief";

const ROLE_CODE: Record<DayRole, string> = {
  morning: "m",
  lunch: "l",
  afternoon: "a",
  sunset: "s",
};

const CODE_ROLE: Record<string, DayRole> = {
  m: "morning",
  l: "lunch",
  a: "afternoon",
  s: "sunset",
};

export type SharedDayStop = {
  role: DayRole;
  placeId: string;
};

/** Encode current day stops into a static-shareable path (`/?day=m:id,l:id`). */
export function daySharePath(
  stops: { role: DayRole; placeId: string }[],
  title?: string,
): string {
  const day = stops
    .filter((s) => s.placeId)
    .map((s) => `${ROLE_CODE[s.role]}:${s.placeId}`)
    .join(",");
  const params = new URLSearchParams();
  params.set("day", day);
  const t = title?.trim();
  if (t) params.set("dt", t.slice(0, 80));
  return `/?${params.toString()}`;
}

export function dayShareUrl(
  stops: { role: DayRole; placeId: string }[],
  title?: string,
): string {
  return absoluteUrl(daySharePath(stops, title));
}

export function parseDayShareSearch(
  search: string,
): { stops: SharedDayStop[]; title: string | null } | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const day = params.get("day")?.trim();
  if (!day) return null;
  const stops: SharedDayStop[] = [];
  for (const part of day.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const colon = token.indexOf(":");
    if (colon <= 0) continue;
    const code = token.slice(0, colon);
    const placeId = token.slice(colon + 1).trim();
    const role = CODE_ROLE[code];
    if (!role || !placeId) continue;
    stops.push({ role, placeId });
  }
  if (stops.length === 0) return null;
  return { stops, title: params.get("dt")?.trim() || null };
}

export function tripBriefFromSharedPlaces(
  entries: { role: DayRole; place: MapPlace }[],
  title: string | null,
): TripBrief | null {
  if (entries.length === 0) return null;
  const origin = { lat: entries[0].place.lat, lng: entries[0].place.lng };
  const draft: BriefStop[] = entries.map((e) => ({
    place: e.place,
    role: e.role,
    access: placeAccess(e.place, origin),
    verdict: placeVerdict(e.place),
    kmFromPrev: 0,
    filler: false,
    label: "",
    alternates: [],
  }));
  const stops = rechainBriefStops(draft, origin);
  const anchorName =
    title?.trim() ||
    entries[0].place.city_name ||
    entries[0].place.name;
  return {
    shape: "day",
    anchorName,
    wishLabels: [],
    day: true,
    origin,
    stops,
  };
}

/** Drop day share params from the current URL without reload. */
export function clearDayShareFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("day") && !url.searchParams.has("dt")) return;
  url.searchParams.delete("day");
  url.searchParams.delete("dt");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next || "/");
}
