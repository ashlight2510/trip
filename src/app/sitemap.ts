import type { MetadataRoute } from "next";
import { getAllSeoPlaceIds, placeSeoPath } from "@/lib/indexed-places";
import { SEO_LANDINGS, seoLandingPath } from "@/lib/seo-landings";

const ORIGIN = "https://trip.funnyfunny.cloud";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core: MetadataRoute.Sitemap = [
    { url: `${ORIGIN}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${ORIGIN}/explore/`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${ORIGIN}/p/`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ORIGIN}/picks/`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${ORIGIN}/vlog/`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${ORIGIN}/christmas/`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
  const landings = SEO_LANDINGS.map((l) => ({
    url: `${ORIGIN}${seoLandingPath(l.slug)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));
  const places = getAllSeoPlaceIds().map((id) => ({
    url: `${ORIGIN}${placeSeoPath(id)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...core, ...landings, ...places];
}
