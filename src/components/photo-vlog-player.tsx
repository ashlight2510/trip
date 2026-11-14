"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VlogFilmNav } from "@/components/vlog-film-nav";
import { resolveBgmConfig, VlogBgm } from "@/lib/vlog/bgm";
import { cueAt, filmChapters, filmTotal, formatClock, sceneStart } from "@/lib/vlog/runtime";
import type { PhotoVlogFilm, VlogScene } from "@/lib/vlog/types";

const CALM_WOMAN_KO = ["yuna", "유나", "flo", "sandy", "shelley"];
const MALE_KO = ["eddy", "reed", "rocko", "grandpa"];

function calmWomanVoice(voices: SpeechSynthesisVoice[]) {
  const korean = voices.filter((voice) => voice.lang.toLowerCase().replaceAll("_", "-").startsWith("ko"));
  for (const name of CALM_WOMAN_KO) {
    const match = korean.find((voice) => voice.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return korean.find((voice) => !MALE_KO.some((name) => voice.name.toLowerCase().includes(name)));
}

function speakLine(line: string, voices: SpeechSynthesisVoice[]) {
  const synth = window.speechSynthesis;
  if (!synth || !line) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(line);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  const voice = calmWomanVoice(voices);
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

function FilmStill({
  scene,
  drift,
  playing,
  fadeIn,
}: {
  scene: VlogScene;
  drift: boolean;
  playing: boolean;
  fadeIn: boolean;
}) {
  const [visible, setVisible] = useState(!fadeIn);

  useEffect(() => {
    if (!fadeIn) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [fadeIn]);

  return (
    <div className={`absolute inset-0 transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div
        className={`absolute inset-0 ${drift ? "vlog-drift" : ""}`}
        style={
          drift
            ? {
                animationDuration: `${scene.duration}s`,
                animationPlayState: playing ? "running" : "paused",
              }
            : undefined
        }
      >
        <Image src={scene.image} alt={fadeIn ? "" : scene.alt} fill priority sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}

/** Low-token photo+script player: Ken Burns stills + browser TTS. Pass any `PhotoVlogFilm`. */
export function PhotoVlogPlayer({ film }: { film: PhotoVlogFilm }) {
  const scenes = film.scenes;
  const chapters = filmChapters(film);
  const total = filmTotal(film);
  const series = film.seriesLabel ?? film.eyebrow ?? "가상 브이로그";

  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [musicOn, setMusicOn] = useState(Boolean(film.bgm));
  const [fadeFrom, setFadeFrom] = useState(scenes[0]?.id ?? "");
  const [previous, setPrevious] = useState<VlogScene | null>(null);

  const indexRef = useRef(0);
  const elapsedRef = useRef(0);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const voiceRef = useRef(true);
  const spokenRef = useRef("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const scenesRef = useRef(scenes);
  const bgmRef = useRef<VlogBgm | null>(null);
  const actionsRef = useRef({ toggle: () => {}, next: () => {}, prev: () => {} });

  scenesRef.current = scenes;

  const scene = scenes[index] ?? scenes[0];
  if (!scene) {
    return (
      <main className="grid h-dvh place-items-center bg-black text-sm text-white/70">
        장면이 비어 있습니다. film.scenes에 사진·스크립트를 넣어 주세요.
      </main>
    );
  }

  if (scene.id !== fadeFrom) {
    setFadeFrom(scene.id);
    setPrevious(scenes.find((item) => item.id === fadeFrom) ?? null);
  }

  const cue = cueAt(scene, elapsed);
  const globalTime = sceneStart(scenes, index) + Math.min(elapsed, scene.duration);
  const playMinutes = Math.max(1, Math.round(total / 60));

  useEffect(() => {
    if (!previous) return;
    const timeout = window.setTimeout(() => setPrevious(null), 740);
    return () => window.clearTimeout(timeout);
  }, [previous, fadeFrom]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    const config = resolveBgmConfig(film.bgm);
    if (!config) {
      bgmRef.current = null;
      return;
    }
    const bgm = new VlogBgm(config);
    bgmRef.current = bgm;
    setMusicOn(true);
    return () => {
      void bgm.dispose();
      if (bgmRef.current === bgm) bgmRef.current = null;
    };
  }, [film.bgm]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const list = scenesRef.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        const current = list[indexRef.current];
        elapsedRef.current += dt;
        if (current && elapsedRef.current >= current.duration) {
          if (indexRef.current >= list.length - 1) {
            playingRef.current = false;
            elapsedRef.current = current.duration;
            endedRef.current = true;
            setPlaying(false);
            setEnded(true);
            setElapsed(current.duration);
            window.speechSynthesis?.cancel();
            bgmRef.current?.pause();
          } else {
            indexRef.current += 1;
            elapsedRef.current = 0;
            setIndex(indexRef.current);
            setElapsed(0);
          }
        }
        const spokenScene = list[indexRef.current];
        if (playingRef.current && spokenScene && voiceRef.current) {
          const spokenCue = cueAt(spokenScene, elapsedRef.current);
          const key = `${spokenScene.id}:${spokenCue.at}`;
          if (key !== spokenRef.current) {
            spokenRef.current = key;
            speakLine(spokenCue.line, voicesRef.current);
          }
        }
      }
      acc += dt;
      if (acc >= 0.08) {
        acc = 0;
        setIndex(indexRef.current);
        setElapsed(elapsedRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function jump(nextIndex: number) {
    const list = scenesRef.current;
    const next = Math.max(0, Math.min(list.length - 1, nextIndex));
    indexRef.current = next;
    elapsedRef.current = 0;
    spokenRef.current = "";
    endedRef.current = false;
    startedRef.current = true;
    playingRef.current = true;
    setIndex(next);
    setElapsed(0);
    setEnded(false);
    setStarted(true);
    setPlaying(true);
    void bgmRef.current?.play();
  }

  function toggle() {
    if (!startedRef.current || endedRef.current) {
      jump(endedRef.current ? 0 : indexRef.current);
      return;
    }
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
    if (!playingRef.current) {
      window.speechSynthesis?.cancel();
      bgmRef.current?.pause();
    } else {
      spokenRef.current = "";
      void bgmRef.current?.play();
    }
  }

  function nextScene() {
    const list = scenesRef.current;
    if (indexRef.current >= list.length - 1) {
      playingRef.current = false;
      endedRef.current = true;
      setPlaying(false);
      setEnded(true);
      window.speechSynthesis?.cancel();
      bgmRef.current?.pause();
      return;
    }
    jump(indexRef.current + 1);
  }

  function prevScene() {
    if (elapsedRef.current > 2) {
      jump(indexRef.current);
      return;
    }
    jump(Math.max(0, indexRef.current - 1));
  }

  function seek(global: number) {
    const list = scenesRef.current;
    const sum = list.reduce((acc, item) => acc + item.duration, 0);
    let remain = Math.max(0, Math.min(sum, global));
    let next = 0;
    while (next < list.length - 1 && remain > list[next].duration) {
      remain -= list[next].duration;
      next += 1;
    }
    indexRef.current = next;
    elapsedRef.current = Math.min(remain, list[next].duration);
    const landed = cueAt(list[next], elapsedRef.current);
    spokenRef.current = `${list[next].id}:${landed.at}`;
    endedRef.current = false;
    window.speechSynthesis?.cancel();
    setIndex(next);
    setElapsed(elapsedRef.current);
    setEnded(false);
  }

  function goChapter(chapter: string) {
    const found = scenesRef.current.findIndex((item) => item.chapter === chapter);
    if (found >= 0) jump(found);
  }

  function toggleVoice() {
    const next = !voiceRef.current;
    voiceRef.current = next;
    setVoiceOn(next);
    if (!next) window.speechSynthesis?.cancel();
    else spokenRef.current = "";
  }

  function toggleMusic() {
    const bgm = bgmRef.current;
    if (!bgm) return;
    const next = !musicOn;
    setMusicOn(next);
    bgm.setMuted(!next);
    if (next && playingRef.current) void bgm.play();
  }

  actionsRef.current = { toggle, next: nextScene, prev: prevScene };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === " ") {
        event.preventDefault();
        actionsRef.current.toggle();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        actionsRef.current.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        actionsRef.current.prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-black text-white">
      <style>{`
        @keyframes vlog-drift {
          from { transform: scale(1.04) translate3d(0, 0, 0); }
          to { transform: scale(1.1) translate3d(-1.2%, -0.6%, 0); }
        }
        .vlog-drift { animation: vlog-drift linear forwards; }
        @media (prefers-reduced-motion: reduce) {
          .vlog-drift { animation: none; }
        }
      `}</style>

      <div className="relative aspect-video w-full max-h-[calc(100dvh-11rem)] shrink-0">
        <div className="absolute inset-0 overflow-hidden">
          {previous && <FilmStill scene={previous} drift={false} playing={false} fadeIn={false} />}
          <FilmStill key={scene.id} scene={scene} drift playing={playing && started} fadeIn={previous != null} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-12 md:px-6">
          <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.22em] text-white/70">{series}</p>
              <p className="mt-1 text-sm text-white/90">
                {scene.clock ? `${scene.clock} · ` : ""}
                {scene.place}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/70 tabular-nums">
                {index + 1} / {scenes.length}
              </p>
              <VlogFilmNav />
            </div>
          </div>
          {chapters.length > 1 && (
            <div className="pointer-events-auto mt-3 flex flex-wrap gap-1.5">
              {chapters.map((chapter) => (
                <button
                  key={chapter}
                  type="button"
                  onClick={() => goChapter(chapter)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    scene.chapter === chapter ? "bg-white text-stone-900" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {chapter}
                </button>
              ))}
            </div>
          )}
        </div>
        {ended && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 px-4">
            <div className="w-full max-w-md text-center">
              {film.eyebrow && <p className="text-[11px] tracking-[0.22em] text-amber-100/85">{film.eyebrow}</p>}
              <h2 className="font-display mt-1 text-3xl">{film.endTitle ?? "끝"}</h2>
              {film.endBlurb && <p className="mt-2 text-sm leading-relaxed text-white/80">{film.endBlurb}</p>}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => jump(0)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900"
                >
                  {film.endPrimaryLabel ?? "다시 보기"}
                </button>
                {film.endLink && (
                  <Link href={film.endLink.href} className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
                    {film.endLink.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {started && (
        <section className="z-10 shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
          <p className="font-display max-w-3xl text-2xl leading-snug md:text-[2rem]" aria-live="polite">
            {cue.line}
          </p>
          <div className="mt-4">
            <label className="flex items-center gap-3 text-xs text-white/75 tabular-nums">
              <span className="w-9">{formatClock(globalTime)}</span>
              <input
                type="range"
                min={0}
                max={total}
                step={0.1}
                value={globalTime}
                aria-label="재생 위치"
                onChange={(event) => seek(Number(event.target.value))}
                className="h-1 flex-1 cursor-pointer accent-amber-100"
              />
              <span className="w-9 text-right">{formatClock(total)}</span>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={prevScene} className="rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
                이전
              </button>
              <button type="button" onClick={toggle} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-stone-900">
                {playing ? "일시정지" : ended ? "다시 보기" : "재생"}
              </button>
              <button type="button" onClick={nextScene} className="rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
                다음
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={voiceOn}
                className="rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
              >
                {voiceOn ? "목소리 켜짐" : "목소리 꺼짐"}
              </button>
              {film.bgm && (
                <button
                  type="button"
                  onClick={toggleMusic}
                  aria-pressed={musicOn}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
                >
                  {musicOn ? "음악 켜짐" : "음악 꺼짐"}
                </button>
              )}
              {film.homeLink && (
                <Link href={film.homeLink.href} className="rounded-full px-3 py-1.5 text-sm text-amber-100 hover:text-white">
                  {film.homeLink.label}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {!started && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-t from-black/75 via-black/35 to-black/20 px-5">
          <div className="w-full max-w-lg text-center">
            {film.eyebrow && <p className="text-[11px] tracking-[0.24em] text-amber-100/85">{film.eyebrow}</p>}
            <h1 className="font-display mt-2 text-4xl md:text-5xl">{film.title}</h1>
            {film.blurb && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/80">{film.blurb}</p>
            )}
            <button type="button" onClick={toggle} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900">
              재생 · 약 {playMinutes}분
            </button>
            <p className="mt-3 text-xs text-white/60">스페이스로 재생 · 방향키로 장면</p>
            <div className="pointer-events-auto mt-5 flex justify-center">
              <VlogFilmNav />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
