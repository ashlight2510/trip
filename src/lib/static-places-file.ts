import "server-only";
import fs from "node:fs";
import path from "node:path";

export type StaticPlaceSource = {
  id: string;
  type: string;
  title: string;
  url: string;
  provider: string;
  rank: number;
  view_count: number | null;
};

export type StaticPlaceRow = {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  lat: number;
  lng: number;
  city_id: string | null;
  city_name: string | null;
  district_id: string | null;
  district_name: string | null;
  address: string | null;
  tags: string[];
  source_count: number;
  like_count: number;
  is_pick: boolean;
  pin_score: number;
  cover_url: string | null;
  sources: StaticPlaceSource[];
};

let cache: StaticPlaceRow[] | null = null;

/** Build-time read of compact places.json (cached per process). */
export function loadStaticPlacesFile(): StaticPlaceRow[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public", "static-data", "places.json");
  cache = JSON.parse(fs.readFileSync(file, "utf8")) as StaticPlaceRow[];
  return cache;
}

export function getStaticPlaceById(id: string): StaticPlaceRow | undefined {
  return loadStaticPlacesFile().find((p) => p.id === id);
}
