"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CourseView, MapPlace, StopView } from "@/db/repo";
import { SoundEngine } from "@/lib/sound/engine";
import { soundLabels } from "@/lib/sound/generators";
import { TRAVEL_MODES, travelModeMeta, type TravelMode, type TravelPose } from "@/lib/travel-mode";
import { ContributeLinkForm } from "./contribute-link-form";
import { COMPANIONS, CompanionHandOverlay, CompanionPreview, type CompanionKind } from "./companion-hand";
import { Compass } from "./compass";
import { MapTravelStage } from "./map-travel-stage-client";
import { PlacePhotoStage, PlaceVideoStage } from "./place-media-stage";
import { PointsBadge } from "./points-badge";
import { RoadviewStage, type StageInfo, type StageNotice } from "./roadview-stage";
import { LangToggle, useLocale, useT } from "@/i18n/locale";
import { displayName } from "@/i18n/display-name";

type ViewMode = "roadview" | "travel" | "photo" | "video";

const TIMERS = [0, 15, 30, 60];
const AUTO_ROTATE_DEG_PER_SEC = 2.5;
const IDLE_BEFORE_ROTATE_MS = 4000;
const TIMER_FADE_SEC = 10;

function lookStopFrom(base: StopView, pose: TravelPose, focus: MapPlace | null): StopView {
  return {
    ...base,
    heading: pose.heading,
    tip: focus ? `${focus.name} 앞에 서 있어요.` : base.tip,
    place: {
      ...base.place,
      id: focus?.id ?? base.place.id,
      name: focus?.name ?? base.place.name,
      lat: focus?.lat ?? pose.lat,
      lng: focus?.lng ?? pose.lng,
      address: focus?.address ?? base.place.address,
      category: focus?.category ?? base.place.category,
    },
  };
}

export function TripExperience({
  view,
  preferRoadview = false,
}: {
  view: CourseView;
  /** Solo place trip: start in 거리뷰. */
  preferRoadview?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const { course, stops } = view;
  const solo = preferRoadview || stops.length === 1;
  const [index, setIndex] = useState(0);
  const stop = stops[index]!;
  const { place } = stop;
  const notices: Record<StageNotice, string> = {
    "key-missing": t.trip.missingKey,
    "no-pano":
      locale === "en"
        ? "No Kakao roadview near this spot. Try the map tab."
        : "이 좌표 근처에는 카카오 로드뷰가 없어요. 지도 탭에서 다른 곳으로 이동해 보세요.",
    "load-failed": t.trip.loadFailed,
  };

  const engineRef = useRef<SoundEngine | null>(null);
  const exitTrip = useCallback(() => {
    void engineRef.current?.setMuted(true, 0.4);
    router.push("/");
  }, [router]);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [heading, setHeading] = useState(stop.heading);
  const [stage, setStage] = useState<StageInfo | null>(null);
  const [healing, setHealing] = useState(false);
  const [timerMin, setTimerMin] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [companion, setCompanion] = useState<CompanionKind>("alone");
  const [pose, setPose] = useState<TravelPose>({
    lat: place.lat,
    lng: place.lng,
    heading: stop.heading,
    speedMps: 0,
  });
  const [focusPlace, setFocusPlace] = useState<MapPlace | null>(null);
  const [mapVisited, setMapVisited] = useState(false);

  const photos = stop.media.filter((m) => m.kind === "image");
  const video = stop.media.find((m) => m.kind === "youtube") ?? null;
  const reviewLinks = (stop.sources ?? []).filter(
    (s) => s.type === "blog" || s.type === "youtube" || s.provider.includes("blog") || s.provider === "youtube",
  );
  const [mode, setMode] = useState<ViewMode>("roadview");
  const lastInteraction = useRef(0);

  const lookStop = useMemo(() => lookStopFrom(stop, pose, focusPlace), [stop, pose, focusPlace]);
  const panelName = displayName(focusPlace ?? place, locale);
  const panelAddress = focusPlace?.address ?? place.address;
  const holdingHands = companion !== "alone";

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

  function selectMode(next: ViewMode) {
    if (next === "travel") setMapVisited(true);
    setMode(next);
  }

  async function start() {
    const engine = (engineRef.current ??= new SoundEngine());
    await engine.start();
    await engine.setMuted(false, 0);
    engine.setVolume(volume);
    engine.setHeading(heading);
    engine.setScene(stop.soundscape, 3);
    setMode("roadview");
    setStarted(true);
    setPlaying(true);
  }

  useEffect(() => {
    if (started) engineRef.current?.setScene(stop.soundscape);
  }, [started, stop]);

  useEffect(() => () => void engineRef.current?.close(), []);

  useEffect(() => {
    if (!started || !playing) return;
    const base = volume;
    const boost = Math.min(0.15, pose.speedMps / 400);
    engineRef.current?.setVolume(Math.min(1, base + boost));
  }, [pose.speedMps, started, playing, volume]);

  async function togglePlaying() {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !playing;
    setPlaying(next);
    await engine.setMuted(!next, next ? 1 : 1.5);
  }

  function changeVolume(v: number) {
    setVolume(v);
    engineRef.current?.setVolume(v);
  }

  function goTo(i: number) {
    const next = (i + stops.length) % stops.length;
    const nextStop = stops[next]!;
    setStage(null);
    setIndex(next);
    setHeading(nextStop.heading);
    setPose({
      lat: nextStop.place.lat,
      lng: nextStop.place.lng,
      heading: nextStop.heading,
      speedMps: 0,
    });
    setFocusPlace(null);
    setMapVisited(false);
    setMode("roadview");
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
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [healing, stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (healing) {
        setHealing(false);
        return;
      }
      exitTrip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [healing, exitTrip]);

  useEffect(() => {
    if (!timerMin || !playing) return;
    const fade = window.setTimeout(() => void engineRef.current?.setMuted(true, TIMER_FADE_SEC), timerMin * 60_000);
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
  const attribution = [stage?.provider.attribution, t.trip.envSynth].filter(Boolean).join(" · ");
  const meta = travelModeMeta(travelMode);
  const companionMeta = COMPANIONS.find((c) => c.id === companion) ?? COMPANIONS[0]!;

  const modes: { id: ViewMode; label: string; enabled: boolean }[] = [
    { id: "roadview", label: t.trip.roadview, enabled: true },
    { id: "travel", label: t.trip.travel, enabled: true },
    { id: "photo", label: t.trip.photo, enabled: photos.length > 0 },
    { id: "video", label: t.trip.video, enabled: Boolean(video) },
  ];

  const showHands = started && holdingHands && (mode === "roadview" || (mode === "photo" && photos.length === 0));

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0" onPointerDownCapture={() => (lastInteraction.current = Date.now())}>
        {started && mapVisited && (
          <MapTravelStage
            key={place.id}
            startLat={pose.lat}
            startLng={pose.lng}
            startHeading={pose.heading}
            travelMode={travelMode}
            homePlaceId={place.id}
            active={mode === "travel"}
            onPose={(p) => {
              setPose(p);
              setHeading(p.heading);
              engineRef.current?.setHeading(p.heading);
            }}
            onArrive={(p) => setFocusPlace(p)}
            onOpenRoadview={(p) => {
              if (p) setFocusPlace(p);
              setMode("roadview");
            }}
          />
        )}
        {mode === "photo" && photos.length > 0 && <PlacePhotoStage key={place.id} images={photos} />}
        {mode === "video" && video && <PlaceVideoStage key={video.id} video={video} />}
        {mode === "roadview" && (
          <RoadviewStage key={`${lookStop.place.id}-${lookStop.place.lat.toFixed(5)}`} stop={lookStop} onReady={onReady} onHeading={onHeading} />
        )}
        {mode === "photo" && photos.length === 0 && !video && (
          <RoadviewStage stop={lookStop} onReady={onReady} onHeading={onHeading} />
        )}
      </div>

      {mode !== "travel" && (
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      )}
      {mode === "travel" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-black/55 to-transparent" />
      )}

      {showHands && <CompanionHandOverlay kind={companion} heading={heading} />}

      <button
        type="button"
        onClick={exitTrip}
        className="pointer-events-auto absolute right-5 top-5 z-20 inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-xl leading-none text-white/95 ring-1 ring-white/30 backdrop-blur hover:bg-black/70"
        aria-label={t.close}
        title={`${t.close} (Esc)`}
      >
        ×
      </button>

      <header className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 pr-16 ${chrome}`}>
        <div className="pointer-events-auto">
          <Link href="/" className="text-sm tracking-[0.3em] text-white/70 hover:text-white">
            {t.brand}
          </Link>
          <h1 className="mt-1 text-lg font-semibold">{course.title}</h1>
          {course.subtitle && <p className="mt-0.5 text-xs text-white/55">{course.subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!m.enabled || !started}
                onClick={() => selectMode(m.id)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  mode === m.id ? "bg-white text-black" : "bg-white/15 text-white/85 hover:bg-white/25"
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {started && mode === "travel" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRAVEL_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTravelMode(m.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                    travelMode === m.id ? "bg-amber-300 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                  title={m.hint}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {started && mode === "roadview" && (
            <div className="mt-2 flex max-w-[min(100vw-2.5rem,28rem)] flex-wrap gap-1.5">
              {COMPANIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompanion(c.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${
                    companion === c.id ? "bg-rose-200 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                  title={c.hint}
                >
                  <CompanionPreview kind={c.id} />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <LangToggle />
            <PointsBadge />
          </div>
          {mode === "roadview" && <Compass heading={heading} layers={stop.soundscape} />}
          {mode === "roadview" && attribution && <p className="text-[11px] text-white/60">{attribution}</p>}
          {mode === "travel" && (
            <p className="rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/85 backdrop-blur">
              {meta.label} · 체감 {Math.round(pose.speedMps * 3.6)} km/h
            </p>
          )}
        </div>
      </header>

      {mode === "roadview" && stage?.notice && (
        <div
          className={`pointer-events-none absolute left-1/2 top-28 w-[min(90vw,32rem)] -translate-x-1/2 space-y-2 rounded-xl bg-black/55 px-4 py-3 text-center backdrop-blur ${chrome}`}
        >
          <p className="text-sm text-white/90">{notices[stage.notice]}</p>
        </div>
      )}

      <section
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:flex-row md:items-end md:justify-between ${chrome}`}
      >
        <article
          className={`pointer-events-auto max-w-xl rounded-2xl bg-black/45 p-5 backdrop-blur-md ${
            mode === "travel" ? "mb-24 md:mb-28" : holdingHands ? "mb-16" : ""
          }`}
        >
          {!solo && (
            <p className="text-xs text-white/60">
              {index + 1} / {stops.length} · {panelAddress ?? stop.region?.name}
            </p>
          )}
          {solo && panelAddress && <p className="text-xs text-white/60">{panelAddress}</p>}
          <h2 className="mt-1 text-2xl font-bold">{panelName}</h2>
          {place.description && !focusPlace && (
            <p className="mt-2 text-sm leading-relaxed text-white/85">{place.description}</p>
          )}
          {stop.tip && <p className="mt-2 text-sm text-sky-200/90">{stop.tip}</p>}
          {mode === "roadview" && (
            <p className="mt-2 text-xs text-white/65">
              {holdingHands
                ? t.trip.holdHandsHint
                : t.trip.exploreHint}
            </p>
          )}
          {mode === "travel" && (
            <p className="mt-2 text-xs text-white/65">근처 파란 핀에 가까이 가면 도착 · 거리뷰로 내려볼 수 있어요.</p>
          )}

          {reviewLinks.length > 0 && mode !== "travel" && (
            <ul className="mt-4 max-h-36 space-y-1.5 overflow-y-auto">
              {reviewLinks.slice(0, 6).map((src) => (
                <li key={src.id}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-white/80 underline-offset-2 hover:text-white hover:underline"
                  >
                    {src.type === "youtube" || src.provider === "youtube" ? "▶ " : ""}
                    {src.title}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {mode === "roadview" && <ContributeLinkForm placeId={place.id} tone="dark" />}

          {stop.soundscape.length > 0 && mode === "roadview" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stop.soundscape.map((l, i) => (
                <span key={i} className="rounded-full bg-white/12 px-2.5 py-0.5 text-xs text-white/80">
                  {soundLabels[l.kind]}
                  {l.label && l.label !== soundLabels[l.kind] ? ` · ${l.label} 방향` : ""}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              className="underline-offset-2 hover:underline"
              href={`https://map.kakao.com/link/roadview/${lookStop.place.lat},${lookStop.place.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              카카오맵 로드뷰
            </a>
            <a
              className="underline-offset-2 hover:underline"
              href={`https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(stop.searchQuery)}`}
              target="_blank"
              rel="noreferrer"
            >
              네이버 블로그
            </a>
          </div>
        </article>

        <div
          className={`pointer-events-auto flex flex-col gap-3 rounded-2xl bg-black/45 p-4 backdrop-blur-md md:w-80 ${
            mode === "travel" ? "mb-24 md:mb-28" : holdingHands ? "mb-16" : ""
          }`}
        >
          {!solo && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10"
                aria-label="이전 장소"
              >
                ← 이전
              </button>
              <div className="flex gap-1.5">
                {stops.map((s, i) => (
                  <button
                    key={s.place.id}
                    type="button"
                    onClick={() => goTo(i)}
                    title={s.place.name}
                    aria-label={s.place.name}
                    className={`size-2.5 rounded-full ${i === index ? "bg-white" : "bg-white/35 hover:bg-white/60"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10"
                aria-label="다음 장소"
              >
                다음 →
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlaying}
              disabled={!started}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
            >
              {playing ? t.trip.soundOff : t.trip.soundOn}
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
              type="button"
              onClick={() => setHealing(true)}
              disabled={!started || mode === "travel"}
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
                  {m ? t.trip.minutesLater(m) : t.trip.noTimer}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {healing && (
        <button
          type="button"
          onClick={() => setHealing(false)}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-4 py-1.5 text-xs text-white/50 backdrop-blur transition hover:text-white"
        >
          힐링 모드 나가기 (Esc)
        </button>
      )}

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/60 p-6 text-center backdrop-blur-sm">
          <p className="text-sm tracking-[0.3em] text-white/60">{t.brand}</p>
          <h2 className="text-3xl font-bold md:text-4xl">{solo ? place.name : course.title}</h2>
          <p className="max-w-md text-white/75">
            거리뷰 속에서 길을 따라 걸어 보세요. 원하면 손을 잡고, 같이 걷는 기분으로 둘러볼 수 있어요.
          </p>
          <div className="w-full max-w-2xl">
            <p className="mb-2 text-xs tracking-wide text-white/55">누구와 손잡고 떠나나요</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COMPANIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompanion(c.id)}
                  className={`rounded-2xl px-3 py-3 text-left transition ${
                    companion === c.id ? "bg-rose-200 text-black ring-2 ring-rose-100" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CompanionPreview kind={c.id} />
                    <span className="text-sm font-semibold">{c.label}</span>
                  </span>
                  <span className={`mt-1 block text-[11px] leading-snug ${companion === c.id ? "text-black/60" : "text-white/60"}`}>
                    {c.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-amber-300 px-8 py-3 font-semibold text-black hover:bg-amber-200"
          >
            {holdingHands ? t.trip.startWithCompanion(companionMeta.label) : t.trip.startRoadview}
          </button>
        </div>
      )}
    </main>
  );
}
