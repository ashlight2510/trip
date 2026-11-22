import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceSeoView } from "@/components/place-seo-view";
import { getAllSeoPlaceIds, placeSeoPath } from "@/lib/indexed-places";
import { getStaticPlaceById } from "@/lib/static-places-file";
import { SEO_LANDINGS, seoLandingPath } from "@/lib/seo-landings";

export function generateStaticParams() {
  return getAllSeoPlaceIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const place = getStaticPlaceById(id);
  if (!place) return { title: "풍경너머" };
  const title = `${place.name} — 후기 지도로 미리 보기`;
  const description = [
    place.city_name,
    place.district_name,
    place.source_count > 0 ? `후기 ${place.source_count}개` : null,
    "풍경너머에서 블로그·유튜브 후기와 지도를 함께 보세요.",
  ]
    .filter(Boolean)
    .join(" · ");
  const url = `https://trip.funnyfunny.cloud${placeSeoPath(place.id)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "ko_KR",
      siteName: "풍경너머",
      images: [{ url: "/logo-brand.png", width: 512, height: 512, alt: place.name }],
    },
  };
}

export default async function PlaceSeoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const place = getStaticPlaceById(id);
  if (!place) notFound();

  const relatedTheme = SEO_LANDINGS.find(
    (l) => l.cityId && l.cityId === place.city_id && l.category === place.category,
  ) ?? SEO_LANDINGS.find((l) => l.cityId === place.city_id && !l.category);

  const url = `https://trip.funnyfunny.cloud${placeSeoPath(place.id)}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name,
    description: `${place.name} 후기·지도 — 풍경너머`,
    url,
    address: place.address
      ? { "@type": "PostalAddress", streetAddress: place.address, addressCountry: "KR" }
      : undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lng,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <PlaceSeoView
        place={place}
        themeHref={relatedTheme ? seoLandingPath(relatedTheme.slug) : "/explore/"}
        themeLabel={relatedTheme?.keywords[0] ?? "여행 테마"}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <p className="text-xs text-stone-400">
          <Link href="/explore/" className="underline-offset-2 hover:underline">
            여행 테마
          </Link>
          {" · "}
          <Link href="/p/" className="underline-offset-2 hover:underline">
            후기 많은 장소
          </Link>
        </p>
      </div>
    </>
  );
}
