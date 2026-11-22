/**
 * Travel affiliate hooks.
 * Enable by setting NEXT_PUBLIC_AGODA_CID (or NEXT_PUBLIC_ENABLE_AFFILIATES=1 + CID).
 * Static export reads these at build time (set in GH Actions secrets/vars when ready).
 */
const AGODA_CID = (process.env.NEXT_PUBLIC_AGODA_CID ?? "").trim();
const FORCE_ON = process.env.NEXT_PUBLIC_ENABLE_AFFILIATES === "1";

export const ENABLE_AFFILIATES = Boolean(AGODA_CID) || FORCE_ON;

export function hotelSearchUrl(placeName: string, cityName?: string | null): string | null {
  if (!ENABLE_AFFILIATES) return null;
  const q = [placeName, cityName].filter(Boolean).join(" ");
  if (AGODA_CID) {
    const params = new URLSearchParams({
      cid: AGODA_CID,
      city: cityName || placeName,
      searchText: q,
      pcs: "1",
    });
    return `https://www.agoda.com/search?${params.toString()}`;
  }
  // Fallback while CID pending — still trackable intent, no partner cookie yet.
  return `https://www.google.com/search?q=${encodeURIComponent(`${q} 숙소`)}`;
}

export function activitySearchUrl(placeName: string, cityName?: string | null): string | null {
  if (!ENABLE_AFFILIATES) return null;
  const q = encodeURIComponent([placeName, cityName, "입장권", "투어"].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${q}`;
}
