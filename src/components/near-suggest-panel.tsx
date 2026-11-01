"use client";

import type { MapPlace } from "@/db/repo";
import type { Place } from "@/db/schema";
import { categoryColor, categoryGlyph } from "@/lib/categories";
import {
  formatDistanceKm,
  WANDER_CATEGORIES,
  type WanderMode,
} from "@/lib/near-suggest";
import { haversineM } from "@/lib/travel-mode";
import { displayName } from "@/i18n/display-name";
import { useLocale, useT } from "@/i18n/locale";

type Props = {
  active: boolean;
  mode: WanderMode | null;
  cats: Place["category"][];
  picks: MapPlace[];
  poolSize: number;
  loading: boolean;
  hasGps: boolean;
  origin: { lat: number; lng: number };
  selectedPlaceId: string | null;
  onMode: (mode: WanderMode) => void;
  onToggleCat: (cat: Place["category"]) => void;
  onShuffle: () => void;
  onClose: () => void;
  onEnableLoc: () => void;
  onSelect: (place: MapPlace) => void;
};

const MODES: WanderMode[] = ["walk", "drive5", "drive10"];

function modeLabel(t: ReturnType<typeof useT>, mode: WanderMode) {
  if (mode === "walk") return t.nearSuggestWalk;
  if (mode === "drive5") return t.nearSuggestDrive5;
  return t.nearSuggestDrive10;
}

export function NearSuggestPanel({
  active,
  mode,
  cats,
  picks,
  poolSize,
  loading,
  hasGps,
  origin,
  selectedPlaceId,
  onMode,
  onToggleCat,
  onShuffle,
  onClose,
  onEnableLoc,
  onSelect,
}: Props) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <section className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-stone-200" aria-label={t.nearSuggestTitle}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-stone-900">{t.nearSuggestTitle}</h2>
        {active && (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-stone-500 hover:text-stone-800"
          >
            {t.nearSuggestOff}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t.nearSuggestTitle}>
        {MODES.map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                on ? "bg-stone-900 text-white" : "bg-stone-50 text-stone-600 ring-1 ring-stone-200 hover:bg-white"
              }`}
            >
              {modeLabel(t, m)}
            </button>
          );
        })}
      </div>

      {active && (
        <>
          <p className="mt-2.5 text-[10px] font-medium tracking-wide text-stone-500">{t.nearSuggestCats}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t.nearSuggestCats}>
            {WANDER_CATEGORIES.map((cat) => {
              const on = cats.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onToggleCat(cat)}
                  className={`inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[11px] ${
                    on ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span
                    className="grid size-4 place-items-center rounded-full"
                    style={{ background: on ? "rgba(255,255,255,.18)" : categoryColor[cat] }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[cat]}</svg>`,
                    }}
                  />
                  {t.category[cat]}
                </button>
              );
            })}
          </div>

          {!hasGps ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs text-stone-600">{t.nearSuggestNeedLoc}</p>
              <button
                type="button"
                onClick={onEnableLoc}
                className="rounded-full bg-[#1b4965] px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {t.nearSuggestEnableLoc}
              </button>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onShuffle}
                disabled={loading || poolSize === 0}
                className="rounded-full bg-[#1b4965] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                {t.nearSuggestShuffle}
              </button>
              <span className="text-[11px] text-stone-500">
                {loading
                  ? t.loadingNearby
                  : poolSize > 0
                    ? t.nearSuggestPool(poolSize)
                    : t.nearSuggestEmpty}
              </span>
            </div>
          )}

          {hasGps && picks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {picks.map((place) => {
                const km = haversineM(origin.lat, origin.lng, place.lat, place.lng) / 1000;
                const activeRow = place.id === selectedPlaceId;
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(place)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left ${
                        activeRow ? "bg-stone-900 text-white" : "hover:bg-stone-50"
                      }`}
                    >
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-full"
                        style={{ background: categoryColor[place.category] }}
                        dangerouslySetInnerHTML={{
                          __html: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[place.category]}</svg>`,
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {displayName(place, locale)}
                      </span>
                      <span className={`shrink-0 text-[11px] tabular-nums ${activeRow ? "text-white/70" : "text-stone-500"}`}>
                        {formatDistanceKm(km)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

    </section>
  );
}
