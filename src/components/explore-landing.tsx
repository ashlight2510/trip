"use client";

import Link from "next/link";
import { categoryColor } from "@/lib/categories";
import type { LandingPlaceCard } from "@/lib/seo-landing-places";
import type { SeoLanding } from "@/lib/seo-landings";
import { relatedLandings, seoLandingPath } from "@/lib/seo-landings";
import { AffiliateCta } from "@/components/affiliate-cta";
import { ShareButton } from "@/components/share-button";
import { TravelKit } from "@/components/travel-kit";
import { placeSeoPath } from "@/lib/indexed-places";
import { absoluteUrl, placeShareUrl } from "@/lib/site";
import { track } from "@/lib/track";
import { useEffect } from "react";

export function ExploreLanding({
  landing,
  places,
}: {
  landing: SeoLanding;
  places: LandingPlaceCard[];
}) {
  useEffect(() => {
    track("explore_landing_view", { slug: landing.slug });
  }, [landing.slug]);

  const mapHref = `/?q=${encodeURIComponent(landing.keywords[0] ?? landing.title)}`;
  const pageUrl = absoluteUrl(seoLandingPath(landing.slug));
  const related = relatedLandings(landing);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머 · EXPLORE</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display max-w-xl text-3xl leading-tight text-stone-900 md:text-4xl">
            {landing.title}
          </h1>
          <ShareButton
            compact
            label="공유"
            copiedLabel="복사됨"
            title={landing.title}
            text={landing.description}
            url={pageUrl}
            event="share_landing"
            eventProps={{ slug: landing.slug }}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{landing.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={mapHref}
            onClick={() => track("explore_open_map", { slug: landing.slug })}
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
          >
            지도에서 보기
          </Link>
          <Link
            href="/"
            className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
          >
            전체 지도
          </Link>
          <Link
            href="/explore/"
            className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
          >
            다른 여행 테마
          </Link>
        </div>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-bold text-stone-900">이렇게 쓰면 좋아요</h2>
          {landing.guide.map((p) => (
            <p key={p} className="text-sm leading-relaxed text-stone-600">
              {p}
            </p>
          ))}
        </section>

        <TravelKit className="mt-5" />
        <AffiliateCta
          className="mt-3"
          placeName={landing.keywords[0] ?? landing.title}
          cityName={(landing.keywords[0] ?? "").split(/\s+/)[0] || null}
        />

        <section className="mt-10">
          <h2 className="text-lg font-bold text-stone-900">추천 장소</h2>
          <p className="mt-1 text-sm text-stone-500">
            후기·픽 우선 · {places.length}곳 (지도에서 더 볼 수 있어요)
          </p>
          {places.length === 0 ? (
            <p className="mt-4 text-sm text-stone-400">아직 모을 장소가 없어요. 지도에서 검색해 보세요.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {places.map((item, rank) => {
                const color = categoryColor[item.category as keyof typeof categoryColor] ?? "#78716c";
                return (
                  <li key={item.id}>
                    <div className="flex gap-3 rounded-2xl bg-white/80 p-3.5 shadow-sm ring-1 ring-stone-200/80">
                      <Link
                        href={placeSeoPath(item.id)}
                        onClick={() =>
                          track("explore_place_click", {
                            slug: landing.slug,
                            place_id: item.id,
                          })
                        }
                        className="flex min-w-0 flex-1 gap-3 hover:opacity-90"
                      >
                        <span
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ background: color }}
                        >
                          {rank + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-stone-900">
                            {item.name}
                            {item.is_pick ? (
                              <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                                픽
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-[11px] text-stone-400">
                            {item.city_name ?? ""}
                            {item.district_name ? ` · ${item.district_name}` : ""}
                            {item.source_count > 0 ? ` · 후기 ${item.source_count}` : ""}
                          </p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <ShareButton
                          compact
                          label="공유"
                          copiedLabel="복사"
                          title={`${item.name} · 풍경너머`}
                          text={`${item.name} — 후기 지도로 미리 보기`}
                          url={placeShareUrl(item.id)}
                          event="share_place"
                          eventProps={{ place_id: item.id, from: "explore" }}
                        />
                        <AffiliateCta placeName={item.name} cityName={item.city_name} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-stone-900">같이 보면 좋은 테마</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={seoLandingPath(r.slug)}
                    className="inline-block rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
                  >
                    {r.keywords[0] ?? r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="text-lg font-bold text-stone-900">자주 묻는 질문</h2>
          <dl className="mt-4 space-y-4">
            {landing.faq.map((item) => (
              <div key={item.q} className="rounded-2xl bg-white/70 p-4 ring-1 ring-stone-200/80">
                <dt className="text-sm font-semibold text-stone-900">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-stone-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
