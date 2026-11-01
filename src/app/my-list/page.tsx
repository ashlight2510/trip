import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { peekMyList } from "@/app/actions/place-list";
import { getListPlacesForOwner } from "@/db/place-lists";
import { MyListClient } from "@/components/my-list-client";

function MyListFallback() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
        <h1 className="font-serif mt-2 text-4xl font-semibold tracking-tight md:text-5xl">내 리스트</h1>
        <p className="mt-6 text-sm text-stone-500">불러오는 중…</p>
      </div>
    </main>
  );
}

async function MyListBody() {
  await connection();
  const snap = await peekMyList();
  const places = snap
    ? getListPlacesForOwner(snap.list.id).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        city_name: p.city_name,
        district_name: p.district_name,
        source_count: p.source_count,
        like_count: p.like_count,
      }))
    : [];

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 0% 0%, #b9e0f7 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 100% 5%, #e8f6fd 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 pb-16 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">내 리스트</h1>
          <div className="flex gap-2">
            <Link
              href="/picks"
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-white/70"
            >
              픽
            </Link>
            <Link
              href="/"
              className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
            >
              지도
            </Link>
          </div>
        </div>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600">
          가고 싶은 장소를 모아 두고, 원할 때 링크로 공유하세요. 이 브라우저에만 연결된 내 공간입니다.
        </p>
        <div className="mt-8">
          <MyListClient initialPlaces={places} />
        </div>
      </div>
    </main>
  );
}

export default function MyListPage() {
  return (
    <Suspense fallback={<MyListFallback />}>
      <MyListBody />
    </Suspense>
  );
}
