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
      images: [{ url: "/logo-brand.png", width: 512, height: 512, alt: "풍경너머" }],
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

  const url = `https://trip.funnyfunny.cloud${seoLandingPath(landing.slug)}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landing.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const webLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: landing.title,
    description: landing.description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "풍경너머",
      url: "https://trip.funnyfunny.cloud/",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webLd) }}
      />
      <ExploreLanding landing={landing} />
    </>
  );
}
