import type { PlaceMedia } from "@/db/schema";

const YT_ID = /^[\w-]{11}$/;

export function youtubeId(url: string): string | null {
  if (YT_ID.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).slice(0, 11) || null;
    const v = u.searchParams.get("v");
    if (v && YT_ID.test(v)) return v;
    const m = u.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function youtubeEmbedSrc(media: PlaceMedia) {
  const id = youtubeId(media.url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    mute: "1",
  });
  if (media.start_sec) params.set("start", String(media.start_sec));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

export function licenseLabel(license: PlaceMedia["license"]) {
  switch (license) {
    case "cc-by":
      return "CC BY";
    case "cc-by-sa":
      return "CC BY-SA";
    case "cc0":
      return "CC0";
    case "kogl-1":
      return "공공누리 1유형";
    case "kogl-2":
      return "공공누리 2유형";
    case "kogl-3":
      return "공공누리 3유형";
    case "youtube-embed":
      return "공식 채널 임베드";
  }
}

export function attributionText(media: PlaceMedia) {
  return `${media.credit} · ${licenseLabel(media.license)}`;
}
