"use client";

import dynamic from "next/dynamic";
import type { MapArea } from "@/db/repo";

const MapExplorer = dynamic(
  () => import("@/components/map-explorer").then((m) => m.MapExplorer),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-dvh place-items-center bg-[var(--background)] text-sm text-stone-500">지도를 불러오는 중…</div>
    ),
  },
);

export function MapExplorerClient({ areas }: { areas: MapArea[] }) {
  return <MapExplorer areas={areas} />;
}
