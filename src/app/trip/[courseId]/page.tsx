import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripExperience } from "@/components/trip-experience";
import { getCourse, listCourses } from "@/db/repo";

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  return (await listCourses()).map((c) => ({ courseId: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/trip/[courseId]">): Promise<Metadata> {
  const { courseId } = await params;
  const view = await getCourse(courseId);
  return { title: view ? `${view.course.title} · 풍경너머` : "풍경너머" };
}

export default function TripPage({ params }: PageProps<"/trip/[courseId]">) {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-black" />}>
      <Trip params={params} />
    </Suspense>
  );
}

async function Trip({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const view = await getCourse(courseId);
  if (!view || view.stops.length === 0) notFound();
  return <TripExperience view={view} />;
}
