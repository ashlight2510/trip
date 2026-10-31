"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window` — never SSR this stage. */
export const MapTravelStage = dynamic(
  () => import("./map-travel-stage").then((m) => m.MapTravelStage),
  { ssr: false },
);
