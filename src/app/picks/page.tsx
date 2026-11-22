"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryColor } from "@/lib/categories";
import { loadStaticBundle, type StaticPlace } from "@/lib/static-map-data";

const COLLECTIONS: {
  id: string;
  title: string;
  blurb: string;
}[] = [
  {
    id: "pn-picks",
    title: "풍경너머 픽",
    blurb: "에디터가 골라 둔 가볼 만한 장소.",
  },
  {
    id: "pn-cafe",
    title: "좋은 카페",
    blurb: "전국에서 골라 둔 카페.",
  },
  {
    id: "pn-guam",
    title: "괌 여행 픽",
    blurb: "투몬 산책부터 남부 드라이브까지.",
  },
];

export default function PicksPage() {
  const [places, setPlaces] = useState<StaticPlace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadStaticBundle()
      .then((b) => setPlaces(b.places.filter((p) => (p as StaticPlace & { pick_collections?: string[] }).pick_collections?.length)))
      .finally(() => setReady(true));
  }, []);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl text-stone-900 md:text-5xl">픽</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/explore/"
              className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
            >
              여행 테마
            </Link>
            <Link
              href="/"
              className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
            >
              지도로 돌아가기
            </Link>
          </div>
        </div>
        {!ready ? (
          <p className="mt-6 text-sm text-stone-500">불러오는 중…</p>
        ) : (
          <div className="mt-10 space-y-12">
            {COLLECTIONS.map((col) => {
              const items = places.filter((p) =>
                ((p as StaticPlace & { pick_collections?: string[] }).pick_collections ?? []).includes(col.id),
              );
              return (
                <section key={col.id}>
                  <h2 className="text-xl font-bold text-stone-900">{col.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">{col.blurb}</p>
                  {items.length === 0 ? (
                    <p className="mt-4 text-sm text-stone-400">아직 담긴 장소가 없어요.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {items.map((item, rank) => {
                        const color = categoryColor[item.category as keyof typeof categoryColor] ?? "#78716c";
                        return (
                          <li key={`${col.id}:${item.id}`}>
                            <Link
                              href={`/?q=${encodeURIComponent(item.name)}`}
                              className="flex gap-3 rounded-2xl bg-white/80 p-3.5 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
                            >
                              <span
                                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                                style={{ background: color }}
                              >
                                {rank + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-stone-900">{item.name}</p>
                                <p className="mt-1 text-[11px] text-stone-400">
                                  {item.city_name ?? ""}
                                  {item.city_name && item.district_name ? " · " : ""}
                                  {item.district_name ?? ""}
                                  {item.source_count > 0 ? ` · 후기 ${item.source_count}` : ""}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
