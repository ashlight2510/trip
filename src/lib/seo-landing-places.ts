import "server-only";
import type { SeoLanding } from "@/lib/seo-landings";
import { loadStaticPlacesFile, type StaticPlaceRow } from "@/lib/static-places-file";

export type LandingPlaceCard = {
  id: string;
  name: string;
  city_name: string | null;
  district_name: string | null;
  category: string;
  source_count: number;
  is_pick: boolean;
};

function rankPlace(p: StaticPlaceRow, picksFirst: boolean) {
  let s = p.pin_score ?? 0;
  if (picksFirst && p.is_pick) s += 80;
  s += Math.min(40, (p.source_count ?? 0) * 4);
  return s;
}

/** Build-time place list so explore HTML is indexable (not empty client shell). */
export function getLandingPlaces(landing: SeoLanding, limit = 24): LandingPlaceCard[] {
  let list = loadStaticPlacesFile().slice();
  if (landing.cityId) list = list.filter((p) => p.city_id === landing.cityId);
  if (landing.category) list = list.filter((p) => p.category === landing.category);
  list.sort(
    (a, b) => rankPlace(b, Boolean(landing.picksFirst)) - rankPlace(a, Boolean(landing.picksFirst)),
  );
  return list.slice(0, limit).map((p) => ({
    id: p.id,
    name: p.name,
    city_name: p.city_name,
    district_name: p.district_name,
    category: p.category,
    source_count: p.source_count,
    is_pick: p.is_pick,
  }));
}
