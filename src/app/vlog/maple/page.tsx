import { PhotoVlogPlayer } from "@/components/photo-vlog-player";
import { mapleFilm } from "@/lib/vlog/films/maple";

export const metadata = {
  title: "단풍 · 하루",
  description: "산책길에서 능선까지, 말 없이 단풍만 따라가는 가상 브이로그.",
};

export default function MapleVlogPage() {
  return <PhotoVlogPlayer film={mapleFilm} />;
}
