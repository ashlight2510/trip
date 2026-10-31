/**
 * Naver blog search via NAVER API HUB (NCP).
 * Developers Center Search API 신규 신청은 2026-07-31 이후 차단됨.
 */
import { requireEnv } from "./store";

export interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

const BLOG_URL = "https://naverapihub.apigw.ntruss.com/search/v1/blog";

export async function searchNaverBlogs(query: string, display: number): Promise<NaverBlogItem[]> {
  const clientId = requireEnv("NAVER_CLIENT_ID");
  const clientSecret = requireEnv("NAVER_CLIENT_SECRET");
  const url = `${BLOG_URL}?sort=sim&display=${display}&format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`네이버 검색 API 오류 ${res.status}: ${await res.text()}`);
  }
  const { items } = (await res.json()) as { items: NaverBlogItem[] };
  return items ?? [];
}
