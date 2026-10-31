/** Normalize & classify user-submitted outbound review URLs (no body fetch). */

export type ContribKind = "blog" | "youtube" | "article";

export type ParsedContribUrl = {
  url: string;
  type: ContribKind;
  provider: string;
  titleHint: string;
};

function stripTracking(u: URL) {
  const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
  for (const k of drop) u.searchParams.delete(k);
  return u;
}

export function parseContribUrl(raw: string): ParsedContribUrl | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u = stripTracking(u);
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube
  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    let videoId: string | null = null;
    if (host === "youtu.be") videoId = u.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (u.pathname.startsWith("/watch")) videoId = u.searchParams.get("v");
    else if (u.pathname.startsWith("/shorts/")) videoId = u.pathname.split("/")[2] ?? null;
    else if (u.pathname.startsWith("/embed/")) videoId = u.pathname.split("/")[2] ?? null;
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    return { url, type: "youtube", provider: "youtube", titleHint: `YouTube · ${videoId}` };
  }

  // Naver blog
  if (host === "blog.naver.com" || host === "m.blog.naver.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const url = `https://blog.naver.com/${parts[0]}/${parts[1]}`;
    return { url, type: "blog", provider: "naver_blog", titleHint: `네이버 블로그 · ${parts[0]}` };
  }

  // Tistory
  if (host.endsWith(".tistory.com")) {
    if (!u.pathname || u.pathname === "/") return null;
    const url = `https://${host}${u.pathname.replace(/\/$/, "")}`;
    return { url, type: "blog", provider: "tistory", titleHint: `티스토리 · ${host.split(".")[0]}` };
  }

  // Generic article (allowlist soft)
  if (
    host.endsWith(".kr") ||
    host.includes("brunch.co.kr") ||
    host.includes("velog.io") ||
    host.includes("medium.com")
  ) {
    const url = u.toString().replace(/\/$/, "");
    return { url, type: "article", provider: "web", titleHint: host };
  }

  return null;
}

/** Stable kebab source id from normalized URL. */
export function sourceIdFromUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  const hex = (h >>> 0).toString(36);
  return `usr-${hex}`;
}
