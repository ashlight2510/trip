import { PhotoVlogPlayer } from "@/components/photo-vlog-player";
import { donghaeFilm } from "@/lib/vlog/films/donghae";

export const metadata = {
  title: "동해 · 하루",
  description: "강릉 안목·경포·정동진을 지나 일몰까지, 약 1분 동해 가상 브이로그.",
};

export default function DonghaeVlogPage() {
  return <PhotoVlogPlayer film={donghaeFilm} />;
}
