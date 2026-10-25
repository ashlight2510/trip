/** Outbound search links only — we never scrape or rehost blog bodies. */

export function naverBlogSearchUrl(query: string) {
  return `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(query)}`;
}

/** Daum(Kakao) blog search — no API key; opens search results page. */
export function daumBlogSearchUrl(query: string) {
  return `https://search.daum.net/search?w=blog&q=${encodeURIComponent(query)}`;
}

export function googleWebSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=14`;
}

export function googleMapsUrl(lat: number, lng: number, name: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lng}`)}`;
}

export function placeSearchQuery(name: string, regionName?: string | null) {
  const city = regionName?.replace(/(시|군|구)$/, "") ?? "";
  return [city, name].filter(Boolean).join(" ");
}
