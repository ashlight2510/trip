"use client";

import { useEffect, useState } from "react";
import type { MapPlace } from "@/db/repo";
import { categoryColor, categoryGlyph } from "@/lib/categories";
import { buildDayPlan, type AccessMode, type DayRole, type DayStop, type Verdict } from "@/lib/day-plan";
import { formatDistanceKm } from "@/lib/near-suggest";
import { fetchPlaces } from "@/lib/map-fetch";
import { displayName } from "@/i18n/display-name";
import { useLocale, useT } from "@/i18n/locale";
import {
  TRIP_BOARD_EVENT,
  loadTripBoard,
  writeTripBoard,
  type TripBoardState,
  type TripBoardStop,
} from "@/lib/trip-board-storage";

export function TripBoard({
  origin,
  hasGps,
  onSelect,
}: {
  origin: { lat: number; lng: number };
  hasGps: boolean;
  onSelect: (place: MapPlace) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [date, setDate] = useState("");
  const [draft, setDraft] = useState<DayStop[]>([]);
  const [saved, setSaved] = useState<TripBoardStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const trip = loadTripBoard();
    setDate(trip.date);
    setSaved(trip.stops);
    setReady(true);
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<TripBoardState>).detail;
      if (!detail?.date || !Array.isArray(detail.stops)) return;
      setDate(detail.date);
      setSaved(detail.stops);
    };
    window.addEventListener(TRIP_BOARD_EVENT, onChange);
    return () => window.removeEventListener(TRIP_BOARD_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!ready || !date) return;
    writeTripBoard({ date, stops: saved }, false);
  }, [date, saved, ready]);

  async function makeDay() {
    setLoading(true);
    try {
      const pool = await fetchPlaces({
        lat: origin.lat,
        lng: origin.lng,
        radiusKm: hasGps ? 20 : 40,
        limit: 250,
      });
      setDraft(buildDayPlan(pool, origin));
    } catch (e) {
      console.error(e);
      setDraft([]);
    } finally {
      setLoading(false);
    }
  }

  function keepDay() {
    setSaved(
      draft.map((stop) => ({
        id: stop.place.id,
        name: stop.place.name,
        name_en: stop.place.name_en,
        lat: stop.place.lat,
        lng: stop.place.lng,
        category: stop.place.category,
        role: stop.role,
        access: stop.access,
        verdict: stop.verdict,
      })),
    );
  }

  const roleLabel: Record<DayRole, string> = {
    morning: t.dayMorning,
    lunch: t.dayLunch,
    afternoon: t.dayAfternoon,
    sunset: t.daySunset,
  };
  const accessLabel: Record<AccessMode, string> = {
    walk: t.accessWalk,
    drive: t.accessDrive,
    indoor: t.accessIndoor,
  };
  const verdictLabel: Record<Verdict, string> = {
    go: t.verdictGo,
    ok: t.verdictOk,
    skip: t.verdictSkip,
  };

  return (
    <section className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-stone-200">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-stone-900">{t.tripBoardTitle}</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-700"
          aria-label={t.tripBoardDate}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{t.tripBoardHint}</p>
      <button
        type="button"
        onClick={() => void makeDay()}
        disabled={loading}
        className="mt-2 rounded-full bg-[#1b4965] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
      >
        {loading ? t.loadingNearby : t.tripBoardPlan}
      </button>

      {draft.length > 0 && (
        <div className="mt-2">
          <StopList
            rows={draft.map((s) => ({
              key: s.place.id,
              name: displayName(s.place, locale),
              category: s.place.category,
              role: roleLabel[s.role],
              access: accessLabel[s.access],
              verdict: verdictLabel[s.verdict],
              km: formatDistanceKm(s.kmFromPrev),
              onClick: () => onSelect(s.place),
            }))}
          />
          <button
            type="button"
            onClick={keepDay}
            className="mt-2 text-[11px] font-semibold text-[#1b4965] hover:underline"
          >
            {t.tripBoardSave}
          </button>
        </div>
      )}

      {saved.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-2">
          <p className="text-[10px] font-medium tracking-wide text-stone-500">
            {t.tripBoardSaved} · {date}
          </p>
          <ul className="mt-1 space-y-1">
            {saved.map((stop) => (
              <li key={`${stop.role}-${stop.id}`}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      id: stop.id,
                      name: stop.name,
                      name_en: stop.name_en,
                      category: stop.category,
                      lat: stop.lat,
                      lng: stop.lng,
                    } as MapPlace)
                  }
                  className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-stone-50"
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full"
                    style={{ background: categoryColor[stop.category] }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[stop.category]}</svg>`,
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-stone-800">
                    {displayName({ name: stop.name, name_en: stop.name_en }, locale)}
                  </span>
                  <span className="shrink-0 text-[10px] text-stone-500">
                    {roleLabel[stop.role]} · {accessLabel[stop.access]} · {verdictLabel[stop.verdict]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StopList({
  rows,
}: {
  rows: {
    key: string;
    name: string;
    category: MapPlace["category"];
    role: string;
    access: string;
    verdict: string;
    km: string;
    onClick: () => void;
  }[];
}) {
  return (
    <ol className="mt-2 space-y-1">
      {rows.map((row, i) => (
        <li key={row.key}>
          <button
            type="button"
            onClick={row.onClick}
            className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-stone-50"
          >
            <span className="w-4 shrink-0 text-[11px] font-semibold text-stone-400">{i + 1}</span>
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full"
              style={{ background: categoryColor[row.category] }}
              dangerouslySetInnerHTML={{
                __html: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[row.category]}</svg>`,
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-stone-900">{row.name}</span>
              <span className="block text-[10px] text-stone-500">
                {row.role} · {row.access} · {row.verdict} · {row.km}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
