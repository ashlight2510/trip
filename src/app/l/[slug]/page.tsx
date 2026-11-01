import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getSharedListBySlug } from "@/db/place-lists";
import { displayName } from "@/i18n/display-name";
import { categoryColor } from "@/lib/categories";

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const view = getSharedListBySlug(slug);
  if (!view) notFound();

  return (
    <main className="min-h-dvh bg-[#f3efe6] text-stone-900">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 10% 0%, #d9e6df 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 90% 8%, #e8dcc8 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머 · 공유 리스트</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">{view.list.title}</h1>
          <Link
            href="/"
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
          >
            지도에서 보기
          </Link>
        </div>
        <p className="mt-3 text-sm text-stone-500">
          {view.places.length}곳 · 업데이트 {new Date(view.list.updated_at).toLocaleDateString("ko-KR")}
        </p>

        {view.places.length === 0 ? (
          <p className="mt-8 text-sm text-stone-500">아직 담긴 장소가 없어요.</p>
        ) : (
          <ol className="mt-8 space-y-3">
            {view.places.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/?q=${encodeURIComponent(place.name)}`}
                  className="flex gap-3 rounded-2xl bg-white/85 p-3.5 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
                >
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: categoryColor[place.category] }}
                  >
                    {place.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-stone-900">
                      {displayName(place, "ko")}
                    </p>
                    {place.note && (
                      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{place.note}</p>
                    )}
                    <p className="mt-1 text-[11px] text-stone-400">
                      {[place.city_name, place.district_name].filter(Boolean).join(" · ")}
                      {` · 후기 ${place.source_count}`}
                      {place.like_count > 0 ? ` · ♥ ${place.like_count}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
