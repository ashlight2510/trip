"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { checkDhigaliAdmin } from "@/app/actions/dhigali-admin";
import { DHIGALI_ITINERARY } from "@/lib/dhigali";
import {
  ARRIVAL,
  bearingDeg,
  DHIGALI_COAST,
  GEO_NPCS,
  GEO_SPOTS,
  canWalk,
  DHIGALI_FEATURES,
  nearestGeoSpot,
  type GeoSpot,
} from "@/lib/dhigali-geo";
import { haversineM, offsetLatLng } from "@/lib/travel-mode";
import { DhigaliWorld } from "@/components/dhigali-world";
import { dhigaliAmbience } from "@/lib/sound/dhigali-ambience";

type Phase = "gate" | "fly" | "island";

const FLY_STEPS = [
  { title: "인천 출발", body: "비행기 예약만으로 입장할 수 있다. 첫 구간은 인천에서 쿠알라룸푸르." },
  { title: "쿠알라룸푸르", body: "말레이시아에서 환승한다. 여기서 말레행 비행기로 갈아탄다." },
  { title: "말레", body: "벨라나 국제공항. 리조트 데스크에서 수상비행기 시간을 확인한다." },
  { title: "수상비행기", body: "라 환초까지 약 45분. 산호 고리가 창문 아래로 이어진다." },
  { title: "디갈리 도착", body: "남쪽 파빌리온에 내렸다. 신발을 벗고 모래를 밟는다." },
];

function skyFor(minutes: number) {
  const h = (minutes / 60) % 24;
  if (h >= 5 && h < 6.8) return { sea: "#c9846a", sandGlow: 0.2, label: "선라이즈" };
  if (h >= 6.8 && h < 16) return { sea: "#0b6e8a", sandGlow: 0, label: "한낮" };
  if (h >= 16 && h < 19) return { sea: "#c45c3e", sandGlow: 0.35, label: "선셋" };
  return { sea: "#062433", sandGlow: 0, label: "밤" };
}

function clockLabel(minutes: number) {
  const m = Math.floor(minutes) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function alongPath(path: { x: number; y: number }[], t: number) {
  const first = path[0];
  if (!first) return { x: 0, y: 0 };
  const last = path.length - 1;
  if (last <= 0) return first;
  const u = Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0;
  const dist = u * last;
  const i = Math.max(0, Math.min(last - 1, Math.floor(dist)));
  const a = path[i] ?? first;
  const b = path[i + 1] ?? a;
  const f = dist - i;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function DhigaliExperience() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [flyStep, setFlyStep] = useState(0);
  const [pos, setPos] = useState({ lat: ARRIVAL.lat, lng: ARRIVAL.lng, heading: 0 });
  const [near, setNear] = useState<GeoSpot | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [npcT, setNpcT] = useState(0);
  const [ride, setRide] = useState<"walk" | "run" | "buggy">("walk");
  const [minutes, setMinutes] = useState(7 * 60 + 40);
  const [destName, setDestName] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [fireworks, setFireworks] = useState(false);
  const [underwater, setUnderwater] = useState(false);
  const underwaterRef = useRef(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [bar, setBar] = useState({ x: 16, y: 16 });
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const drag = useRef<{ kind: "map" | "bar"; x: number; y: number; ox: number; oy: number } | null>(null);
  const posRef = useRef(pos);
  const rideRef = useRef(ride);
  const destRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const playerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const npcRefs = useRef<Record<string, import("leaflet").CircleMarker>>({});
  const hostRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef(false);
  const npcTRef = useRef(0);
  const nearIdRef = useRef<string | null>(null);
  posRef.current = pos;
  rideRef.current = ride;
  underwaterRef.current = underwater;

  useEffect(() => {
    if (phase !== "fly") return;
    if (flyStep >= FLY_STEPS.length - 1) {
      const timer = setTimeout(() => setPhase("island"), 1600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setFlyStep((n) => n + 1), 2600);
    return () => clearTimeout(timer);
  }, [phase, flyStep]);

  useEffect(() => {
    if (phase !== "island") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.current.up = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.current.down = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.current.up = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.current.down = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const nextNpcT = (npcTRef.current + dt * 0.08) % 1;
      npcTRef.current = nextNpcT;
      setNpcT(nextNpcT);
      for (const npc of GEO_NPCS) {
        const p = alongPath(
          npc.path.map((point) => ({ x: point.lat, y: point.lng })),
          nextNpcT * npc.speed * 8,
        );
        npcRefs.current[npc.id]?.setLatLng([p.x, p.y]);
      }
      setMinutes((m) => {
        const target = watchUntil.current;
        const step = dt * (target == null ? 2.4 : 28);
        const next = m + step;
        if (target != null && m < target && next >= target) {
          watchUntil.current = null;
          return target % (24 * 60);
        }
        return next % (24 * 60);
      });
      const k = keys.current;
      const manual = k.up || k.down || k.left || k.right;
      if (manual) destRef.current = null;
      let heading = posRef.current.heading;
      let speed = 0;
      const cruise = rideRef.current === "buggy" ? 12 : rideRef.current === "run" ? 7.4 : 3.4;
      if (k.left) heading = (heading - 140 * dt + 360) % 360;
      if (k.right) heading = (heading + 140 * dt) % 360;
      if (k.up) speed = cruise;
      else if (k.down) speed = -cruise * 0.45;
      const here = posRef.current;
      const dest = destRef.current;
      if (!manual && dest) {
        const dist = haversineM(here.lat, here.lng, dest.lat, dest.lng);
        if (dist < 14) {
          destRef.current = null;
          setDestName(null);
        } else {
          heading = bearingDeg(here, dest);
          speed = cruise;
        }
      }
      movingRef.current = speed !== 0;
      if (speed > 0 && rideRef.current !== "buggy" && !underwaterRef.current) {
        dhigaliAmbience.step(rideRef.current === "run" ? 210 : 420);
      }
      if (speed !== 0) {
        const step = offsetLatLng(here.lat, here.lng, heading, speed * dt);
        if (canWalk(step.lat, step.lng)) {
          const next = { lat: step.lat, lng: step.lng, heading };
          posRef.current = next;
          setPos(next);
          playerRef.current?.setLatLng([next.lat, next.lng]);
          mapRef.current?.panTo([next.lat, next.lng], { animate: false });
          const found = nearestGeoSpot(step.lat, step.lng);
          if ((found?.id ?? null) !== nearIdRef.current) {
            nearIdRef.current = found?.id ?? null;
            setNear(found);
          }
        } else {
          destRef.current = null;
          setDestName(null);
          const turned = { ...here, heading };
          posRef.current = turned;
          setPos(turned);
        }
      } else if (k.left || k.right) {
        const turned = { ...here, heading };
        posRef.current = turned;
        setPos(turned);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "island") return;
    void dhigaliAmbience.start();
    return () => dhigaliAmbience.stop();
  }, [phase]);

  const nightShown = useRef(false);
  const watchUntil = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "island") return;
    const hour = (minutes / 60) % 24;
    const night = hour >= 19 || hour < 5;
    if (night && !nightShown.current) {
      nightShown.current = true;
      setFireworks(true);
    }
    if (!night) nightShown.current = false;
  }, [phase, minutes]);

  useEffect(() => {
    if (phase !== "island" || !fireworks || !soundOn) return;
    const id = window.setInterval(() => dhigaliAmbience.boom(), 1200);
    return () => window.clearInterval(id);
  }, [phase, fireworks, soundOn]);

  useEffect(() => {
    if (phase !== "island") return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !hostRef.current) return;
      map = L.map(hostRef.current, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 16,
        maxZoom: 19,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 19,
          maxNativeZoom: 18,
        },
      ).addTo(map);
      const shore = L.polygon(
        DHIGALI_COAST.map(([lat, lng]) => [lat, lng] as [number, number]),
        { color: "#fff7e6", weight: 2, fillColor: "#fff7e6", fillOpacity: 0.06 },
      ).addTo(map);
      map.fitBounds(shore.getBounds().pad(0.35), { maxZoom: 17, animate: false });
      for (const feature of DHIGALI_FEATURES) {
        const line = feature.points.map(([lat, lng]) => [lat, lng] as [number, number]);
        if (feature.kind === "wood") {
          L.polygon(line, { color: "#2f6b45", weight: 1, fillColor: "#3f8f55", fillOpacity: 0.18 }).addTo(map!);
        } else {
          const color = feature.kind === "pier" ? "#f7f1e4" : feature.kind === "service" ? "#f0d9a0" : "#ffffff";
          L.polyline(line, { color, weight: feature.kind === "pier" ? 3 : 2, opacity: 0.9 }).addTo(map!);
        }
      }
      for (const spot of GEO_SPOTS) {
        const marker = L.circleMarker([spot.lat, spot.lng], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#1b4965",
          fillOpacity: 1,
        });
        marker.bindTooltip(spot.name, { direction: "top", offset: [0, -6] });
        marker.on("click", () => goTo(spot));
        marker.addTo(map!);
      }
      const start = posRef.current;
      playerRef.current = L.circleMarker([start.lat, start.lng], {
        radius: 8,
        color: "#1b4965",
        weight: 3,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).addTo(map);
      for (const npc of GEO_NPCS) {
        const p = npc.path[0];
        if (!p) continue;
        npcRefs.current[npc.id] = L.circleMarker([p.lat, p.lng], {
          radius: 5,
          color: "#ffffff",
          weight: 1,
          fillColor: npc.color,
          fillOpacity: 1,
        })
          .bindTooltip(npc.name, { direction: "top" })
          .addTo(map);
      }
      mapRef.current = map;
      requestAnimationFrame(() => map?.invalidateSize());
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      playerRef.current = null;
      npcRefs.current = {};
    };
  }, [phase]);

  async function enterAdmin() {
    setCodeError("");
    const ok = await checkDhigaliAdmin(code);
    if (!ok) {
      setCodeError("코드가 맞지 않아요.");
      return;
    }
    void dhigaliAmbience.start();
    setPhase("island");
  }

  function joinEvent() {
    if (!near) return;
    const hour = (minutes / 60) % 24;
    const line =
      near.id === "haali" && (hour < 16 || hour >= 19)
        ? "할리는 열렸지만 돌핀은 노을 때 가깝다. 지금은 음료만 마셨다."
        : near.event;
    setLog((prev) => (prev[0] === line ? prev : [line, ...prev].slice(0, 6)));
    setDone((prev) => (prev.includes(near.id) ? prev : [...prev, near.id]));
    if (near.id === "jetty") {
      setUnderwater(true);
      dhigaliAmbience.dive(true);
    }
  }

  function goTo(spot: GeoSpot) {
    destRef.current = { lat: spot.lat, lng: spot.lng };
    setDestName(spot.name);
    setRide("buggy");
  }

  if (phase === "gate") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#073044] px-5 text-white">
        <div className="w-full max-w-md">
          <p className="text-[11px] tracking-[0.28em] text-white/50">RAA ATOLL · 5.4754, 72.9542</p>
          <h1 className="font-serif mt-2 text-4xl">디갈리</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            몰디브 라 환초의 섬을 걸어 다닌다. 일반 입장은 비행기 예약뿐이고, 경유지는 쿠알라룸푸르다.
            관리자 코드가 있으면 바로 모래 위로 들어간다.
          </p>
          <button
            type="button"
            onClick={() => {
              void dhigaliAmbience.start();
              setFlyStep(0);
              setPhase("fly");
            }}
            className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-[#073044]"
          >
            비행기 예약 · 인천 → 쿠알라룸푸르 → 말레
          </button>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void enterAdmin();
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="관리자 코드"
              className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none ring-1 ring-white/20 placeholder:text-white/40"
              autoComplete="off"
            />
            <button type="submit" className="rounded-xl px-3 text-sm font-semibold ring-1 ring-white/30">
              입장
            </button>
          </form>
          {codeError && <p className="mt-2 text-xs text-rose-200">{codeError}</p>}
          <Link href="/" className="mt-6 inline-block text-xs text-white/50 hover:text-white">
            지도로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "fly") {
    const step = FLY_STEPS[flyStep] ?? FLY_STEPS[0]!;
    return (
      <main className="grid min-h-dvh place-items-center bg-[#041820] px-5 text-white">
        <div className="w-full max-w-lg">
          <p className="text-[11px] tracking-[0.22em] text-sky-200/70">
            {flyStep + 1} / {FLY_STEPS.length}
          </p>
          <h1 className="font-serif mt-2 text-4xl">{step.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75">{step.body}</p>
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-sky-200 transition-all"
              style={{ width: `${((flyStep + 1) / FLY_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </main>
    );
  }

  const sky = skyFor(minutes);
  const people = GEO_NPCS.map((npc) => {
    const p = alongPath(
      npc.path.map((point) => ({ x: point.lat, y: point.lng })),
      npcT * npc.speed * 8,
    );
    return { npc, lat: p.x, lng: p.y };
  });
  const talk = people.find((person) => haversineM(pos.lat, pos.lng, person.lat, person.lng) < 32)?.npc ?? null;

  function pointerDown(kind: "map" | "bar", e: React.PointerEvent) {
    if (kind === "map" && (e.target as HTMLElement).closest("button, a, aside")) return;
    const origin = kind === "map" ? pan : bar;
    drag.current = { kind, x: e.clientX, y: e.clientY, ox: origin.x, oy: origin.y };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x;
      const dy = ev.clientY - d.y;
      if (d.kind === "map") setPan({ x: d.ox + dx, y: d.oy + dy });
      else setBar({ x: Math.max(8, d.ox + dx), y: Math.max(8, d.oy - dy) });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <main
      className="relative h-dvh cursor-grab overflow-hidden text-white active:cursor-grabbing"
      style={{ background: sky.sea }}
    >
      <DhigaliWorld
        lat={pos.lat}
        lng={pos.lng}
        heading={pos.heading}
        minutes={minutes}
        nearId={near?.id ?? null}
        fireworks={fireworks}
        underwater={underwater}
        people={people.map(({ npc, lat, lng }) => ({ id: npc.id, lat, lng, color: npc.color }))}
      />
      <div ref={hostRef} className="absolute bottom-4 right-4 z-30 h-36 w-40 overflow-hidden rounded-2xl shadow-lg ring-2 ring-white" />
      <p className="pointer-events-none absolute bottom-[9.6rem] right-4 z-30 text-[10px] text-white/80">미니맵</p>

      <header
        className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/45 to-transparent px-3 pb-3 pt-3"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.2em] text-white/70">위성 · 수집한 길·잔교 · {sky.label}</p>
            <h1 className="font-serif text-2xl">디갈리 섬</h1>
            <p className="mt-0.5 truncate text-[12px] text-white/80">
              {clockLabel(minutes)} · {ride === "buggy" ? "버기" : ride === "run" ? "달리기" : "도보"}
              {destName ? ` · ${destName}으로` : ""}
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full bg-black/40 px-3 py-1.5 text-xs">
            나가기
          </Link>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          <button type="button" onClick={() => setRide("walk")} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${ride === "walk" ? "bg-white text-[#073044]" : "bg-black/40"}`}>도보</button>
          <button type="button" onClick={() => setRide("run")} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${ride === "run" ? "bg-white text-[#073044]" : "bg-black/40"}`}>달리기</button>
          <button type="button" onClick={() => setRide("buggy")} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${ride === "buggy" ? "bg-white text-[#073044]" : "bg-black/40"}`}>버기</button>
          <button
            type="button"
            onClick={() => {
              const next = { ...posRef.current, heading: 90 };
              posRef.current = next;
              setPos(next);
              setMinutes(5 * 60 + 15);
              watchUntil.current = 6 * 60 + 45;
            }}
            className="shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[11px]"
          >
            선라이즈
          </button>
          <button
            type="button"
            onClick={() => {
              const next = { ...posRef.current, heading: 270 };
              posRef.current = next;
              setPos(next);
              setMinutes(17 * 60 + 5);
              watchUntil.current = 18 * 60 + 45;
            }}
            className="shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[11px]"
          >
            선셋
          </button>
          <button type="button" onClick={() => setMinutes(20 * 60 + 10)} className="shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[11px]">밤</button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              void dhigaliAmbience.start().then(() => dhigaliAmbience.setOn(next));
            }}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${soundOn ? "bg-white text-[#073044]" : "bg-black/40"}`}
          >
            {soundOn ? "소리 켜짐" : "소리 꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => setFireworks((on) => !on)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${fireworks ? "bg-white text-[#073044]" : "bg-black/40"}`}
          >
            불꽃놀이
          </button>
        </div>
      </header>

      <aside
        className="absolute z-10 grid max-h-[46vh] w-[min(20rem,calc(100vw-2rem))] gap-2 overflow-y-auto"
        style={{ left: bar.x, bottom: bar.y }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cursor-grab rounded-full bg-black/35 px-3 py-1 text-[11px] active:cursor-grabbing"
          onPointerDown={(e) => {
            e.stopPropagation();
            pointerDown("bar", e);
          }}
        >
          안내 바 옮기기
        </button>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {DHIGALI_ITINERARY.map((item) => (
            <span
              key={item.id}
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${done.includes(item.id) ? "bg-white text-[#073044]" : "bg-black/35"}`}
            >
              {done.includes(item.id) ? "✓ " : ""}
              {item.label}
            </span>
          ))}
        </div>
        {talk && (
          <p className="rounded-2xl bg-black/45 px-3 py-2 text-[12px] leading-relaxed">
            <span className="font-semibold">{talk.name}</span> · {talk.line}
          </p>
        )}
        {near ? (
          <div className="rounded-2xl bg-white/95 p-3 text-stone-900">
            <p className="text-[11px] text-stone-500">가까이</p>
            <p className="font-semibold">{near.name}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-stone-600">{near.blurb}</p>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={joinEvent}
                className="rounded-full bg-[#1b4965] px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                {near.id === "jetty" ? "스노클 들어가기" : "참여"}
              </button>
              {underwater && (
                <button
                  type="button"
                  onClick={() => {
                    setUnderwater(false);
                    dhigaliAmbience.dive(false);
                  }}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#1b4965] ring-1 ring-[#1b4965]"
                >
                  물 밖으로
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-black/35 px-3 py-2 text-[12px]">3D 화면을 끌면 시선이 돌아갑니다. 미니맵의 점을 누르면 버기가 그쪽으로 갑니다.</p>
        )}
        {log.length > 0 && (
          <ul className="rounded-2xl bg-black/35 px-3 py-2 text-[12px] leading-relaxed">
            {log.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        )}
      </aside>
      {underwater && (
        <button
          type="button"
          onClick={() => {
            setUnderwater(false);
            dhigaliAmbience.dive(false);
          }}
          className="absolute bottom-44 left-4 z-30 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#073044]"
        >
          물 밖으로
        </button>
      )}
      <div className="absolute bottom-44 right-4 z-30 grid grid-cols-3 gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <span />
        <Pad label="앞" onDown={() => { keys.current.up = true; }} onUp={() => { keys.current.up = false; }} />
        <span />
        <Pad label="왼" onDown={() => { keys.current.left = true; }} onUp={() => { keys.current.left = false; }} />
        <Pad label="뒤" onDown={() => { keys.current.down = true; }} onUp={() => { keys.current.down = false; }} />
        <Pad label="오" onDown={() => { keys.current.right = true; }} onUp={() => { keys.current.right = false; }} />
      </div>
    </main>
  );
}

function Pad({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      type="button"
      className="grid size-11 place-items-center rounded-xl bg-black/40 text-[11px] font-semibold"
      onPointerDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      {label}
    </button>
  );
}
