import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExploreLanding } from "@/components/explore-landing";
import { getSeoLanding, SEO_LANDINGS, seoLandingPath } from "@/lib/seo-landings";

export function generateStaticParams() {
  return SEO_LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const landing = getSeoLanding(slug);
  if (!landing) return { title: "풍경너머" };
  const url = `https://trip.funnyfunny.cloud${seoLandingPath(landing.slug)}`;
  return {
    title: landing.title,
    description: landing.description,
    keywords: landing.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url,
      type: "website",
      locale: "ko_KR",
      siteName: "풍경너머",
    },
  };
}

export default async function ExploreSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = getSeoLanding(slug);
  if (!landing) notFound();
  return <ExploreLanding landing={landing} />;
}
