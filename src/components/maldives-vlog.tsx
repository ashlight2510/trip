"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  cueAt,
  formatClock,
  sceneStart,
  VLOG_CHAPTERS,
  VLOG_SCENES,
  VLOG_TOTAL,
  type VlogChapter,
  type VlogScene,
} from "@/lib/maldives-vlog";

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
  utterance.rate = 0.9;
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

export function MaldivesVlog() {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [fadeFrom, setFadeFrom] = useState(VLOG_SCENES[0].id);
  const [previous, setPrevious] = useState<VlogScene | null>(null);

  const indexRef = useRef(0);
  const elapsedRef = useRef(0);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const voiceRef = useRef(true);
  const spokenRef = useRef("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const actionsRef = useRef({ toggle: () => {}, next: () => {}, prev: () => {} });

  const scene = VLOG_SCENES[index] ?? VLOG_SCENES[0];
  if (scene.id !== fadeFrom) {
    setFadeFrom(scene.id);
    setPrevious(VLOG_SCENES.find((item) => item.id === fadeFrom) ?? null);
  }

  const cue = cueAt(scene, elapsed);
  const globalTime = sceneStart(index) + Math.min(elapsed, scene.duration);

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
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        const current = VLOG_SCENES[indexRef.current];
        elapsedRef.current += dt;
        if (current && elapsedRef.current >= current.duration) {
          if (indexRef.current >= VLOG_SCENES.length - 1) {
            playingRef.current = false;
            elapsedRef.current = current.duration;
            endedRef.current = true;
            setPlaying(false);
            setEnded(true);
            setElapsed(current.duration);
            window.speechSynthesis?.cancel();
          } else {
            indexRef.current += 1;
            elapsedRef.current = 0;
            setIndex(indexRef.current);
            setElapsed(0);
          }
        }
        const spokenScene = VLOG_SCENES[indexRef.current];
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
    const next = Math.max(0, Math.min(VLOG_SCENES.length - 1, nextIndex));
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
  }

  function toggle() {
    if (!startedRef.current || endedRef.current) {
      jump(endedRef.current ? 0 : indexRef.current);
      return;
    }
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
    if (!playingRef.current) window.speechSynthesis?.cancel();
    else spokenRef.current = "";
  }

  function nextScene() {
    if (indexRef.current >= VLOG_SCENES.length - 1) {
      playingRef.current = false;
      endedRef.current = true;
      setPlaying(false);
      setEnded(true);
      window.speechSynthesis?.cancel();
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
    let remain = Math.max(0, Math.min(VLOG_TOTAL, global));
    let next = 0;
    while (next < VLOG_SCENES.length - 1 && remain > VLOG_SCENES[next].duration) {
      remain -= VLOG_SCENES[next].duration;
      next += 1;
    }
    indexRef.current = next;
    elapsedRef.current = Math.min(remain, VLOG_SCENES[next].duration);
    const landed = cueAt(VLOG_SCENES[next], elapsedRef.current);
    spokenRef.current = `${VLOG_SCENES[next].id}:${landed.at}`;
    endedRef.current = false;
    window.speechSynthesis?.cancel();
    setIndex(next);
    setElapsed(elapsedRef.current);
    setEnded(false);
  }

  function goChapter(chapter: VlogChapter) {
    const found = VLOG_SCENES.findIndex((item) => item.chapter === chapter);
    if (found >= 0) jump(found);
  }

  function toggleVoice() {
    const next = !voiceRef.current;
    voiceRef.current = next;
    setVoiceOn(next);
    if (!next) window.speechSynthesis?.cancel();
    else spokenRef.current = "";
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
            <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.22em] text-white/70">가상 브이로그</p>
                <p className="mt-1 text-sm text-white/90">
                  {scene.clock} · {scene.place}
                </p>
              </div>
              <p className="text-xs text-white/70 tabular-nums">
                {index + 1} / {VLOG_SCENES.length}
              </p>
            </div>
            <div className="pointer-events-auto mt-3 flex flex-wrap gap-1.5">
              {VLOG_CHAPTERS.map((chapter) => (
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
          </div>
        {ended && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 px-4">
            <div className="w-full max-w-md text-center">
              <p className="text-[11px] tracking-[0.22em] text-amber-100/85">리조트 첫날</p>
              <h2 className="font-display mt-1 text-3xl">오늘은 여기까지</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/80">바다가 보이는 식탁에서 첫날을 닫았다.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => jump(0)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900">
                  다시 보기
                </button>
                <Link href="/maldives" className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
                  디갈리 섬으로 들어가기
                </Link>
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
                  max={VLOG_TOTAL}
                  step={0.1}
                  value={globalTime}
                  aria-label="재생 위치"
                  onChange={(event) => seek(Number(event.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-amber-100"
                />
                <span className="w-9 text-right">{formatClock(VLOG_TOTAL)}</span>
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
                <Link href="/maldives" className="rounded-full px-3 py-1.5 text-sm text-amber-100 hover:text-white">
                  디갈리 섬으로
                </Link>
              </div>
            </div>
          </section>
      )}

      {!started && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-t from-black/75 via-black/35 to-black/20 px-5">
          <div className="w-full max-w-lg text-center">
            <p className="text-[11px] tracking-[0.24em] text-amber-100/85">가상 브이로그</p>
            <h1 className="font-display mt-2 text-4xl md:text-5xl">인천에서 몰디브까지</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              두바이에서 하루. 시내, 부르즈 할리파, 야경, 디너 코스.
              <br />
              수상비행기, 워터빌라, 스노클링, 바닷가 저녁.
            </p>
            <button type="button" onClick={toggle} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900">
              재생 · 약 2분 반
            </button>
            <p className="mt-3 text-xs text-white/60">스페이스로 재생 · 방향키로 장면</p>
          </div>
        </div>
      )}

    </main>
  );
}
