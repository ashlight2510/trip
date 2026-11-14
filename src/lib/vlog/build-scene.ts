import type { VlogCue, VlogScene, VlogShotInput } from "./types";

/** Rough Korean TTS pacing: ~7 chars/sec + breath between lines. */
export function estimateDuration(lines: string[]) {
  const chars = lines.join("").replace(/\s+/g, "").length;
  const speak = chars / 7 + lines.length * 0.85;
  return Math.max(6, Math.min(24, Math.round(speak * 10) / 10));
}

export function cuesFromLines(lines: string[], duration: number): VlogCue[] {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (cleaned.length === 0) return [{ at: 0, line: "" }];
  if (cleaned.length === 1) return [{ at: 0, line: cleaned[0] }];
  const step = duration / cleaned.length;
  return cleaned.map((line, i) => ({
    at: Math.round(i * step * 10) / 10,
    line,
  }));
}

/** Turn photo + script lines into a timed scene (no AI video tokens). */
export function shotToScene(shot: VlogShotInput): VlogScene {
  const lines = shot.lines.map((line) => line.trim()).filter(Boolean);
  const duration = shot.duration ?? estimateDuration(lines.length ? lines : [""]);
  return {
    id: shot.id,
    chapter: shot.chapter,
    place: shot.place,
    clock: shot.clock ?? "",
    image: shot.image,
    alt: shot.alt ?? shot.place,
    duration,
    cues: cuesFromLines(lines, duration),
  };
}

export function shotsToScenes(shots: VlogShotInput[]): VlogScene[] {
  return shots.map(shotToScene);
}
