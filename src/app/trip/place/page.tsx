import { Suspense } from "react";
import { PlaceTripClient } from "@/components/place-trip-client";

export const metadata = {
  title: "나홀로 여행 — 거리뷰로 미리 서 보기",
  description: "풍경너머에서 로드뷰로 그 자리에 먼저 서 보세요. 후기 지도에서 고른 장소를 바로 둘러봅니다.",
  openGraph: {
    title: "나홀로 여행 — 거리뷰로 미리 서 보기 · 풍경너머",
    description: "가기 전에 그 자리에 먼저 서 보기.",
  },
};

export default function PlaceTripPage() {
  return (
    <Suspense fallback={<main className="h-dvh w-full bg-black" />}>
      <PlaceTripClient />
    </Suspense>
  );
}
