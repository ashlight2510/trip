/**
 * YouTube Data API v3 — search + video stats (metadata only, no rehost).
 */
import { requireEnv } from "./store";

export interface YoutubeVideoItem {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  url: string;
}

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
  };
};

export async function searchYoutubeVideos(query: string, maxResults: number): Promise<YoutubeVideoItem[]> {
  const key = requireEnv("YOUTUBE_DATA_API_KEY");
  const n = Math.min(10, Math.max(1, maxResults));
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance` +
    `&maxResults=${n}&q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`YouTube search API 오류 ${searchRes.status}: ${await searchRes.text()}`);
  }
  const searchJson = (await searchRes.json()) as { items?: SearchItem[] };
  const ids = (searchJson.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((id): id is string => Boolean(id));
  if (!ids.length) return [];

  const statsUrl =
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet` +
    `&id=${ids.map(encodeURIComponent).join(",")}&key=${encodeURIComponent(key)}`;
  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) {
    throw new Error(`YouTube videos API 오류 ${statsRes.status}: ${await statsRes.text()}`);
  }
  const statsJson = (await statsRes.json()) as {
    items?: {
      id: string;
      snippet?: SearchItem["snippet"];
      statistics?: { viewCount?: string };
    }[];
  };

  return (statsJson.items ?? []).map((it) => {
    const sn = it.snippet;
    return {
      id: it.id,
      title: sn?.title ?? "(제목 없음)",
      description: (sn?.description ?? "").slice(0, 400),
      channelTitle: sn?.channelTitle ?? "",
      channelId: sn?.channelId ?? "",
      publishedAt: sn?.publishedAt ?? "",
      thumbnailUrl: sn?.thumbnails?.high?.url ?? sn?.thumbnails?.medium?.url ?? null,
      viewCount: it.statistics?.viewCount != null ? Number(it.statistics.viewCount) : null,
      url: `https://www.youtube.com/watch?v=${it.id}`,
    };
  });
}
