/**
 * Travel affiliate hooks — off until accounts/IDs exist.
 * When ready: set ENABLE_AFFILIATES=true and fill partner URLs.
 */
export const ENABLE_AFFILIATES = false;

export function hotelSearchUrl(placeName: string, cityName?: string | null): string | null {
  if (!ENABLE_AFFILIATES) return null;
  const q = encodeURIComponent([placeName, cityName].filter(Boolean).join(" "));
  // Replace with tracked Agoda/Booking partner link when available.
  return `https://www.google.com/search?q=${q}+hotel`;
}
