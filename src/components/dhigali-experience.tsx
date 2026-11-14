"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkDhigaliAdmin } from "@/app/actions/dhigali-admin";
import {
  DHIGALI,
  DHIGALI_NPCS,
  DHIGALI_SPOTS,
  dhigaliInside,
  nearestSpot,
  type DhigaliSpot,
} from "@/lib/dhigali";

type Phase = "gate" | "fly" | "island";

const FLY_STEPS = [
  { title: "인천 출발", body: "비행기 예약만으로 입장할 수 있다. 첫 구간은 인천에서 쿠알라룸푸르." },
  { title: "쿠알라룸푸르", body: "말레이시아에서 환승한다. 여기서 말레행 비행기로 갈아탄다." },
  { title: "말레", body: "벨라나 국제공항. 리조트 데스크에서 수상비행기 시간을 확인한다." },
  { title: "수상비행기", body: "라 환초까지 약 45분. 산호 고리가 창문 아래로 이어진다." },
  { title: "디갈리 도착", body: "남쪽 파빌리온에 내렸다. 신발을 벗고 모래를 밟는다." },
];

const SCALE = 2.15;

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
  const [pos, setPos] = useState({ x: -20, y: 140, heading: 0 });
  const [near, setNear] = useState<DhigaliSpot | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [npcT, setNpcT] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [bar, setBar] = useState({ x: 16, y: 16 });
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const drag = useRef<{ kind: "map" | "bar"; x: number; y: number; ox: number; oy: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

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
      setNpcT((t) => (t + dt * 0.08) % 1);
      const k = keys.current;
      let heading = posRef.current.heading;
      if (k.left) heading = (heading - 140 * dt + 360) % 360;
      if (k.right) heading = (heading + 140 * dt) % 360;
      let speed = 0;
      if (k.up) speed = 4.2;
      else if (k.down) speed = -2.2;
      if (speed !== 0) {
        const rad = (heading * Math.PI) / 180;
        const nx = posRef.current.x + Math.sin(rad) * speed * dt;
        const ny = posRef.current.y - Math.cos(rad) * speed * dt;
        if (dhigaliInside(nx, ny)) {
          const next = { x: nx, y: ny, heading };
          posRef.current = next;
          setPos(next);
          setNear(nearestSpot(nx, ny));
        } else {
          setPos((p) => ({ ...p, heading }));
        }
      } else if (k.left || k.right) {
        setPos((p) => ({ ...p, heading }));
        posRef.current = { ...posRef.current, heading };
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

  async function enterAdmin() {
    setCodeError("");
    const ok = await checkDhigaliAdmin(code);
    if (!ok) {
      setCodeError("코드가 맞지 않아요.");
      return;
    }
    setPhase("island");
  }

  function joinEvent() {
    if (!near) return;
    setLog((prev) => (prev.includes(near.event) ? prev : [near.event, ...prev].slice(0, 8)));
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

  const camX = pos.x * SCALE;
  const camY = pos.y * SCALE;

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
      className="relative h-dvh cursor-grab overflow-hidden bg-[#0b6e8a] text-white active:cursor-grabbing"
      onPointerDown={(e) => pointerDown("map", e)}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(${pan.x - camX}px, ${pan.y - camY}px)` }}
      >
        <svg
          width={1100}
          height={700}
          viewBox="-550 -350 1100 700"
          className="absolute left-[-550px] top-[-350px] overflow-visible"
        >
          <ellipse
            cx={0}
            cy={0}
            rx={(DHIGALI.rx + 36) * SCALE}
            ry={(DHIGALI.ry + 22) * SCALE}
            fill="#7fd0c4"
            transform={`rotate(${DHIGALI.rotDeg})`}
            opacity={0.85}
          />
          <ellipse
            cx={0}
            cy={0}
            rx={DHIGALI.rx * SCALE}
            ry={DHIGALI.ry * SCALE}
            fill="#e7d3a1"
            transform={`rotate(${DHIGALI.rotDeg})`}
          />
          <ellipse
            cx={-10}
            cy={8}
            rx={70 * SCALE}
            ry={28 * SCALE}
            fill="#8fbf73"
            opacity={0.55}
            transform={`rotate(${DHIGALI.rotDeg})`}
          />
        </svg>
        {DHIGALI_SPOTS.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: spot.x * SCALE, top: spot.y * SCALE }}
            onClick={() => {
              setPos({ x: spot.x, y: spot.y, heading: pos.heading });
              posRef.current = { x: spot.x, y: spot.y, heading: pos.heading };
              setNear(spot);
            }}
          >
            <span className="size-2.5 rounded-full bg-[#1b4965] ring-2 ring-white" />
            <span className="absolute left-4 top-0 whitespace-nowrap text-[10px] font-semibold text-[#073044]">
              {spot.name}
            </span>
          </button>
        ))}
        {DHIGALI_NPCS.map((npc) => {
          const p = alongPath(npc.path, npcT * npc.speed * 8);
          return (
            <span
              key={npc.id}
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: p.x * SCALE, top: p.y * SCALE, background: npc.color }}
              title={npc.name}
            />
          );
        })}
        <span
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
          style={{
            left: pos.x * SCALE,
            top: pos.y * SCALE,
            transform: `translate(-50%, -50%) rotate(${pos.heading}deg)`,
          }}
        >
          <span className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-[#1b4965]" />
        </span>
      </div>

      <header className="absolute left-4 top-4 z-10 max-w-xs">
        <p className="text-[11px] tracking-[0.2em] text-white/70">DHIGALI</p>
        <h1 className="font-serif text-2xl">디갈리 섬</h1>
        <p className="mt-1 text-[12px] text-white/80">드래그로 섬을 밀고, WASD로 걷는다.</p>
      </header>
      <Link href="/" className="absolute right-4 top-4 z-10 rounded-full bg-black/30 px-3 py-1.5 text-xs">
        나가기
      </Link>

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
        {near ? (
          <div className="rounded-2xl bg-white/95 p-3 text-stone-900">
            <p className="text-[11px] text-stone-500">가까이</p>
            <p className="font-semibold">{near.name}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-stone-600">{near.blurb}</p>
            <button
              type="button"
              onClick={joinEvent}
              className="mt-2 rounded-full bg-[#1b4965] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              참여
            </button>
          </div>
        ) : (
          <p className="rounded-2xl bg-black/35 px-3 py-2 text-[12px]">시설 가까이 가면 이벤트가 열린다.</p>
        )}
        {log.length > 0 && (
          <ul className="rounded-2xl bg-black/35 px-3 py-2 text-[12px] leading-relaxed">
            {log.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        )}
      </aside>
    </main>
  );
}
