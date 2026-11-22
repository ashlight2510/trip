"use client";

import Link from "next/link";
import { AffiliateCta } from "@/components/affiliate-cta";
import { ShareButton } from "@/components/share-button";
import { TravelKit } from "@/components/travel-kit";
import { categoryColor } from "@/lib/categories";
import { placeSeoPath } from "@/lib/seo-paths";
import { absoluteUrl } from "@/lib/site";
import { track } from "@/lib/track";
import { useEffect } from "react";

export type PlaceSeoCard = {
  id: string;
  name: string;
  category: string;
  city_name: string | null;
  district_name: string | null;
  address: string | null;
  source_count: number;
  is_pick: boolean;
  sources: { id: string; type: string; title: string; url: string }[];
};

export function PlaceSeoView({
  place,
  themeHref,
  themeLabel,
}: {
  place: PlaceSeoCard;
  themeHref: string;
  themeLabel: string;
}) {
  useEffect(() => {
    track("place_seo_view", { place_id: place.id });
  }, [place.id]);

  const pageUrl = absoluteUrl(placeSeoPath(place.id));
  const mapHref = `/?q=${encodeURIComponent(place.name)}`;
  const color = categoryColor[place.category as keyof typeof categoryColor] ?? "#78716c";

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-5 pb-8 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머 · PLACE</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-stone-500">
              {[place.city_name, place.district_name].filter(Boolean).join(" · ")}
            </p>
            <h1 className="font-display mt-1 text-3xl leading-tight text-stone-900 md:text-4xl">
              {place.name}
            </h1>
            {place.address ? (
              <p className="mt-1 text-xs text-stone-500">{place.address}</p>
            ) : null}
          </div>
          <ShareButton
            compact
            label="공유"
            copiedLabel="복사됨"
            title={`${place.name} · 풍경너머`}
            text={`${place.name} — 후기 지도로 미리 보기`}
            url={pageUrl}
            event="share_place"
            eventProps={{ place_id: place.id, from: "seo" }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: color }}
          >
            {place.category}
          </span>
          {place.is_pick ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
              픽
            </span>
          ) : null}
          {place.source_count > 0 ? (
            <span className="text-[11px] text-stone-500">후기 {place.source_count}</span>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          가기 전에 블로그·유튜브 후기를 지도와 함께 확인하세요. 원문은 링크로만 연결합니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={mapHref}
            onClick={() => track("place_seo_open_map", { place_id: place.id })}
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
          >
            지도에서 보기
          </Link>
          <Link
            href={`/trip/place/?id=${encodeURIComponent(place.id)}`}
            onClick={() => track("place_seo_solo", { place_id: place.id })}
            className="rounded-full bg-[#1b4965] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#163a52]"
          >
            나홀로 거리뷰
          </Link>
          <Link
            href={themeHref}
            className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
          >
            {themeLabel}
          </Link>
        </div>

        <AffiliateCta className="mt-3" placeName={place.name} cityName={place.city_name} />
        <TravelKit className="mt-4" />

        <section className="mt-10">
          <h2 className="text-lg font-bold text-stone-900">연결된 후기</h2>
          {place.sources.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">아직 등록된 링크가 없어요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {place.sources.map((src, i) => (
                <li key={src.id} className="rounded-xl border border-stone-200/90 bg-white px-3 py-2.5 shadow-sm">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block hover:opacity-85"
                    onClick={() =>
                      track("open_review", {
                        place_id: place.id,
                        source_id: src.id,
                        type: src.type,
                        from: "seo",
                      })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                        {i + 1}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                        {src.type}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-stone-900">
                      {src.title}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#1b4965]">원문 보기 →</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
