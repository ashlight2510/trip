"use client";

import { track } from "@/lib/track";
import { useLocale } from "@/i18n/locale";

const KIT = [
  {
    href: "https://funnyfunny.cloud/tools/n/",
    ko: "N빵 계산",
    en: "Split bill",
    emoji: "🍽️",
  },
  {
    href: "https://funnyfunny.cloud/tools/weather/",
    ko: "날씨",
    en: "Weather",
    emoji: "🌤️",
  },
  {
    href: "https://funnyfunny.cloud/tools/datecalc/",
    ko: "D-day",
    en: "D-day",
    emoji: "📅",
  },
  {
    href: "https://funnyfunny.cloud/tools/exchange/",
    ko: "환율",
    en: "FX",
    emoji: "💱",
  },
] as const;

/** Cross-sell strip: trip intent → FunnyFunny utility tools. */
export function TravelKit({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const isKo = locale !== "en";

  return (
    <div className={`rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-3 py-2.5 ${className}`}>
      <p className="text-[11px] font-semibold text-stone-600">
        {isKo ? "여행 준비 키트" : "Trip kit"}
        <span className="ml-1.5 font-normal text-stone-400">
          {isKo ? "풍경너머 → FunnyFunny" : "Beyond the View → FunnyFunny"}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {KIT.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("travel_kit_click", { href: item.href })}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"
          >
            <span aria-hidden>{item.emoji}</span>
            {isKo ? item.ko : item.en}
          </a>
        ))}
      </div>
    </div>
  );
}
