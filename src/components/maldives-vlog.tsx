"use client";

import { PhotoVlogPlayer } from "@/components/photo-vlog-player";
import { maldivesVlogFilm } from "@/lib/vlog/films/maldives";

export function MaldivesVlog() {
  return <PhotoVlogPlayer film={maldivesVlogFilm} />;
}
