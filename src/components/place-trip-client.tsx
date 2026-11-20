"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TripExperience } from "@/components/trip-experience";
import type { CourseView, MapPlaceSource, StopView } from "@/db/repo";
import type { Course, Place, Region } from "@/db/schema";
import { getStaticPlace, type StaticPlace } from "@/lib/static-map-data";

function toCourseView(place: StaticPlace): CourseView {
  const now = new Date().toISOString();
  const rawPlace: Place = {
    id: place.id,
    name: place.name,
    name_en: place.name_en,
    category: place.category as Place["category"],
    region_id: place.region_id,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    description: place.description,
    tags: place.tags,
    view_heading: place.view_heading ?? null,
    palette: place.palette ?? null,
    created_at: now,
    updated_at: now,
  };
  const country = place.id.startsWith("kr-") ? "KR" : place.id.startsWith("gu-") ? "GU" : "KR";
  const region: Region | undefined = place.region_name
    ? {
        id: place.region_id,
        name: place.region_name,
        name_en: null,
        level: "district",
        parent_id: place.city_id,
        country_code: country,
        lat: place.lat,
        lng: place.lng,
      }
    : undefined;
  const course: Course = {
    id: `solo-${place.id}`,
    title: `${place.name} · 나홀로 여행`,
    subtitle: place.city_name ? `${place.city_name}에서 먼저 서 보기` : "로드뷰로 그 자리에 서 보기",
    country_code: country,
    cover: place.palette ?? ["#1b4965", "#5fa8a3"],
    visibility: "unlisted",
    created_at: now,
    updated_at: now,
  };
  const sources: MapPlaceSource[] = (place.sources ?? []).map((src, i) => ({
    id: src.id,
    type: src.type as MapPlaceSource["type"],
    title: src.title,
    url: src.url,
    author: null,
    provider: src.provider,
    published_at: null,
    snippet: null,
    relevance: 1,
    rank: src.rank ?? i + 1,
    score: null,
    view_count: src.view_count ?? null,
    boost: 0,
    community_score: 0,
  }));
  const stop: StopView = {
    place: rawPlace,
    region,
    heading: place.view_heading ?? 0,
    tip: "드래그해서 둘러보세요. 후기는 원문 링크로 이어집니다.",
    searchQuery: place.search_query,
    soundscape: [],
    media: [],
    sources,
  };
  return { course, stops: [stop] };
}

export function PlaceTripClient() {
  const params = useSearchParams();
  const placeId = useMemo(() => params.get("id")?.trim() || "", [params]);
  const [view, setView] = useState<CourseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!placeId) {
      setLoading(false);
      setError("장소 id가 없습니다.");
      return;
    }
    setLoading(true);
    void getStaticPlace(placeId)
      .then((place) => {
        if (!place) {
          setError("장소를 찾을 수 없습니다.");
          setView(null);
          return;
        }
        setView(toCourseView(place));
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "load failed"))
      .finally(() => setLoading(false));
  }, [placeId]);

  if (loading) return <main className="h-dvh w-full bg-black" />;
  if (error || !view) {
    return (
      <main className="grid h-dvh place-items-center bg-black px-4 text-center text-sm text-white/70">
        {error ?? "장소를 열 수 없습니다."}
      </main>
    );
  }
  return <TripExperience view={view} preferRoadview />;
}
