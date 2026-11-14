/** @deprecated Prefer `@/lib/vlog`. Compatibility exports for older imports. */
import { cueAt as cueAtScene, filmChapters, filmTotal, formatClock, sceneStart as startOf } from "./vlog/runtime";
import { maldivesVlogFilm } from "./vlog/films/maldives";
import type { VlogScene } from "./vlog/types";

export type { VlogScene };
export type VlogChapter = string;
export { formatClock };

export const VLOG_SCENES: VlogScene[] = maldivesVlogFilm.scenes;
export const VLOG_CHAPTERS = filmChapters(maldivesVlogFilm);
export const VLOG_TOTAL = filmTotal(maldivesVlogFilm);

export function sceneStart(index: number) {
  return startOf(VLOG_SCENES, index);
}

export function cueAt(scene: VlogScene, elapsed: number) {
  return cueAtScene(scene, elapsed);
}
