import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripExperience } from "@/components/trip-experience";
import { courses, findCourse } from "@/data/courses";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return courses.map((c) => ({ courseId: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/trip/[courseId]">): Promise<Metadata> {
  const { courseId } = await params;
  const course = findCourse(courseId);
  return { title: course ? `${course.title} · 풍경너머` : "풍경너머" };
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
  const course = findCourse(courseId);
  if (!course) notFound();
  return <TripExperience course={course} />;
}
