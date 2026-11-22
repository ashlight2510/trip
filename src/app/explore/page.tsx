import type { Metadata } from "next";
import Link from "next/link";
import { SEO_LANDINGS, seoLandingPath } from "@/lib/seo-landings";

export const metadata: Metadata = {
  title: "여행 테마 — 후기 지도로 미리 보기",
  description:
    "강릉 카페, 제주 해변, 서울 카페·한옥, 부산 해변, 경주 유적까지. 풍경너머 테마별 후기 지도 모음.",
  alternates: { canonical: "https://trip.funnyfunny.cloud/explore/" },
  openGraph: {
    title: "여행 테마 — 후기 지도로 미리 보기",
    description: "테마별 후기 지도 모음. 고른 뒤 지도·하루 코스로 이어 가세요.",
    url: "https://trip.funnyfunny.cloud/explore/",
    type: "website",
    locale: "ko_KR",
    siteName: "풍경너머",
    images: [{ url: "/logo-brand.png", width: 512, height: 512, alt: "풍경너머" }],
  },
};

export default function ExploreIndexPage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머 · EXPLORE</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl text-stone-900 md:text-5xl">여행 테마</h1>
          <Link
            href="/"
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800"
          >
            지도로 돌아가기
          </Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          검색으로 많이 찾는 여행만 깊게 모았습니다. 고른 뒤 지도·하루 코스로 이어 가세요.
        </p>
        <ul className="mt-8 space-y-3">
          {SEO_LANDINGS.map((l) => (
            <li key={l.slug}>
              <Link
                href={seoLandingPath(l.slug)}
                className="block rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
              >
                <p className="text-base font-semibold text-stone-900">{l.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">{l.description}</p>
                <p className="mt-2 text-[11px] text-stone-400">{l.keywords.slice(0, 3).join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
