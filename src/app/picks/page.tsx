import Link from "next/link";
import { connection } from "next/server";
import { listPlacePicks } from "@/db/map-query";
import type { PlacePickCollection } from "@/db/schema";
import { displayName } from "@/i18n/display-name";
import { categoryColor } from "@/lib/categories";

const COLLECTIONS: {
  id: PlacePickCollection;
  title: string;
  blurb: string;
}[] = [
  {
    id: "pn-picks",
    title: "풍경너머 픽",
    blurb: "에디터가 골라 둔 가볼 만한 장소. 좋아요와 후기가 쌓이면 더 늘어나요.",
  },
  {
    id: "pn-cafe",
    title: "좋은 카페",
    blurb: "분위기·커피·자리가 괜찮은 카페를 모았습니다.",
  },
];

export default async function PicksPage() {
  await connection();
  const all = listPlacePicks();

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% 0%, #b9e0f7 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, #e8f6fd 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 md:text-5xl">
            픽
          </h1>
          <Link
            href="/"
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
          >
            지도로 돌아가기
          </Link>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
          내부 좋아요·에디터 추천을 모아 두는 공간입니다. 지도에서 하트를 누르면 순위에 조금 반영되고, 여기
          리스트는 앞으로 더 채울 예정이에요.
        </p>

        <div className="mt-10 space-y-12">
          {COLLECTIONS.map((col) => {
            const items = all.filter((c) => c.collection === col.id);
            return (
              <section key={col.id}>
                <h2 className="text-xl font-bold text-stone-900">{col.title}</h2>
                <p className="mt-1 text-sm text-stone-500">{col.blurb}</p>
                {items.length === 0 ? (
                  <p className="mt-4 text-sm text-stone-400">아직 담긴 장소가 없어요.</p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {items.map((item) => {
                      const color = categoryColor[item.place.category];
                      return (
                        <li key={`${item.collection}:${item.place.id}`}>
                          <Link
                            href={`/?q=${encodeURIComponent(item.place.name)}`}
                            className="flex gap-3 rounded-2xl bg-white/80 p-3.5 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
                          >
                            <span
                              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                              style={{ background: color }}
                            >
                              {item.rank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-semibold text-stone-900">
                                  {displayName(item.place, "ko")}
                                </p>
                                {item.place.like_count > 0 && (
                                  <span className="text-[11px] tabular-nums text-rose-600">
                                    ♥ {item.place.like_count}
                                  </span>
                                )}
                              </div>
                              {item.note && (
                                <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{item.note}</p>
                              )}
                              <p className="mt-1 text-[11px] text-stone-400">
                                {item.place.city_name ?? ""}
                                {item.place.city_name && item.place.district_name ? " · " : ""}
                                {item.place.district_name ?? ""}
                                {` · 후기 ${item.place.source_count}`}
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
      </div>
    </main>
  );
}
