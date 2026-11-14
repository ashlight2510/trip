import type { PhotoVlogFilmBgm } from "./bgm";

/** One spoken line inside a still photo scene. */
export type VlogCue = {
  at: number;
  line: string;
};

/** One photo + narration beat. Cheap to play: Ken Burns + browser TTS. */
export type VlogScene = {
  id: string;
  chapter: string;
  place: string;
  clock: string;
  image: string;
  alt: string;
  duration: number;
  cues: VlogCue[];
};

/** Optional end-screen link after the last scene. */
export type VlogEndLink = {
  href: string;
  label: string;
};

/**
 * A reusable photo+script film.
 * Drop images under `public/…`, fill scenes (or use `shotsToScenes`), mount `<PhotoVlogPlayer film={…} />`.
 */
export type PhotoVlogFilm = {
  id: string;
  title: string;
  eyebrow?: string;
  blurb?: string;
  /** Label above chapter chips / chrome. */
  seriesLabel?: string;
  endTitle?: string;
  endBlurb?: string;
  endPrimaryLabel?: string;
  endLink?: VlogEndLink;
  homeLink?: VlogEndLink;
  /**
   * Optional procedural BGM (Web Audio, no sample files).
   * e.g. `"autumn"` or `{ preset: "calm", volume: 0.15 }`.
   */
  bgm?: PhotoVlogFilmBgm;
  scenes: VlogScene[];
};

/** Minimal authoring input: photo + script lines → timed scene. */
export type VlogShotInput = {
  id: string;
  chapter: string;
  place: string;
  clock?: string;
  image: string;
  alt?: string;
  /** Override auto duration (seconds). */
  duration?: number;
  /** Narration lines in order; timings are spread across the scene. */
  lines: string[];
};
