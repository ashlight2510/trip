/** Canonical public origin for OG + share links. */
export function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://trip.funnyfunny.cloud").replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  const origin = siteOrigin();
  if (!path || path === "/") return `${origin}/`;
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function placeSharePath(placeId: string): string {
  return `/trip/place/?id=${encodeURIComponent(placeId)}`;
}

export function placeShareUrl(placeId: string): string {
  return absoluteUrl(placeSharePath(placeId));
}
