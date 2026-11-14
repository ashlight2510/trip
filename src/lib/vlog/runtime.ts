import type { PhotoVlogFilm, VlogCue, VlogScene } from "./types";

export function filmChapters(film: PhotoVlogFilm): string[] {
  const seen = new Set<string>();
  const chapters: string[] = [];
  for (const scene of film.scenes) {
    if (seen.has(scene.chapter)) continue;
    seen.add(scene.chapter);
    chapters.push(scene.chapter);
  }
  return chapters;
}

export function filmTotal(film: PhotoVlogFilm) {
  return film.scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

export function sceneStart(scenes: VlogScene[], index: number) {
  let time = 0;
  for (let i = 0; i < index; i++) time += scenes[i]?.duration ?? 0;
  return time;
}

export function cueAt(scene: VlogScene, elapsed: number): VlogCue {
  let current = scene.cues[0] ?? { at: 0, line: "" };
  for (const cue of scene.cues) {
    if (cue.at <= elapsed + 0.08) current = cue;
  }
  return current;
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}
