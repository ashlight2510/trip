import type { MapPlace } from "@/db/repo";
import type { AccessMode, DayRole, Verdict } from "@/lib/day-plan";

export const TRIP_BOARD_STORAGE_KEY = "pn-trip-board";
export const TRIP_BOARD_EVENT = "pn-trip-board-change";

export type TripBoardStop = {
  id: string;
  name: string;
  name_en: string | null;
  lat: number;
  lng: number;
  category: MapPlace["category"];
  role: DayRole;
  access: AccessMode;
  verdict: Verdict;
};

export type TripBoardState = { date: string; stops: TripBoardStop[] };

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function loadTripBoard(): TripBoardState {
  const empty = { date: todayISO(), stops: [] as TripBoardStop[] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(TRIP_BOARD_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as TripBoardState;
    if (!parsed?.date || !Array.isArray(parsed.stops)) return empty;
    return parsed;
  } catch {
    return empty;
  }
}

export function writeTripBoard(state: TripBoardState, notify = false) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIP_BOARD_STORAGE_KEY, JSON.stringify(state));
  if (notify) window.dispatchEvent(new CustomEvent(TRIP_BOARD_EVENT, { detail: state }));
}

/** Keep the date already on the board and replace its stops. */
export function saveTripBoardStops(stops: TripBoardStop[]) {
  const prev = loadTripBoard();
  writeTripBoard({ date: prev.date, stops }, true);
}
