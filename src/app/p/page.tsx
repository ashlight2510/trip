import type { Metadata } from "next";
import Link from "next/link";
import { getIndexedPlaces, placeSeoPath } from "@/lib/indexed-places";

export const metadata: Metadata = {
  title: "후기 많은 장소 — 지도로 미리 보기",
  description:
    "후기가 많은 여행 장소를 풍경너머에서 모았습니다. 고른 뒤 지도·거리뷰로 이어 가세요.",
  alternates: { canonical: "https://trip.funnyfunny.cloud/p/" },
};

export default function IndexedPlacesPage() {
  const places = getIndexedPlaces(80);
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머 · PLACES</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl text-stone-900 md:text-5xl">후기 많은 장소</h1>
          <Link
            href="/explore/"
            className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
          >
            여행 테마
          </Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          검색·공유용으로 후기가 붙은 장소를 먼저 모아 두었습니다.
        </p>
        <ol className="mt-8 space-y-2">
          {places.map((p, i) => (
            <li key={p.id}>
              <Link
                href={placeSeoPath(p.id)}
                className="flex gap-3 rounded-2xl bg-white/80 p-3.5 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    {[p.city_name, p.category, p.source_count ? `후기 ${p.source_count}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
