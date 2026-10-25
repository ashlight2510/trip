import { Suspense } from "react";
import { connection } from "next/server";
import { MapExplorerClient } from "@/components/map-explorer-client";
import { listMapAreas, listMapPlaces } from "@/db/repo";

async function MapHome() {
  await connection();
  const [places, areas] = await Promise.all([listMapPlaces(), listMapAreas()]);
  return <MapExplorerClient places={places} areas={areas} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="grid h-dvh place-items-center bg-[#f7f5f1] text-sm text-stone-500">지도를 불러오는 중…</div>}
    >
      <MapHome />
    </Suspense>
  );
}
