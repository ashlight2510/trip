import { PhotoVlogPlayer } from "@/components/photo-vlog-player";
import { winterFilm } from "@/lib/vlog/films/winter";

export const metadata = {
  title: "겨울 · 하루",
  description: "눈 골목에서 저녁 거리까지, 천천히 걷는 겨울 가상 브이로그.",
};

export default function WinterVlogPage() {
  return <PhotoVlogPlayer film={winterFilm} />;
}
