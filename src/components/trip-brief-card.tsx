"use client";

import { useState } from "react";
import type { MapPlace } from "@/db/repo";
import { categoryColor, categoryGlyph } from "@/lib/categories";
import type { BriefStop, TripBrief } from "@/lib/trip-brief";
import type { AccessMode, DayRole, Verdict } from "@/lib/day-plan";
import { formatDistanceKm } from "@/lib/near-suggest";
import { displayName } from "@/i18n/display-name";
import { useLocale, useT } from "@/i18n/locale";
import { ShareButton } from "@/components/share-button";
import { absoluteUrl } from "@/lib/site";

export function TripBriefCard({
  brief,
  stops,
  onSwap,
  onSave,
  onSelect,
}: {
  brief: TripBrief;
  stops: BriefStop[];
  onSwap: (index: number) => void;
  onSave: () => void;
  onSelect: (place: MapPlace) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [savedFlash, setSavedFlash] = useState(false);
  const wish = brief.wishLabels.join(", ");
  const tail = wish || (brief.day ? t.briefDay : "");
  const title = tail ? `${brief.anchorName} · ${tail}` : brief.anchorName;
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
    <section className="rounded-2xl bg-white/85 p-3 ring-1 ring-stone-200">
      <h2 className="text-[13px] font-semibold text-stone-900">{title}</h2>
      <ol className="mt-2 space-y-1">
        {stops.map((stop, index) => {
          const role = roleLabel[stop.role];
          const head = stop.label && stop.label !== role ? `${role} · ${stop.label}` : role;
          return (
            <li key={`${stop.role}-${stop.place.id}`}>
              <div className={`flex items-center gap-1 ${stop.filler ? "opacity-60" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(stop.place)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1.5 text-left hover:bg-stone-50"
                >
                  <span className="w-4 shrink-0 text-[11px] font-semibold text-stone-400">{index + 1}</span>
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full"
                    style={{ background: categoryColor[stop.place.category] }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[stop.place.category]}</svg>`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-stone-900">
                      {displayName(stop.place, locale)}
                    </span>
                    <span className="block truncate text-[10px] text-stone-500">
                      {head} · {accessLabel[stop.access]} · {verdictLabel[stop.verdict]} ·{" "}
                      {formatDistanceKm(stop.kmFromPrev)}
                      {stop.filler ? ` · ${t.briefFiller}` : ""}
                    </span>
                  </span>
                </button>
                {stop.alternates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSwap(index)}
                    className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
                  >
                    {t.briefSwap}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onSave();
            setSavedFlash(true);
            window.setTimeout(() => setSavedFlash(false), 1600);
          }}
          className="text-[11px] font-semibold text-[#1b4965] hover:underline"
        >
          {savedFlash ? t.briefSaved : t.briefSave}
        </button>
        <ShareButton
          compact
          label={t.shareDay}
          copiedLabel={t.shareDayCopied}
          title={title}
          text={t.shareDayText(
            title,
            stops
              .map(
                (s, i) =>
                  `${i + 1}. ${roleLabel[s.role]} · ${displayName(s.place, locale)}`,
              )
              .join("\n"),
          )}
          url={absoluteUrl("/")}
          event="share_day"
          eventProps={{ stops: stops.length, anchor: brief.anchorName }}
        />
      </div>
    </section>
  );
}
