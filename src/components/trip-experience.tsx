"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Course } from "@/data/courses";
import { SoundEngine } from "@/lib/sound/engine";
import { soundLabels } from "@/lib/sound/generators";
import { Compass } from "./compass";
import { RoadviewStage, type StageInfo, type StageNotice } from "./roadview-stage";

const NOTICES: Record<StageNotice, string> = {
  "key-missing": "로드뷰 API 키가 없어 사운드 전용 화면으로 보여드려요. 화면을 드래그해 둘러보세요.",
  "no-pano": "이 근처에는 로드뷰가 없어 사운드 전용 화면으로 보여드려요.",
  "load-failed": "로드뷰를 불러오지 못했어요. API 키와 도메인 등록을 확인해주세요.",
};

const TIMERS = [0, 15, 30, 60];
const AUTO_ROTATE_DEG_PER_SEC = 2.5;
const IDLE_BEFORE_ROTATE_MS = 4000;
const TIMER_FADE_SEC = 10;

export function TripExperience({ course }: { course: Course }) {
  const [index, setIndex] = useState(0);
  const stop = course.stops[index];

  const engineRef = useRef<SoundEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [heading, setHeading] = useState(stop.heading);
  const [stage, setStage] = useState<StageInfo | null>(null);
  const [healing, setHealing] = useState(false);
  const [timerMin, setTimerMin] = useState(0);
  const lastInteraction = useRef(0);

  const onHeading = useCallback((deg: number) => {
    setHeading(deg);
    engineRef.current?.setHeading(deg);
  }, []);

  const onReady = useCallback(
    (info: StageInfo) => {
      setStage(info);
      onHeading(info.handle.getHeading());
    },
    [onHeading],
  );

  async function start() {
    const engine = (engineRef.current ??= new SoundEngine());
    await engine.start();
    engine.setVolume(volume);
    engine.setHeading(heading);
    engine.setScene(stop.soundscape, 3);
    setStarted(true);
    setPlaying(true);
  }

  useEffect(() => {
    if (started) engineRef.current?.setScene(stop.soundscape);
  }, [started, stop]);

  useEffect(() => () => void engineRef.current?.close(), []);

  function togglePlaying() {
    const engine = engineRef.current;
    if (!engine) return;
    if (playing) engine.fadeOut(1.5);
    else engine.setVolume(volume);
    setPlaying(!playing);
  }

  function changeVolume(v: number) {
    setVolume(v);
    if (playing) engineRef.current?.setVolume(v);
  }

  function goTo(i: number) {
    setStage(null);
    setIndex((i + course.stops.length) % course.stops.length);
  }

  useEffect(() => {
    if (!healing || !stage) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (Date.now() - lastInteraction.current > IDLE_BEFORE_ROTATE_MS) {
        stage.handle.setHeading(stage.handle.getHeading() + dt * AUTO_ROTATE_DEG_PER_SEC);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHealing(false);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [healing, stage]);

  useEffect(() => {
    if (!timerMin || !playing) return;
    const fade = window.setTimeout(() => engineRef.current?.fadeOut(TIMER_FADE_SEC), timerMin * 60_000);
    const end = window.setTimeout(() => {
      setPlaying(false);
      setHealing(false);
      setTimerMin(0);
    }, (timerMin * 60 + TIMER_FADE_SEC) * 1000);
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [timerMin, playing]);

  const chrome = `transition-opacity duration-700 ${healing ? "pointer-events-none opacity-0" : "opacity-100"}`;
  const attribution = [stage?.provider.attribution, "환경음: Web Audio 실시간 합성"].filter(Boolean).join(" · ");

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0" onPointerDownCapture={() => (lastInteraction.current = Date.now())}>
        <RoadviewStage stop={stop} onReady={onReady} onHeading={onHeading} />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <header className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 ${chrome}`}>
        <div className="pointer-events-auto">
          <Link href="/" className="text-sm tracking-[0.3em] text-white/70 hover:text-white">
            풍경너머
          </Link>
          <h1 className="mt-1 text-lg font-semibold">{course.title}</h1>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <Compass heading={heading} layers={stop.soundscape} />
          {attribution && <p className="text-[11px] text-white/60">{attribution}</p>}
        </div>
      </header>

      {stage?.notice && (
        <p className={`pointer-events-none absolute left-1/2 top-24 w-[min(90vw,32rem)] -translate-x-1/2 rounded-xl bg-black/50 px-4 py-2 text-center text-sm text-white/85 backdrop-blur ${chrome}`}>
          {NOTICES[stage.notice]}
        </p>
      )}

      <section className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:flex-row md:items-end md:justify-between ${chrome}`}>
        <article className="pointer-events-auto max-w-xl rounded-2xl bg-black/45 p-5 backdrop-blur-md">
          <p className="text-xs text-white/60">
            {index + 1} / {course.stops.length} · {stop.area}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{stop.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{stop.description}</p>
          {stop.tip && <p className="mt-2 text-sm text-sky-200/90">{stop.tip}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stop.soundscape.map((l, i) => (
              <span key={i} className="rounded-full bg-white/12 px-2.5 py-0.5 text-xs text-white/80">
                {soundLabels[l.kind]}
                {l.label && l.label !== soundLabels[l.kind] ? ` · ${l.label} 방향` : ""}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-3 text-xs">
            <a
              className="underline-offset-2 hover:underline"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(stop.searchQuery)}`}
              target="_blank"
              rel="noreferrer"
            >
              유튜브 여행 영상
            </a>
            <a
              className="underline-offset-2 hover:underline"
              href={`https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(stop.searchQuery)}`}
              target="_blank"
              rel="noreferrer"
            >
              블로그 후기
            </a>
          </div>
        </article>

        <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl bg-black/45 p-4 backdrop-blur-md md:w-80">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => goTo(index - 1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10" aria-label="이전 장소">
              ← 이전
            </button>
            <div className="flex gap-1.5">
              {course.stops.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  title={s.name}
                  aria-label={s.name}
                  className={`size-2.5 rounded-full ${i === index ? "bg-white" : "bg-white/35 hover:bg-white/60"}`}
                />
              ))}
            </div>
            <button onClick={() => goTo(index + 1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10" aria-label="다음 장소">
              다음 →
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlaying}
              disabled={!started}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
            >
              {playing ? "소리 끄기" : "소리 켜기"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="flex-1 accent-white"
              aria-label="볼륨"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHealing(true)}
              disabled={!started}
              className="flex-1 rounded-full border border-white/30 px-4 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              힐링 모드
            </button>
            <select
              value={timerMin}
              onChange={(e) => setTimerMin(Number(e.target.value))}
              className="rounded-full border border-white/30 bg-transparent px-3 py-1.5 text-sm"
              aria-label="타이머"
            >
              {TIMERS.map((m) => (
                <option key={m} value={m} className="text-black">
                  {m ? `${m}분 후 끄기` : "타이머 없음"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {healing && (
        <button
          onClick={() => setHealing(false)}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-4 py-1.5 text-xs text-white/50 backdrop-blur transition hover:text-white"
        >
          힐링 모드 나가기 (Esc)
        </button>
      )}

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/55 p-6 text-center backdrop-blur-sm">
          <p className="text-sm tracking-[0.3em] text-white/60">풍경너머</p>
          <h2 className="text-3xl font-bold md:text-4xl">{course.title}</h2>
          <p className="max-w-md text-white/75">
            헤드폰을 쓰면 더 좋아요. 화면을 돌리면 소리가 들려오는 방향도 함께 바뀌어요.
          </p>
          <button onClick={start} className="rounded-full bg-white px-8 py-3 font-semibold text-black hover:bg-white/90">
            떠나기
          </button>
        </div>
      )}
    </main>
  );
}
