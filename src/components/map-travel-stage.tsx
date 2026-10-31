"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { MapPlace } from "@/db/repo";
import { fetchPlaces } from "@/lib/map-fetch";
import { attachOpenFreeMap, type BasemapHandle } from "@/lib/map-basemap";
import { useLocale } from "@/i18n/locale";
import {
  haversineM,
  offsetLatLng,
  travelModeMeta,
  type TravelMode,
  type TravelPose,
} from "@/lib/travel-mode";

export type { TravelPose };

const ARRIVE_M = 45;
const NEARBY_RADIUS_KM = 3;
const NEARBY_LIMIT = 40;

type Leaflet = typeof import("leaflet");

function playerIcon(L: Leaflet, heading: number, mode: TravelMode) {
  const glyph = mode === "walk" ? "🚶" : mode === "motorcycle" ? "🛵" : "🚗";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="
      width:36px;height:36px;display:grid;place-items:center;
      transform:rotate(${heading}deg);
      filter:drop-shadow(0 1px 3px rgba(0,0,0,.55));
      font-size:22px;line-height:1;user-select:none;
    ">${glyph}</div>`,
  });
}

function pinIcon(L: Leaflet, active: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="
      width:14px;height:14px;border-radius:999px;
      background:${active ? "#f59e0b" : "#1b4965"};
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>`,
  });
}

type Props = {
  startLat: number;
  startLng: number;
  startHeading: number;
  travelMode: TravelMode;
  homePlaceId: string;
  /** When false, ignore WASD / touch and pause movement (map stays mounted). */
  active?: boolean;
  onPose: (pose: TravelPose) => void;
  onArrive: (place: MapPlace) => void;
  onOpenRoadview: (place: MapPlace | null) => void;
};

export function MapTravelStage({
  startLat,
  startLng,
  startHeading,
  travelMode,
  homePlaceId,
  active = true,
  onPose,
  onArrive,
  onOpenRoadview,
}: Props) {
  const { locale } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const playerRef = useRef<import("leaflet").Marker | null>(null);
  const pinsRef = useRef<import("leaflet").LayerGroup | null>(null);
  const basemapRef = useRef<BasemapHandle | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const poseRef = useRef({ lat: startLat, lng: startLng, heading: startHeading });
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const modeRef = useRef(travelMode);
  const activeRef = useRef(active);
  const nearbyRef = useRef<MapPlace[]>([]);
  const arrivedRef = useRef<string | null>(null);

  const [hudSpeed, setHudSpeed] = useState(0);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [arrived, setArrived] = useState<MapPlace | null>(null);
  const [hint, setHint] = useState("WASD · 방향키로 이동");
  const [ready, setReady] = useState(false);

  const emitPose = useEffectEvent((speedMps: number) => {
    const p = poseRef.current;
    onPose({ ...p, speedMps });
  });

  const checkArrive = useEffectEvent(() => {
    const p = poseRef.current;
    let best: MapPlace | null = null;
    let bestD = Infinity;
    for (const place of nearbyRef.current) {
      if (place.id === homePlaceId && arrivedRef.current === place.id) continue;
      const d = haversineM(p.lat, p.lng, place.lat, place.lng);
      if (d < bestD) {
        bestD = d;
        best = place;
      }
    }
    if (best && bestD <= ARRIVE_M) {
      if (arrivedRef.current !== best.id) {
        arrivedRef.current = best.id;
        setArrived(best);
        onArrive(best);
      }
    } else if (arrivedRef.current && bestD > ARRIVE_M * 1.6) {
      arrivedRef.current = null;
      setArrived(null);
    }
  });

  useEffect(() => {
    modeRef.current = travelMode;
    const L = leafletRef.current;
    const marker = playerRef.current;
    if (L && marker) marker.setIcon(playerIcon(L, poseRef.current.heading, travelMode));
  }, [travelMode]);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      keysRef.current = { up: false, down: false, left: false, right: false };
    } else {
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    }
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    let cancelled = false;
    let raf = 0;
    let map: import("leaflet").Map | null = null;
    let cleanupExtra: (() => void) | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") keysRef.current.up = true;
      if (k === "arrowdown" || k === "s") keysRef.current.down = true;
      if (k === "arrowleft" || k === "a") keysRef.current.left = true;
      if (k === "arrowright" || k === "d") keysRef.current.right = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") keysRef.current.up = false;
      if (k === "arrowdown" || k === "s") keysRef.current.down = false;
      if (k === "arrowleft" || k === "a") keysRef.current.left = false;
      if (k === "arrowright" || k === "d") keysRef.current.right = false;
    };

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !hostRef.current) return;
      leafletRef.current = L;

      if (cancelled || !hostRef.current) return;

      map = L.map(hostRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        zoomSnap: 0,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 90,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      pinsRef.current = L.layerGroup().addTo(map);
      const basemap = await attachOpenFreeMap(map, locale);
      if (cancelled) {
        basemap.remove();
        return;
      }
      basemapRef.current = basemap;

      const player = L.marker([startLat, startLng], {
        icon: playerIcon(L, startHeading, travelMode),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
      playerRef.current = player;
      mapRef.current = map;
      map.setView([startLat, startLng], 16);
      poseRef.current = { lat: startLat, lng: startLng, heading: startHeading };
      setReady(true);

      void fetchPlaces({ lat: startLat, lng: startLng, radiusKm: NEARBY_RADIUS_KM, limit: NEARBY_LIMIT })
        .then((places) => {
          if (cancelled) return;
          nearbyRef.current = places;
          setNearbyCount(places.length);
          const layer = pinsRef.current;
          if (!layer) return;
          layer.clearLayers();
          for (const place of places) {
            const m = L.marker([place.lat, place.lng], {
              icon: pinIcon(L, place.id === homePlaceId),
              title: place.name,
            });
            m.on("click", () => {
              setArrived(place);
              arrivedRef.current = place.id;
              onArrive(place);
            });
            m.addTo(layer);
          }
        })
        .catch(console.error);

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!activeRef.current) {
          setHudSpeed(0);
          emitPose(0);
          raf = requestAnimationFrame(tick);
          return;
        }
        const meta = travelModeMeta(modeRef.current);
        const keys = keysRef.current;
        let moving = false;
        if (keys.left) poseRef.current.heading = (poseRef.current.heading - meta.turnDegPerSec * dt + 360) % 360;
        if (keys.right) poseRef.current.heading = (poseRef.current.heading + meta.turnDegPerSec * dt) % 360;
        let speed = 0;
        if (keys.up) {
          speed = meta.speedMps;
          moving = true;
        } else if (keys.down) {
          speed = -meta.speedMps * 0.45;
          moving = true;
        }
        const Lf = leafletRef.current;
        if (moving) {
          const next = offsetLatLng(poseRef.current.lat, poseRef.current.lng, poseRef.current.heading, speed * dt);
          poseRef.current.lat = next.lat;
          poseRef.current.lng = next.lng;
          const m = mapRef.current;
          const marker = playerRef.current;
          if (m && marker && Lf) {
            marker.setLatLng([next.lat, next.lng]);
            marker.setIcon(playerIcon(Lf, poseRef.current.heading, modeRef.current));
            m.panTo([next.lat, next.lng], { animate: false });
          }
          checkArrive();
        } else if (Lf) {
          playerRef.current?.setIcon(playerIcon(Lf, poseRef.current.heading, modeRef.current));
        }
        setHudSpeed(Math.abs(speed));
        emitPose(Math.abs(speed));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onResize = () => map?.invalidateSize();
      window.addEventListener("resize", onResize);
      requestAnimationFrame(() => map?.invalidateSize());

      cleanupExtra = () => {
        window.removeEventListener("resize", onResize);
      };
    })().catch(console.error);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cleanupExtra?.();
      basemapRef.current?.remove();
      basemapRef.current = null;
      map?.remove();
      mapRef.current = null;
      playerRef.current = null;
      pinsRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once at start pose
  }, []);

  useEffect(() => {
    basemapRef.current?.setLocale(locale);
  }, [locale]);

  function hold(key: keyof typeof keysRef.current, down: boolean) {
    keysRef.current[key] = down;
    setHint(down ? "이동 중…" : "WASD · 방향키 · 아래 버튼");
  }

  const meta = travelModeMeta(travelMode);
  const kmh = Math.round(hudSpeed * 3.6);

  return (
    <div className={`absolute inset-0 ${active ? "" : "invisible pointer-events-none"}`} aria-hidden={!active}>
      <div ref={hostRef} className="absolute inset-0 z-0" />
      {!ready && (
        <div className="absolute inset-0 z-[400] grid place-items-center bg-black/40 text-sm text-white/70">
          지도를 불러오는 중…
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-24 z-[500] space-y-1 rounded-xl bg-black/50 px-3 py-2 text-xs text-white backdrop-blur md:left-5">
        <p className="font-semibold">
          {meta.label} · {kmh} km/h
        </p>
        <p className="text-white/70">
          근처 장소 {nearbyCount}곳 · {hint}
        </p>
      </div>

      {arrived && (
        <div className="pointer-events-auto absolute left-1/2 top-36 z-[500] w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl bg-black/70 p-3 text-center text-white shadow-xl backdrop-blur">
          <p className="text-[11px] text-amber-200/90">도착</p>
          <p className="mt-0.5 text-sm font-semibold">{arrived.name}</p>
          <button
            type="button"
            onClick={() => onOpenRoadview(arrived)}
            className="mt-2 w-full rounded-full bg-white px-3 py-2 text-xs font-semibold text-black"
          >
            거리뷰로 내려보기
          </button>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-36 right-3 z-[500] flex flex-col gap-2 md:bottom-40 md:right-5">
        <button
          type="button"
          onClick={() => onOpenRoadview(arrived)}
          className="rounded-full bg-black/55 px-3 py-2 text-[11px] text-white ring-1 ring-white/25 backdrop-blur"
        >
          여기 거리뷰
        </button>
      </div>

      <div className="pointer-events-auto absolute bottom-28 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-3 md:bottom-32">
        <button
          type="button"
          className="size-12 rounded-full bg-black/55 text-lg text-white ring-1 ring-white/30 backdrop-blur active:bg-white/25"
          onPointerDown={(e) => {
            e.preventDefault();
            hold("left", true);
          }}
          onPointerUp={() => hold("left", false)}
          onPointerLeave={() => hold("left", false)}
          aria-label="좌회전"
        >
          ←
        </button>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="size-12 rounded-full bg-black/55 text-lg text-white ring-1 ring-white/30 backdrop-blur active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              hold("up", true);
            }}
            onPointerUp={() => hold("up", false)}
            onPointerLeave={() => hold("up", false)}
            aria-label="전진"
          >
            ↑
          </button>
          <button
            type="button"
            className="size-12 rounded-full bg-black/55 text-lg text-white ring-1 ring-white/30 backdrop-blur active:bg-white/25"
            onPointerDown={(e) => {
              e.preventDefault();
              hold("down", true);
            }}
            onPointerUp={() => hold("down", false)}
            onPointerLeave={() => hold("down", false)}
            aria-label="후진"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          className="size-12 rounded-full bg-black/55 text-lg text-white ring-1 ring-white/30 backdrop-blur active:bg-white/25"
          onPointerDown={(e) => {
            e.preventDefault();
            hold("right", true);
          }}
          onPointerUp={() => hold("right", false)}
          onPointerLeave={() => hold("right", false)}
          aria-label="우회전"
        >
          →
        </button>
      </div>
    </div>
  );
}
