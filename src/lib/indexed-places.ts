import "server-only";
import { getLandingPlaces } from "@/lib/seo-landing-places";
import { SEO_LANDINGS } from "@/lib/seo-landings";
import { getStaticPlaceById, loadStaticPlacesFile, type StaticPlaceRow } from "@/lib/static-places-file";

export { placeSeoPath } from "@/lib/seo-paths";

/** Cap ranked place SEO pages so GH Pages build stays sane. */
export const INDEXED_PLACE_LIMIT = 250;

function placeSeoScore(p: StaticPlaceRow) {
  return (p.source_count ?? 0) * 10 + (p.pin_score ?? 0) + (p.is_pick ? 40 : 0);
}

export function getIndexedPlaces(limit = INDEXED_PLACE_LIMIT): StaticPlaceRow[] {
  return loadStaticPlacesFile()
    .filter((p) => (p.source_count ?? 0) >= 3)
    .sort((a, b) => placeSeoScore(b) - placeSeoScore(a))
    .slice(0, limit);
}

/** Ranked top places + every place shown on explore landings (no 404 from theme links). */
export function getAllSeoPlaceIds(): string[] {
  const ids = new Set(getIndexedPlaces().map((p) => p.id));
  for (const landing of SEO_LANDINGS) {
    for (const p of getLandingPlaces(landing, 24)) ids.add(p.id);
  }
  return [...ids];
}

export function getAllSeoPlaces(): StaticPlaceRow[] {
  return getAllSeoPlaceIds()
    .map((id) => getStaticPlaceById(id))
    .filter((p): p is StaticPlaceRow => Boolean(p));
}
