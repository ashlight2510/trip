import type { Metadata } from "next";
import { WorldChristmasAtlas } from "@/components/world-christmas";

export const metadata: Metadata = {
  title: "전 세계 크리스마스 문화 도감 · 풍경너머",
  description:
    "독일, 프랑스, 이탈리아, 폴란드, 스페인, 아이슬란드, 멕시코, 에티오피아, 필리핀, 호주, 대한민국, 일본 등 전 세계 12개국의 크리스마스 음식과 이벤트·풍습을 그림과 함께 살펴보세요.",
};

export default function ChristmasPage() {
  return <WorldChristmasAtlas />;
}
