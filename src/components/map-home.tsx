"use client";

import { useEffect, useState } from "react";
import type { MapArea } from "@/db/repo";
import { MapExplorerClient } from "@/components/map-explorer-client";
import { listStaticAreas } from "@/lib/static-map-data";

export function MapHome() {
  const [areas, setAreas] = useState<MapArea[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listStaticAreas()
      .then(setAreas)
      .catch((err) => setError(err instanceof Error ? err.message : "areas load failed"));
  }, []);

  if (error) {
    return (
      <div className="grid h-dvh place-items-center bg-[var(--background)] px-4 text-center text-sm text-stone-600">
        지도 데이터를 불러오지 못했습니다. `yarn data:static` 후 다시 열어 주세요.
        <span className="mt-2 block text-xs text-stone-400">{error}</span>
      </div>
    );
  }

  if (!areas) {
    return (
      <div className="grid h-dvh place-items-center bg-[var(--background)] text-sm text-stone-500">
        Loading map…
      </div>
    );
  }

  return <MapExplorerClient areas={areas} />;
}
