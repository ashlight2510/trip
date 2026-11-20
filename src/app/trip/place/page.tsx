import { Suspense } from "react";
import { PlaceTripClient } from "@/components/place-trip-client";

export const metadata = {
  title: "나홀로 여행 · 풍경너머",
  description: "로드뷰로 그 자리에 먼저 서 보기",
};

export default function PlaceTripPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-black" />}>
      <PlaceTripClient />
    </Suspense>
  );
}
