import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripExperience } from "@/components/trip-experience";
import { getPlaceTrip } from "@/db/repo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeId: string }>;
}): Promise<Metadata> {
  await connection();
  const { placeId } = await params;
  const view = await getPlaceTrip(placeId);
  return { title: view ? `${view.course.title} · 풍경너머` : "나홀로 여행 · 풍경너머" };
}

export default function PlaceTripPage({ params }: { params: Promise<{ placeId: string }> }) {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-black" />}>
      <PlaceTrip params={params} />
    </Suspense>
  );
}

async function PlaceTrip({ params }: { params: Promise<{ placeId: string }> }) {
  await connection();
  const { placeId } = await params;
  const view = await getPlaceTrip(placeId);
  if (!view || view.stops.length === 0) notFound();
  return <TripExperience view={view} preferRoadview />;
}
