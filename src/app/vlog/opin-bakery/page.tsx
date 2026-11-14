import { PhotoVlogPlayer } from "@/components/photo-vlog-player";
import { opinBakeryFilm } from "@/lib/vlog/films/opin-bakery";

export const metadata = {
  title: "오핀베이커리 · 비 오는 주말",
  description: "한적한 주말 오후, 비 오는 날 오핀베이커리에서 천천히 쉬는 가상 브이로그.",
};

export default function OpinBakeryVlogPage() {
  return <PhotoVlogPlayer film={opinBakeryFilm} />;
}
