"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapArea, MapPlace } from "@/db/repo";
import type { Place } from "@/db/schema";
import { categoryColor, categoryGlyph, categoryIconSvg } from "@/lib/categories";
import { fetchMapSearch, fetchPlaceDetail, fetchPlaces, mergePlaces } from "@/lib/map-fetch";
import { attachOpenFreeMap, type BasemapHandle } from "@/lib/map-basemap";
import { scorePlaceSearch } from "@/lib/place-search";
import { enrichPlaceTags, formatHashtag } from "@/lib/place-tags";
import { sampleByCategory } from "@/lib/sample-by-category";
import { displayName } from "@/i18n/display-name";
import { SettingsMenu, useLocale, useT } from "@/i18n/locale";
import { ContributeLinkForm } from "@/components/contribute-link-form";
import { NearSuggestPanel } from "@/components/near-suggest-panel";
import { TripBoard } from "@/components/trip-board";
import { TripBriefCard } from "@/components/trip-brief-card";
import { ReportLinkButton } from "@/components/report-link-button";
import { SourceRankControls } from "@/components/source-rank-controls";
import { PlaceLikeControls } from "@/components/place-like-controls";
import { PlaceListControls } from "@/components/place-list-controls";
import { SourceVoteControls } from "@/components/source-vote-controls";
import {
  wanderPlaceWeight,
  weightedShufflePick,
  WANDER_FIT_ZOOM,
  WANDER_PICK_COUNT,
  WANDER_RADIUS_KM,
  type WanderMode,
} from "@/lib/near-suggest";
import { parseTripBrief, rechainBriefStops, type BriefStop, type TripBrief } from "@/lib/trip-brief";
import { saveTripBoardStops } from "@/lib/trip-board-storage";
import { ENABLE_COMMUNITY_WRITES } from "@/lib/features";
import { AffiliateCta } from "@/components/affiliate-cta";
import { ShareButton } from "@/components/share-button";
import { TravelKit } from "@/components/travel-kit";
import {
  clearDayShareFromUrl,
  parseDayShareSearch,
  tripBriefFromSharedPlaces,
} from "@/lib/day-share";
import { getStaticPlace } from "@/lib/static-map-data";
import { placeShareUrl } from "@/lib/site";
import { track } from "@/lib/track";
import { WORLD_LANDMARKS_200, type WorldLandmark } from "@/lib/world-landmarks-200";
import { WorldLandmarkDetail } from "@/components/world-landmark-detail";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // Seoul fallback
const NEAR_RADIUS_KM = 28;
const SEARCH_NEAR_RADIUS_KM = 25;
const NEAR_LIMIT = 220;
/** Show place pins once zoomed in this far (no search / city click required). */
const PLACE_PIN_ZOOM = 7;
const PLACE_PIN_CAP = 150;

function browseVisible(list: MapPlace[], reviewsOnly: boolean): MapPlace[] {
  if (!reviewsOnly) return list;
  // Keep editorial / described places even when "reviews only" is on —
  // otherwise curated spots (e.g. Guam) vanish next to reviewed Korea pins.
  const filtered = list.filter(
    (p) => p.source_count > 0 || Boolean(p.description) || Boolean(p.is_pick),
  );
  return filtered.length > 0 ? filtered : list;
}
/** Mercator-safe world extent — zoom-out floor so one world map just fills the view. */
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

function syncWorldMinZoom(map: L.Map) {
  // Max zoom at which the whole world still fits → use as minZoom so zoom-out stops there.
  const fitted = map.getBoundsZoom(WORLD_BOUNDS, false);
  const minZoom = Number.isFinite(fitted) ? Math.max(1, fitted) : 2;
  map.setMinZoom(minZoom);
  if (map.getZoom() < minZoom) map.setZoom(minZoom, { animate: false });
}

type Level = "city" | "district" | "place";

function fitLatLngs(map: L.Map, points: { lat: number; lng: number }[], maxZoom: number) {
  if (points.length === 0) {
    map.setView([36.5, 127.9], 6);
    return;
  }
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], Math.min(maxZoom, 12));
    return;
  }
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
  map.fitBounds(bounds, { padding: [56, 56], maxZoom });
}

function areaIcon(label: string, count: number, kind: "city" | "district", active: boolean) {
  const bg = kind === "city" ? "#1b4965" : "#2a7f9e";
  const w = kind === "city" ? 88 : 78;
  return L.divIcon({
    className: "",
    iconSize: [w, 40],
    iconAnchor: [w / 2, 20],
    html: `<button type="button" style="
      min-width:${w}px;height:40px;padding:0 12px;border-radius:999px;
      background:${bg};color:#fff;border:2px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,.28)${active ? ",0 0 0 4px rgba(42,127,158,.35)" : ""};
      cursor:pointer;font:600 12px/1.1 system-ui,sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    "><span>${label}</span><span style="font-weight:500;opacity:.85;font-size:10px">${count}곳</span></button>`,
  });
}

/** Map pin: teardrop for normal places, rounded-square + star for 좋은 카페 picks. */
function pinIcon(
  category: Place["category"],
  active: boolean,
  ariaLabel: string,
  opts?: { cafePick?: boolean },
) {
  const color = categoryColor[category];
  const cafePick = Boolean(opts?.cafePick);
  const w = active ? (cafePick ? 46 : 48) : cafePick ? 40 : 42;
  const h = active ? (cafePick ? 52 : 60) : cafePick ? 46 : 52;
  const glyphSize = active ? 20 : 18;
  const glyph = categoryIconSvg(category, glyphSize);
  const ring = active ? "0 0 0 5px rgba(27,73,101,.3)" : "none";

  if (cafePick) {
    // Soft rounded square with tip — clearly different silhouette from teardrop pins.
    const glyphTop = active ? 11 : 10;
    return L.divIcon({
      className: "pn-place-pin pn-cafe-pick-pin",
      iconSize: [w, h],
      iconAnchor: [w / 2, h - 2],
      popupAnchor: [0, -(h - 8)],
      html: `<button type="button" aria-label="${ariaLabel} · 좋은 카페" style="
        width:${w}px;height:${h}px;padding:0;border:0;background:transparent;cursor:pointer;
        filter:drop-shadow(0 3px 8px rgba(0,0,0,.42));
      ">
        <span style="position:relative;display:block;width:${w}px;height:${h}px;">
          <svg width="${w}" height="${h}" viewBox="0 0 40 52" aria-hidden="true" style="display:block">
            <path d="M8 3h24a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H24l-4 12-4-12H8a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z"
              fill="${color}" stroke="#fff" stroke-width="2.4"/>
            <path d="M29.2 9.2l1.35 2.75 3.05.44-2.2 2.15.52 3.03L29.2 16.1l-2.72 1.43.52-3.03-2.2-2.15 3.05-.44z"
              fill="#ffe8a3" stroke="#fff" stroke-width="0.8"/>
          </svg>
          <span style="
            position:absolute;left:50%;top:${glyphTop}px;transform:translateX(-50%);
            width:${glyphSize + 4}px;height:${glyphSize + 4}px;display:grid;place-items:center;color:#fff;
            ${active ? `box-shadow:${ring};border-radius:50%;` : ""}
          ">${glyph}</span>
        </span>
      </button>`,
    });
  }

  const glyphTop = active ? 15 : 13;
  return L.divIcon({
    className: "pn-place-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    popupAnchor: [0, -(h - 8)],
    html: `<button type="button" aria-label="${ariaLabel}" style="
      width:${w}px;height:${h}px;padding:0;border:0;background:transparent;cursor:pointer;
      filter:drop-shadow(0 3px 8px rgba(0,0,0,.4));
    ">
      <span style="
        position:relative;display:block;width:${w}px;height:${h}px;
      ">
        <svg width="${w}" height="${h}" viewBox="0 0 30 38" aria-hidden="true" style="display:block">
          <path d="M15 1C7.3 1 1 7.3 1 15.1 1 24.2 15 37 15 37s14-12.8 14-21.9C29 7.3 22.7 1 15 1z"
            fill="${color}" stroke="#fff" stroke-width="2.25"/>
        </svg>
        <span style="
          position:absolute;left:50%;top:${glyphTop}px;transform:translateX(-50%);
          width:${glyphSize + 4}px;height:${glyphSize + 4}px;display:grid;place-items:center;color:#fff;
          ${active ? `box-shadow:${ring};border-radius:50%;` : ""}
        ">${glyph}</span>
      </span>
    </button>`,
  });
}

function placeMarkerIcon(place: MapPlace, selectedPlaceId: string | null, ariaLabel: string) {
  return pinIcon(place.category, place.id === selectedPlaceId, ariaLabel, {
    cafePick: place.is_cafe_pick,
  });
}

/** Gold star pin with place name label above — world landmarks layer. */
function worldLandmarkStarIcon(landmark: WorldLandmark, active: boolean) {
  const label = landmark.name.length > 12 ? `${landmark.name.slice(0, 11)}…` : landmark.name;
  const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const star = active ? 28 : 22;
  const labelH = 18;
  const pad = 4;
  const w = Math.max(star + 8, safeLabel.length * 7 + 16);
  const h = labelH + pad + star + 4;
  const fill = active ? "#f5c518" : "#e8b923";
  const stroke = active ? "#fff8d6" : "#fff";
  return L.divIcon({
    className: "pn-world-landmark-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    html: `<button type="button" aria-label="${safeLabel}" style="
      width:${w}px;height:${h}px;padding:0;border:0;background:transparent;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;gap:${pad}px;
      filter:drop-shadow(0 2px 6px rgba(0,0,0,.45));
    ">
      <span style="
        max-width:${w}px;padding:2px 7px;border-radius:999px;
        background:rgba(15,23,32,.88);color:#fff;font:700 10px/1.2 system-ui,sans-serif;
        white-space:nowrap;letter-spacing:-0.02em;
        box-shadow:0 0 0 1px rgba(255,255,255,.2);
        ${active ? "background:#1b4965;" : ""}
      ">${safeLabel}</span>
      <svg width="${star}" height="${star}" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0">
        <path d="M12 2.2l2.85 6.55 7.05.66-5.35 4.7 1.65 6.85L12 17.4l-6.2 3.56 1.65-6.85-5.35-4.7 7.05-.66L12 2.2z"
          fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      </svg>
    </button>`,
  });
}

function CategoryBadge({ category, active = false }: { category: Place["category"]; active?: boolean }) {
  const color = categoryColor[category];
  return (
    <span
      className="grid size-7 shrink-0 place-items-center rounded-full text-white shadow-sm ring-2 ring-white"
      style={{ background: color, opacity: active ? 1 : 0.95 }}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[category]}</svg>`,
      }}
    />
  );
}

function CategoryFilterBar({
  options,
  value,
  onChange,
  className = "flex flex-wrap gap-1.5",
}: {
  options: [string, number][];
  value: string | "all";
  onChange: (next: string | "all") => void;
  className?: string;
}) {
  const t = useT();
  if (options.length === 0) return null;
  const total = options.reduce((sum, [, n]) => sum + n, 0);
  return (
    <div className={className} role="toolbar" aria-label={t.categoryFilter}>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
          value === "all" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
        }`}
      >
        {t.all} {total}
      </button>
      {options.map(([cat, n]) => {
        const key = cat as Place["category"];
        const on = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(on ? "all" : cat)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11px] ${
              on ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
            }`}
          >
            <span
              className="grid size-5 place-items-center rounded-full"
              style={{ background: on ? "rgba(255,255,255,.18)" : categoryColor[key] }}
              dangerouslySetInnerHTML={{
                __html: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" style="display:block;color:#fff">${categoryGlyph[key]}</svg>`,
              }}
            />
            {t.category[key] ?? cat} {n}
          </button>
        );
      })}
    </div>
  );
}

function PlaceListItem({
  place,
  active,
  onSelect,
}: {
  place: MapPlace;
  active: boolean;
  onSelect: (place: MapPlace) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const cityLabel = place.city_name
    ? displayName({ name: place.city_name, name_en: place.city_name_en }, locale)
    : null;
  const districtLabel = place.district_name
    ? displayName({ name: place.district_name, name_en: place.district_name_en }, locale)
    : null;
  const hasReviews = place.source_count > 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(place)}
        className={`mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition ${
          active ? "bg-white shadow-sm ring-1 ring-stone-200" : "hover:bg-white/70"
        }`}
      >
        <div className="flex items-start gap-3">
          {place.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.cover_url}
              alt=""
              className="size-12 shrink-0 rounded-xl object-cover bg-stone-200"
              draggable={false}
            />
          ) : (
            <CategoryBadge category={place.category} active={active} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate font-semibold text-stone-900">{displayName(place, locale)}</h2>
              <span className="shrink-0 text-[11px] text-stone-500">{t.category[place.category]}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {[cityLabel, districtLabel].filter(Boolean).join(" · ") || place.address}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  hasReviews
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-stone-100 text-stone-500 ring-1 ring-stone-200"
                }`}
              >
                {t.reviewBadge(place.source_count)}
              </span>
              {(place.like_count ?? 0) > 0 && (
                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-700 ring-1 ring-rose-200">
                  ♥ {place.like_count}
                </span>
              )}
              {place.is_pick && (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  {t.editorPick}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function placeMatchScore(place: MapPlace, q: string): number {
  return scorePlaceSearch(
    {
      name: place.name,
      nameEn: place.name_en,
      category: place.category,
      address: place.address,
      description: place.description,
      tags: place.tags,
      cityName: place.city_name,
      districtName: place.district_name,
    },
    q,
  );
}

export function MapExplorer({ areas }: { areas: MapArea[] }) {
  const t = useT();
  const { locale } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const worldLandmarkLayerRef = useRef<L.LayerGroup | null>(null);
  /** Stable marker instances for world landmarks — avoid full rebuild on selection. */
  const worldLandmarkMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const wanderCircleRef = useRef<L.Circle | null>(null);
  const boundaryRef = useRef<L.GeoJSON | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const basemapRef = useRef<BasemapHandle | null>(null);
  const fetchSeq = useRef(0);
  const boundarySeq = useRef(0);
  const wanderSeq = useRef(0);
  /** Last search query we auto-fit the map for — avoid re-fitting on every zoom (trackpad bounce). */
  const fittedSearchQ = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(7);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  /** Latest server search hits (includes area-nearby). Null when not searching. */
  const [searchHits, setSearchHits] = useState<MapPlace[] | null>(null);
  const [course, setCourse] = useState<TripBrief | null>(null);
  const [courseStops, setCourseStops] = useState<BriefStop[]>([]);
  const [dayOffer, setDayOffer] = useState<{ name: string } | null>(null);
  const [briefNeedsLoc, setBriefNeedsLoc] = useState(false);
  const [showCoursePool, setShowCoursePool] = useState(false);
  /** Keep a shared `?day=` course until the user runs a new search. */
  const sharedDayRef = useRef(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [level, setLevel] = useState<Level>("city");
  const [cityId, setCityId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchNearMe, setSearchNearMe] = useState(false);
  const [userLoc, setUserLoc] = useState(DEFAULT_CENTER);
  const [hasUserGps, setHasUserGps] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  /** Default on: map feels curated while blog coverage is still filling. */
  const [reviewsOnly, setReviewsOnly] = useState(true);
  const [wanderMode, setWanderMode] = useState<WanderMode | null>(null);
  const [wanderCats, setWanderCats] = useState<Place["category"][]>([]);
  const [wanderPool, setWanderPool] = useState<MapPlace[]>([]);
  const [wanderPicks, setWanderPicks] = useState<MapPlace[]>([]);
  const [wanderLoading, setWanderLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showWorldLandmarks, setShowWorldLandmarks] = useState(true);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const showPlacePins = mapZoom >= PLACE_PIN_ZOOM;
  const wanderActive = wanderMode != null;

  const selectedLandmark = useMemo(
    () => WORLD_LANDMARKS_200.find((l) => l.id === selectedLandmarkId) ?? null,
    [selectedLandmarkId],
  );
  const selectedLandmarkIndex = useMemo(
    () => (selectedLandmarkId ? WORLD_LANDMARKS_200.findIndex((l) => l.id === selectedLandmarkId) : -1),
    [selectedLandmarkId],
  );

  const cities = useMemo(() => areas.filter((a) => a.level === "city"), [areas]);
  const districts = useMemo(
    () => areas.filter((a) => a.level === "district" && a.parent_id === cityId),
    [areas, cityId],
  );

  const ingestPlaces = useEffectEvent((next: MapPlace[]) => {
    setPlaces((prev) => mergePlaces(prev, next));
  });

  const loadNearby = useEffectEvent(async (lat: number, lng: number) => {
    const seq = ++fetchSeq.current;
    setPlacesLoading(true);
    try {
      const next = await fetchPlaces({ lat, lng, radiusKm: NEAR_RADIUS_KM, limit: NEAR_LIMIT });
      if (seq !== fetchSeq.current) return;
      ingestPlaces(next);
    } catch (e) {
      console.error(e);
    } finally {
      if (seq === fetchSeq.current) setPlacesLoading(false);
    }
  });

  const paintUserMarker = useEffectEvent((lat: number, lng: number, fly: boolean, zoom = 11) => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#1b4965",
      fillOpacity: 1,
    }).addTo(map);
    if (fly) map.flyTo([lat, lng], zoom, { duration: 0.7 });
  });

  const paintWanderCircle = useEffectEvent((lat: number, lng: number, radiusKm: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (wanderCircleRef.current) {
      wanderCircleRef.current.remove();
      wanderCircleRef.current = null;
    }
    wanderCircleRef.current = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "#1b4965",
      weight: 1.5,
      opacity: 0.55,
      fillColor: "#1b4965",
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(map);
  });

  const clearWanderCircle = useEffectEvent(() => {
    wanderCircleRef.current?.remove();
    wanderCircleRef.current = null;
  });

  const applyWanderPicks = useEffectEvent((pool: MapPlace[], cats: Place["category"][]) => {
    let filtered = reviewsOnly ? pool.filter((p) => p.source_count > 0) : pool;
    if (cats.length > 0) filtered = filtered.filter((p) => cats.includes(p.category));
    // Guam / new spots often lack review links yet — still allow described & editorial picks.
    if (reviewsOnly && filtered.length === 0) {
      filtered = pool.filter((p) => Boolean(p.description) || p.is_pick);
      if (cats.length > 0) filtered = filtered.filter((p) => cats.includes(p.category));
    }
    const picks = weightedShufflePick(filtered, WANDER_PICK_COUNT, wanderPlaceWeight);
    setWanderPicks(picks);
    ingestPlaces(picks);
    return picks;
  });

  const runWander = useEffectEvent(async (mode: WanderMode, cats: Place["category"][], origin: { lat: number; lng: number }) => {
    const radiusKm = WANDER_RADIUS_KM[mode];
    const seq = ++wanderSeq.current;
    setWanderLoading(true);
    setQuery("");
    setSearchHits(null);
    setSearchNearMe(true);
    setLevel("city");
    setCityId(null);
    setDistrictId(null);
    paintUserMarker(origin.lat, origin.lng, true, WANDER_FIT_ZOOM[mode]);
    paintWanderCircle(origin.lat, origin.lng, radiusKm);
    try {
      const next = await fetchPlaces({
        lat: origin.lat,
        lng: origin.lng,
        radiusKm,
        limit: 250,
      });
      if (seq !== wanderSeq.current) return;
      ingestPlaces(next);
      setWanderPool(next);
      applyWanderPicks(next, cats);
    } catch (e) {
      console.error(e);
      if (seq === wanderSeq.current) {
        setWanderPool([]);
        setWanderPicks([]);
      }
    } finally {
      if (seq === wanderSeq.current) setWanderLoading(false);
    }
  });

  const requestUserGps = useEffectEvent((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          setHasUserGps(true);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
      );
    });
  });

  const loadBounds = useEffectEvent(async () => {
    const map = mapRef.current;
    if (!map || query.trim()) return;
    const b = map.getBounds();
    const zoom = map.getZoom();
    // City overview stays light — only fetch pins when zoomed in enough.
    if (level === "city" && zoom < PLACE_PIN_ZOOM) return;
    const seq = ++fetchSeq.current;
    setPlacesLoading(true);
    try {
      const next = await fetchPlaces({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
        cityId: cityId ?? undefined,
        districtId: districtId ?? undefined,
        limit: zoom >= 12 ? 350 : 220,
      });
      if (seq !== fetchSeq.current) return;
      ingestPlaces(next);
    } catch (e) {
      console.error(e);
    } finally {
      if (seq === fetchSeq.current) setPlacesLoading(false);
    }
  });

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) {
      if (cityId && p.city_id !== cityId) continue;
      if (districtId && p.district_id !== districtId) continue;
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    // Prefer known category order, then fall back by count for anything unexpected.
    const known = (Object.keys(t.category) as Place["category"][])
      .filter((cat) => counts.has(cat))
      .map((cat) => [cat, counts.get(cat) ?? 0] as [string, number]);
    const extras = [...counts.entries()]
      .filter(([cat]) => !(cat in t.category))
      .sort((a, b) => b[1] - a[1]);
    return [...known, ...extras];
  }, [places, cityId, districtId, t.category]);

  const city = cities.find((c) => c.id === cityId) ?? null;
  const district = areas.find((a) => a.id === districtId) ?? null;
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;
  const searchQ = query.trim().toLowerCase();
  const isSearching = searchQ.length > 0;
  const parsedQuery = useMemo(() => parseTripBrief(query), [query]);
  const showSearchList = courseStops.length === 0 || showCoursePool;

  const visiblePlaces = useMemo(() => {
    if (!isSearching) {
      let list = places;
      if (cityId) list = list.filter((p) => p.city_id === cityId);
      if (districtId) list = list.filter((p) => p.district_id === districtId);
      if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
      return browseVisible(list, reviewsOnly);
    }

    // Prefer server search hits (already includes matched 동/시 + nearby).
    // Don't re-filter by name — that dropped 원당시장 etc. next to "주교동".
    // Nationwide text search — ignore selected city/district; optional category chip only.
    let list = searchHits ?? places.filter((p) => placeMatchScore(p, searchQ) > 0);
    if (!searchHits) {
      list = [...list].sort((a, b) => placeMatchScore(b, searchQ) - placeMatchScore(a, searchQ));
    }
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    // Search shows the full match set (including thin/empty); reviewsOnly is browse-only.
    return list.slice(0, 200);
  }, [places, searchHits, cityId, districtId, searchQ, isSearching, categoryFilter, reviewsOnly]);

  const listCities = useMemo(() => {
    if (!isSearching) return cities;
    return cities
      .filter((c) => c.name.toLowerCase().includes(searchQ))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(searchQ) ? 1 : 0;
        const bs = b.name.toLowerCase().startsWith(searchQ) ? 1 : 0;
        return bs - as || a.name.localeCompare(b.name, "ko");
      });
  }, [cities, searchQ, isSearching]);

  const listDistricts = useMemo(() => {
    if (!isSearching) return districts;
    // When searching from top, also surface districts whose name matches.
    const pool = cityId ? districts : areas.filter((a) => a.level === "district");
    return pool
      .filter((d) => d.name.toLowerCase().includes(searchQ))
      .sort((a, b) => b.place_count - a.place_count)
      .slice(0, 20);
  }, [districts, areas, cityId, searchQ, isSearching]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    // Custom wheel zoom: no trackpad inertia, ~3× stronger than previous (30px / zoom level).
    const map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      zoomSnap: 0,
      zoomDelta: 1,
      minZoom: 2,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1,
      worldCopyJump: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    worldLandmarkLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    syncWorldMinZoom(map);
    // Start on Seoul until GPS resolves — avoid a brief Korea-wide flash.
    map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11, { animate: false });
    setMapZoom(11);
    setMapReady(true);

    let cancelled = false;
    void attachOpenFreeMap(map, locale, L).then((handle) => {
      if (cancelled) {
        handle.remove();
        return;
      }
      basemapRef.current = handle;
    }).catch((err) => {
      console.warn("[map] basemap attach failed", err);
    });

    // Proportional zoom: small finger move → small zoom; no snap, no inertia drip.
    const WHEEL_PX_PER_ZOOM = 60;
    let lastWheelTs = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      if (e.deltaMode === 2) dy *= map.getSize().y;
      const abs = Math.abs(dy);
      if (abs < 0.05) return;

      const now = performance.now();
      // Only drop true inertia tails (long gap + tiny drip), keep intentional fine nudges.
      if (now - lastWheelTs > 140 && abs < 1.5) return;
      lastWheelTs = now;

      const next = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), map.getZoom() - dy / WHEEL_PX_PER_ZOOM),
      );
      // Zoom around map center (not cursor) so the view doesn't drift off-screen.
      const centerPt = map.getSize().divideBy(2);
      map.setZoomAround(centerPt, next, { animate: false });
    };
    host.addEventListener("wheel", onWheel, { passive: false });

    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    const onZoomEnd = () => setMapZoom(map.getZoom());
    const onMoveEnd = () => {
      setMapZoom(map.getZoom());
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        void loadBounds();
      }, 280);
    };
    map.on("zoomend", onZoomEnd);
    map.on("moveend", onMoveEnd);

    const onResize = () => {
      if (cancelled || mapRef.current !== map) return;
      try {
        map.invalidateSize();
        syncWorldMinZoom(map);
      } catch {
        /* map may already be tearing down */
      }
    };
    window.addEventListener("resize", onResize);
    const rafId = requestAnimationFrame(() => {
      if (cancelled || mapRef.current !== map) return;
      try {
        map.invalidateSize();
        syncWorldMinZoom(map);
      } catch {
        /* ignore stale frame after unmount */
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (moveTimer) clearTimeout(moveTimer);
      host.removeEventListener("wheel", onWheel);
      map.off("zoomend", onZoomEnd);
      map.off("moveend", onMoveEnd);
      window.removeEventListener("resize", onResize);
      basemapRef.current?.remove();
      basemapRef.current = null;
      wanderCircleRef.current?.remove();
      wanderCircleRef.current = null;
      routeRef.current?.remove();
      routeRef.current = null;
      worldLandmarkLayerRef.current?.clearLayers();
      worldLandmarkLayerRef.current = null;
      worldLandmarkMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userMarkerRef.current = null;
      setMapReady(false);
    };
    // locale applied via separate effect — don't rebuild the map on lang change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  useEffect(() => {
    basemapRef.current?.setLocale(locale);
  }, [locale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      try {
        map.invalidateSize();
      } catch {
        /* ignore */
      }
    }, 240);
    return () => clearTimeout(timer);
  }, [panelOpen]);

  // Boot: Seoul nearby immediately; GPS ok → fly to me + reload nearby.
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;

    const apply = async (lat: number, lng: number, fly: boolean, gps: boolean) => {
      if (cancelled) return;
      paintUserMarker(lat, lng, fly);
      setHasUserGps(gps);
      await loadNearby(lat, lng);
    };

    // Always show something useful while (or if) GPS is pending/denied.
    setUserLoc(DEFAULT_CENTER);
    void apply(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false, false);

    if (!navigator.geolocation) {
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLoc({ lat, lng });
        void apply(lat, lng, true, true);
      },
      () => {
        // Stay on Seoul — already applied above.
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  // Re-roll near picks when the reviews filter flips while wander is open.
  useEffect(() => {
    if (!wanderActive || wanderPool.length === 0) return;
    applyWanderPicks(wanderPool, wanderCats);
  }, [reviewsOnly]);

  // Restore shared day course from `/?day=m:id,l:id&dt=...` (static, no server).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseDayShareSearch(window.location.search);
    if (!parsed) return;
    let cancelled = false;
    void (async () => {
      const entries: { role: (typeof parsed.stops)[number]["role"]; place: MapPlace }[] = [];
      for (const stop of parsed.stops) {
        const place = await getStaticPlace(stop.placeId);
        if (place) entries.push({ role: stop.role, place });
      }
      if (cancelled || entries.length === 0) return;
      const brief = tripBriefFromSharedPlaces(entries, parsed.title);
      if (!brief) return;
      sharedDayRef.current = true;
      setCourse(brief);
      setCourseStops(brief.stops);
      setDayOffer(null);
      setBriefNeedsLoc(false);
      setShowCoursePool(false);
      ingestPlaces(entries.map((e) => e.place));
      track("day_share_open", { stops: entries.length });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search when typing — client brief for static export.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchHits(null);
      if (!sharedDayRef.current) {
        setCourse(null);
        setCourseStops([]);
      }
      setDayOffer(null);
      setBriefNeedsLoc(false);
      setShowCoursePool(false);
      fittedSearchQ.current = null;
      return;
    }
    sharedDayRef.current = false;
    clearDayShareFromUrl();
    const seq = ++fetchSeq.current;
    const timer = setTimeout(() => {
      setPlacesLoading(true);
      const params: Record<string, string | number | undefined> = { q, limit: 200 };
      if (parsedQuery.near) {
        if (hasUserGps) {
          params.lat = userLoc.lat;
          params.lng = userLoc.lng;
        }
      } else if (searchNearMe) {
        params.lat = userLoc.lat;
        params.lng = userLoc.lng;
        params.radiusKm = SEARCH_NEAR_RADIUS_KM;
        params.scope = "near";
      }
      void fetchMapSearch(params)
        .then((res) => {
          if (seq !== fetchSeq.current) return;
          setSearchHits(res.places);
          setCourse(res.brief);
          setCourseStops(res.brief?.stops ?? []);
          setDayOffer(res.dayOffer);
          setBriefNeedsLoc(res.briefNeedsLoc);
          setShowCoursePool(false);
          const extra = res.brief
            ? res.brief.stops.flatMap((stop) => [stop.place, ...stop.alternates])
            : [];
          ingestPlaces([...res.places, ...extra]);
        })
        .catch(console.error)
        .finally(() => {
          if (seq === fetchSeq.current) setPlacesLoading(false);
        });
    }, 220);
    return () => clearTimeout(timer);
  }, [query, parsedQuery.near, searchNearMe, hasUserGps, userLoc.lat, userLoc.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const q = query.trim();
    if (boundaryRef.current) {
      boundaryRef.current.remove();
      boundaryRef.current = null;
    }
    if (!map || !q || searchNearMe || parsedQuery.isBrief) return;
    const seq = ++boundarySeq.current;
    const timer = setTimeout(() => {
      void fetch(`/api/map/boundary?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { geojson?: GeoJSON.GeoJSON } | null) => {
          if (!data?.geojson || seq !== boundarySeq.current || !mapRef.current) return;
          const layer = L.geoJSON(data.geojson, {
            style: {
              color: "#1b4965",
              weight: 2,
              opacity: 0.9,
              fillColor: "#1b4965",
              fillOpacity: 0.08,
            },
            interactive: false,
          }).addTo(mapRef.current);
          boundaryRef.current = layer;
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
          }
        })
        .catch(() => {});
    }, 280);
    return () => clearTimeout(timer);
  }, [query, searchNearMe, mapReady, parsedQuery.isBrief]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !mapReady) return;
    layer.clearLayers();
    routeRef.current?.remove();
    routeRef.current = null;

    if (courseStops.length > 0) {
      if (courseStops.length >= 2) {
        routeRef.current = L.polyline(
          courseStops.map((stop) => [stop.place.lat, stop.place.lng] as [number, number]),
          { color: "#1b4965", weight: 3, opacity: 0.9, interactive: false },
        ).addTo(map);
      }
      courseStops.forEach((stop) => {
        const place = stop.place;
        const marker = L.marker([place.lat, place.lng], {
          icon: placeMarkerIcon(place, selectedPlaceId, t.category[place.category]),
          title: `${displayName(place, locale)} · ${t.category[place.category]}`,
          zIndexOffset: 500,
        });
        marker.on("click", () => openPlace(place));
        marker.addTo(layer);
      });
      const fitKey = `brief|${courseStops.map((stop) => stop.place.id).join(",")}`;
      if (fittedSearchQ.current !== fitKey) {
        fittedSearchQ.current = fitKey;
        fitLatLngs(
          map,
          courseStops.map((stop) => stop.place),
          14,
        );
      }
      return;
    }

    if (wanderActive && !isSearching) {
      wanderPicks.forEach((place) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: placeMarkerIcon(place, selectedPlaceId, t.category[place.category]),
          title: `${displayName(place, locale)} · ${t.category[place.category]}${place.is_cafe_pick ? " · 좋은 카페" : ""}`,
          zIndexOffset: place.is_cafe_pick ? 400 : 0,
        });
        marker.on("click", () => openPlace(place));
        marker.addTo(layer);
      });
      return;
    }

    if (isSearching) {
      visiblePlaces.forEach((place) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: placeMarkerIcon(place, selectedPlaceId, t.category[place.category]),
          title: `${displayName(place, locale)} · ${t.category[place.category]}${place.is_cafe_pick ? " · 좋은 카페" : ""}`,
          zIndexOffset: place.is_cafe_pick ? 400 : 0,
        });
        marker.on("click", () => openPlace(place));
        marker.addTo(layer);
      });
      // Fit once per search query — refitting on zoomend caused trackpad zoom rebound.
      const fitKey = `${searchQ}|${searchNearMe ? "near" : "all"}`;
      if (visiblePlaces.length && fittedSearchQ.current !== fitKey) {
        fittedSearchQ.current = fitKey;
        fitLatLngs(map, visiblePlaces, searchNearMe ? 14 : 12);
      }
      return;
    }

    const paintPlacePins = (candidates: MapPlace[], cap = PLACE_PIN_CAP) => {
      const bounds = map.getBounds();
      const inView = candidates.filter((p) => bounds.contains([p.lat, p.lng]));
      // If filter left the viewport empty, still show whatever we loaded in-bounds.
      const pool =
        inView.length > 0
          ? inView
          : places.filter((p) => bounds.contains([p.lat, p.lng]));
      sampleByCategory(
        pool,
        cap,
        (p) => p.category,
        (p) => (p.pin_score ?? 0) + (p.is_cafe_pick ? 200 : 0),
      ).forEach((place) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: placeMarkerIcon(place, selectedPlaceId, t.category[place.category]),
          title: `${displayName(place, locale)} · ${t.category[place.category]}${place.is_cafe_pick ? " · 좋은 카페" : ""}`,
          zIndexOffset: place.is_cafe_pick ? 400 : 0,
        });
        marker.on("click", () => openPlace(place));
        marker.addTo(layer);
      });
    };

    if (level === "city") {
      // Keep city chips while overview-ish; fade them out once pins take over.
      if (!showPlacePins || mapZoom < 10) {
        listCities.forEach((area) => {
          const label = displayName(area, locale);
          const marker = L.marker([area.lat, area.lng], {
            icon: areaIcon(label, area.place_count, "city", area.id === cityId),
            title: label,
          });
          marker.on("click", () => enterCity(area));
          marker.addTo(layer);
        });
      }
      if (showPlacePins) paintPlacePins(visiblePlaces);
      return;
    }

    if (level === "district") {
      if (!showPlacePins || mapZoom < 11) {
        listDistricts.forEach((area) => {
          const label = displayName(area, locale);
          const marker = L.marker([area.lat, area.lng], {
            icon: areaIcon(label, area.place_count, "district", area.id === districtId),
            title: label,
          });
          marker.on("click", () => enterDistrict(area));
          marker.addTo(layer);
        });
      }
      paintPlacePins(visiblePlaces);
      return;
    }

    paintPlacePins(visiblePlaces);
  }, [
    level,
    listCities,
    listDistricts,
    visiblePlaces,
    selectedPlaceId,
    mapReady,
    mapZoom,
    showPlacePins,
    cityId,
    districtId,
    isSearching,
    searchNearMe,
    searchQ,
    places,
    locale,
    t.category,
    wanderActive,
    wanderPicks,
    courseStops,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = worldLandmarkLayerRef.current;
    if (!map || !layer || !mapReady) return;

    if (!showWorldLandmarks) {
      layer.clearLayers();
      worldLandmarkMarkersRef.current.clear();
      return;
    }

    if (worldLandmarkMarkersRef.current.size === 0) {
      WORLD_LANDMARKS_200.forEach((landmark) => {
        const marker = L.marker([landmark.lat, landmark.lng], {
          icon: worldLandmarkStarIcon(landmark, false),
          title: `${landmark.name} · ${landmark.country}`,
          zIndexOffset: 250,
          keyboard: false,
        });
        marker.on("click", () => {
          setSelectedLandmarkId(landmark.id);
          setSelectedPlaceId(null);
          if (mapRef.current === map) {
            map.flyTo([landmark.lat, landmark.lng], Math.max(map.getZoom(), 5), { duration: 0.55 });
          }
          track("world_landmark_open", { id: landmark.id, name: landmark.name });
        });
        marker.addTo(layer);
        worldLandmarkMarkersRef.current.set(landmark.id, marker);
      });
    }

    worldLandmarkMarkersRef.current.forEach((marker, id) => {
      const landmark = WORLD_LANDMARKS_200.find((l) => l.id === id);
      if (!landmark) return;
      const active = id === selectedLandmarkId;
      try {
        marker.setIcon(worldLandmarkStarIcon(landmark, active));
        marker.setZIndexOffset(active ? 900 : 250);
      } catch {
        /* icon swap during teardown */
      }
    });
  }, [mapReady, showWorldLandmarks, selectedLandmarkId]);

  function swapCourseStop(index: number) {
    if (!course) return;
    setCourseStops((prev) => {
      const stop = prev[index];
      if (!stop || stop.alternates.length === 0) return prev;
      const taken = new Set(prev.filter((_, i) => i !== index).map((row) => row.place.id));
      const nextPlace = stop.alternates.find((place) => !taken.has(place.id));
      if (!nextPlace) return prev;
      const alternates = [...stop.alternates.filter((place) => place.id !== nextPlace.id), stop.place].filter(
        (place) => !taken.has(place.id),
      );
      const next = prev.map((row, i) => (i === index ? { ...row, place: nextPlace, alternates } : row));
      return rechainBriefStops(next, course.origin);
    });
  }

  function saveCourse() {
    saveTripBoardStops(
      courseStops.map((stop) => ({
        id: stop.place.id,
        name: stop.place.name,
        name_en: stop.place.name_en,
        lat: stop.place.lat,
        lng: stop.place.lng,
        category: stop.place.category,
        role: stop.role,
        access: stop.access,
        verdict: stop.verdict,
      })),
    );
  }

  async function openPlace(place: MapPlace) {
    setCityId(place.city_id);
    setDistrictId(place.district_id);
    setLevel("place");
    setSelectedPlaceId(place.id);
    mapRef.current?.flyTo([place.lat, place.lng], Math.max(mapRef.current.getZoom(), 14), { duration: 0.45 });
    try {
      const detail = await fetchPlaceDetail(place.id);
      if (detail) ingestPlaces([detail]);
    } catch (e) {
      console.error(e);
    }
  }

  function enterCity(area: MapArea) {
    setLevel("district");
    setCityId(area.id);
    setDistrictId(null);
    setSelectedPlaceId(null);
    setQuery("");
    const kids = areas.filter((a) => a.level === "district" && a.parent_id === area.id);
    mapRef.current && fitLatLngs(mapRef.current, kids.length ? kids : [area], 12);
    void fetchPlaces({ cityId: area.id, limit: 250 })
      .then(ingestPlaces)
      .catch(console.error);
  }

  function enterDistrict(area: MapArea) {
    setLevel("place");
    setCityId(area.parent_id);
    setDistrictId(area.id);
    setSelectedPlaceId(null);
    setQuery("");
    const pts = places.filter((p) => p.district_id === area.id);
    mapRef.current && fitLatLngs(mapRef.current, pts.length ? pts : [area], 15);
    void fetchPlaces({ districtId: area.id, limit: 300 })
      .then(ingestPlaces)
      .catch(console.error);
  }

  function goCities() {
    setLevel("city");
    setCityId(null);
    setDistrictId(null);
    setSelectedPlaceId(null);
    setQuery("");
    setWanderMode(null);
    setWanderPicks([]);
    setWanderPool([]);
    clearWanderCircle();
    mapRef.current && fitLatLngs(mapRef.current, cities, 7);
  }

  function closeWander() {
    setWanderMode(null);
    setWanderPicks([]);
    setWanderPool([]);
    clearWanderCircle();
  }

  async function startWander(mode: WanderMode) {
    setWanderMode(mode);
    let origin = userLoc;
    if (!hasUserGps) {
      const gps = await requestUserGps();
      if (!gps) return;
      origin = gps;
    }
    await runWander(mode, wanderCats, origin);
  }

  function toggleWanderCat(cat: Place["category"]) {
    const next = wanderCats.includes(cat)
      ? wanderCats.filter((c) => c !== cat)
      : [...wanderCats, cat];
    setWanderCats(next);
    if (wanderPool.length) applyWanderPicks(wanderPool, next);
  }

  function shuffleWander() {
    applyWanderPicks(wanderPool, wanderCats);
  }

  function goDistricts() {
    if (!city) return;
    setLevel("district");
    setDistrictId(null);
    setSelectedPlaceId(null);
    setQuery("");
    mapRef.current && fitLatLngs(mapRef.current, districts.length ? districts : [city], 12);
  }

  const cityLabel = city ? displayName(city, locale) : "";
  const districtLabel = district ? displayName(district, locale) : "";
  const title =
    level === "city"
      ? t.pickCity
      : level === "district"
        ? t.districtLevel(cityLabel)
        : t.placeLevel(districtLabel);
  const showCategoryFilter =
    categoryOptions.length > 0 &&
    (showPlacePins || level !== "city" || isSearching || categoryFilter !== "all");
  const showFilteredPlaceList =
    !isSearching &&
    (level === "place" ||
      categoryFilter !== "all" ||
      (level === "city" && showPlacePins) ||
      (level === "district" && showPlacePins && categoryFilter !== "all"));

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      <aside
        className={`z-10 flex w-full flex-col border-[var(--border-soft)] bg-[var(--background-panel)] transition-[max-height,width] duration-200 ${
          panelOpen
            ? "max-h-[min(62vh,38rem)] overflow-y-auto overscroll-contain border-b md:max-h-none md:overflow-hidden md:w-[380px] md:border-b-0 md:border-r"
            : "max-h-0 overflow-hidden border-b-0 md:w-0 md:border-r-0"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-[var(--border-soft)]/70 bg-[var(--background-panel)] px-5 pb-2.5 pt-[max(0.875rem,env(safe-area-inset-top))] md:static md:pt-4">
          <div className="flex items-start justify-between gap-3">
            <Image
              src="/logo-brand.png"
              alt={t.brand}
              width={190}
              height={52}
              priority
              className="h-10 w-auto object-contain object-left"
            />
            <SettingsMenu className="shrink-0" />
          </div>
          <a
            href="https://funnyfunny.cloud/"
            target="_blank"
            rel="noreferrer"
            className="ticket-stub mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none tracking-wide transition"
            aria-label="FunnyFunny Candy Ticket Booth — funnyfunny.cloud"
          >
            <span aria-hidden>🎟️</span>
            <span className="font-chrome font-bold tracking-[0.08em]">FUNNYFUNNY</span>
            <span className="text-[var(--ticket-coral)]">·</span>
            <span>캔디 티켓 부스</span>
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ENABLE_COMMUNITY_WRITES && (
              <Link
                href="/my-list"
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              >
                {t.myListNav}
              </Link>
            )}
            <Link
              href="/explore/"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
            >
              여행 테마
            </Link>
            <Link
              href="/picks"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              {t.picksNav}
            </Link>
            <Link
              href="/maldives"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
            >
              디갈리
            </Link>
            <Link
              href="/vlog"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
            >
              브이로그
            </Link>
            <Link
              href="/christmas"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#8b2635] ring-1 ring-rose-200 hover:bg-rose-50"
            >
              세계 크리스마스
            </Link>
            <button
              type="button"
              onClick={() => {
                const next = !showWorldLandmarks;
                setShowWorldLandmarks(next);
                if (!next) setSelectedLandmarkId(null);
                if (next && mapRef.current && mapRef.current.getZoom() > 5) {
                  mapRef.current.flyTo([20, 10], 2.4, { duration: 1.1 });
                }
                track("world_landmarks_toggle", { on: next });
              }}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ${
                showWorldLandmarks
                  ? "bg-amber-400/90 text-amber-950 ring-amber-500/60"
                  : "text-stone-600 ring-stone-200 hover:bg-stone-50"
              }`}
              aria-pressed={showWorldLandmarks}
            >
              ★ 세계 명소 200
            </button>
          </div>
        </header>

        <div className="min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
          <div className="px-5 pb-4 pt-3">
            <h1 className="font-ticket text-xl text-[var(--ticket-ink)] md:text-2xl">{t.mapTitle}</h1>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-600 md:line-clamp-none">
              {t.mapBlurb}
            </p>
            <TravelKit className="mt-3" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { href: "/explore/gangneung-trip/", label: "강릉 여행" },
                { href: "/explore/jeju-trip/", label: "제주 여행" },
                { href: "/explore/busan-trip/", label: "부산 여행" },
                { href: "/explore/gangneung-cafe/", label: "강릉 카페" },
                { href: "/explore/seoul-cafe/", label: "서울 카페" },
                { href: "/explore/jeonju-hanok/", label: "전주 한옥" },
                { href: "/p/", label: "후기 많은 곳" },
              ].map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  onClick={() => track("home_theme_chip", { href: chip.href })}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1b4965] ring-1 ring-sky-200 hover:bg-sky-50"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs">
              <button
                type="button"
                onClick={goCities}
                className={`rounded-full px-2.5 py-1 ${level === "city" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
              >
                {t.allCities}
              </button>
              {city && (
                <>
                  <span className="text-stone-400">/</span>
                  <button
                    type="button"
                    onClick={goDistricts}
                    className={`rounded-full px-2.5 py-1 ${level === "district" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                  >
                    {cityLabel}
                  </button>
                </>
              )}
              {district && level === "place" && (
                <>
                  <span className="text-stone-400">/</span>
                  <span className="rounded-full bg-stone-900 px-2.5 py-1 text-white">{districtLabel}</span>
                </>
              )}
            </nav>

            <label className="mt-3 block">
              <span className="sr-only">{t.searchLabel}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchNearMe ? t.searchPlaceholderNear : t.searchPlaceholderNationwide}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none ring-[var(--ticket-coral)]/30 placeholder:text-stone-400 focus:ring-2"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="inline-flex rounded-full bg-white p-0.5 text-[11px] font-semibold ring-1 ring-stone-200" role="group">
                <button
                  type="button"
                  onClick={() => setSearchNearMe(false)}
                  className={`rounded-full px-2.5 py-1 ${!searchNearMe ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
                >
                  {t.scopeNationwide}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchNearMe(true)}
                  className={`rounded-full px-2.5 py-1 ${searchNearMe ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
                >
                  {t.scopeNearMe}
                </button>
              </div>
              <div className="inline-flex rounded-full bg-white p-0.5 text-[11px] font-semibold ring-1 ring-stone-200" role="group">
                <button
                  type="button"
                  onClick={() => setReviewsOnly(true)}
                  className={`rounded-full px-2.5 py-1 ${reviewsOnly ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
                >
                  {t.reviewsOnly}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewsOnly(false)}
                  className={`rounded-full px-2.5 py-1 ${!reviewsOnly ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}
                >
                  {t.reviewsAll}
                </button>
              </div>
            </div>

            <NearSuggestPanel
              active={wanderActive}
              mode={wanderMode}
              cats={wanderCats}
              picks={wanderPicks}
              poolSize={
                wanderPool.filter((p) => {
                  if (reviewsOnly && p.source_count <= 0) return false;
                  if (wanderCats.length > 0 && !wanderCats.includes(p.category)) return false;
                  return true;
                }).length
              }
              loading={wanderLoading}
              hasGps={hasUserGps}
              origin={userLoc}
              selectedPlaceId={selectedPlaceId}
              onMode={(m) => void startWander(m)}
              onToggleCat={toggleWanderCat}
              onShuffle={shuffleWander}
              onClose={closeWander}
              onEnableLoc={() => {
                void (async () => {
                  const gps = await requestUserGps();
                  if (gps && wanderMode) await runWander(wanderMode, wanderCats, gps);
                })();
              }}
              onSelect={(place) => void openPlace(place)}
            />

            <TripBoard
              origin={userLoc}
              hasGps={hasUserGps}
              onSelect={(place) => void openPlace(place)}
            />

            {showCategoryFilter && !wanderActive && (
              <CategoryFilterBar
                options={categoryOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
                className="mt-3 flex flex-wrap gap-1.5"
              />
            )}
            <p className="mt-2 text-[11px] font-medium tracking-wide text-stone-500">
              {placesLoading
                ? t.loadingNearby
                : isSearching
                  ? courseStops.length > 0
                    ? t.briefStatus(courseStops.length)
                    : t.searchResults(visiblePlaces.length, listCities.length)
                  : categoryFilter !== "all"
                    ? `${t.category[categoryFilter as Place["category"]] ?? categoryFilter} · ${t.placesCount(visiblePlaces.length)}`
                    : t.loadedCount(title, places.length)}
            </p>
          </div>

          <ul className="px-3 pb-4">
          {isSearching ? (
            <>
              {dayOffer && courseStops.length === 0 && (
                <li className="mb-2">
                  <button
                    type="button"
                    onClick={() => setQuery(`${dayOffer.name} 하루`)}
                    className="w-full rounded-2xl bg-white/80 px-3 py-2.5 text-left text-[12px] font-semibold text-[#1b4965] ring-1 ring-stone-200 hover:bg-white"
                  >
                    {t.briefPlanDay(dayOffer.name)}
                  </button>
                </li>
              )}
              {briefNeedsLoc && (
                <li className="mb-2 rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-stone-200">
                  <p className="text-[12px] leading-relaxed text-stone-600">{t.briefNeedsLoc}</p>
                  <button
                    type="button"
                    onClick={() => void requestUserGps()}
                    className="mt-2 rounded-full bg-[#1b4965] px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    {t.nearSuggestEnableLoc}
                  </button>
                </li>
              )}
              {course && courseStops.length > 0 && (
                <li className="mb-2">
                  <TripBriefCard
                    brief={course}
                    stops={courseStops}
                    onSwap={swapCourseStop}
                    onSave={saveCourse}
                    onSelect={(place) => void openPlace(place)}
                  />
                </li>
              )}
              {courseStops.length > 0 &&
                (visiblePlaces.length > 0 || listCities.length > 0 || listDistricts.length > 0) && (
                  <li className="mb-2 px-1">
                    <button
                      type="button"
                      onClick={() => setShowCoursePool((open) => !open)}
                      className="text-[11px] font-semibold text-[#1b4965] hover:underline"
                    >
                      {showCoursePool ? t.briefLess : t.briefMore}
                    </button>
                  </li>
                )}
              {showSearchList &&
                (visiblePlaces.length === 0 && listCities.length === 0 && listDistricts.length === 0 ? (
                  courseStops.length === 0 && !briefNeedsLoc ? <Empty /> : null
                ) : (
              <>
                {visiblePlaces.map((place) => (
                  <PlaceListItem
                    key={place.id}
                    place={place}
                    active={place.id === selectedPlaceId}
                    onSelect={openPlace}
                  />
                ))}
                {listCities.length > 0 && (
                  <li className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-wide text-stone-500">{t.citiesSection}</li>
                )}
                {listCities.map((area) => (
                  <li key={`city-${area.id}`}>
                    <button
                      type="button"
                      onClick={() => enterCity(area)}
                      className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-semibold text-stone-900">{displayName(area, locale)}</h2>
                        <span className="text-[11px] text-stone-500">{t.placesCount(area.place_count)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">{t.goToCity}</p>
                    </button>
                  </li>
                ))}
                {listDistricts.length > 0 && (
                  <li className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-wide text-stone-500">{t.districtsSection}</li>
                )}
                {listDistricts.map((area) => (
                  <li key={`district-${area.id}`}>
                    <button
                      type="button"
                      onClick={() => enterDistrict(area)}
                      className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-semibold text-stone-900">{displayName(area, locale)}</h2>
                        <span className="text-[11px] text-stone-500">{t.placesCount(area.place_count)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">구·동으로 이동</p>
                    </button>
                  </li>
                ))}
              </>
              ))}
            </>
          ) : (
            <>
              {showFilteredPlaceList && (
                <>
                  {visiblePlaces.length === 0 ? (
                    <Empty />
                  ) : (
                    visiblePlaces.map((place) => (
                      <PlaceListItem
                        key={place.id}
                        place={place}
                        active={place.id === selectedPlaceId}
                        onSelect={openPlace}
                      />
                    ))
                  )}
                </>
              )}

              {!showFilteredPlaceList && level === "city" &&
                (listCities.length === 0 ? (
                  <Empty />
                ) : (
                  listCities.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => enterCity(area)}
                        className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h2 className="font-semibold text-stone-900">{displayName(area, locale)}</h2>
                          <span className="text-[11px] text-stone-500">{t.placesCount(area.place_count)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">구·동 {area.child_count}개 · 클릭해서 확대</p>
                      </button>
                    </li>
                  ))
                ))}

              {!showFilteredPlaceList && level === "district" &&
                (listDistricts.length === 0 ? (
                  <Empty />
                ) : (
                  listDistricts.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => enterDistrict(area)}
                        className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h2 className="font-semibold text-stone-900">{displayName(area, locale)}</h2>
                          <span className="text-[11px] text-stone-500">{t.placesCount(area.place_count)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">클릭해서 장소 보기</p>
                      </button>
                    </li>
                  ))
                ))}
            </>
          )}
          </ul>
        </div>
      </aside>

      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0 z-0" />
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-label={panelOpen ? t.collapsePanel : t.expandPanel}
          className="absolute left-3 top-1/2 z-[530] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-stone-700 shadow-md ring-1 ring-stone-200 hover:bg-stone-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {panelOpen ? <path d="M15 6 9 12l6 6" /> : <path d="m9 6 6 6-6 6" />}
          </svg>
        </button>
        {showCategoryFilter && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3 md:justify-start md:pl-3 md:pr-14">
            <div className="pointer-events-auto max-w-[min(100%,42rem)] overflow-x-auto rounded-2xl bg-[color-mix(in_srgb,var(--background-panel)_92%,white)] p-2 shadow-md ring-1 ring-[var(--border-soft)] backdrop-blur">
              <CategoryFilterBar
                options={categoryOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
                className="flex w-max gap-1.5"
              />
            </div>
          </div>
        )}
        {selectedPlace && (level === "place" || isSearching || wanderActive) && (
          <PlacePanel
            place={selectedPlace}
            onClose={() => setSelectedPlaceId(null)}
            onSourcesChanged={async (placeId) => {
              try {
                const detail = await fetchPlaceDetail(placeId);
                if (detail) ingestPlaces([detail]);
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}
      </div>

      {selectedLandmark && (
        <WorldLandmarkDetail
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmarkId(null)}
          onPrev={
            selectedLandmarkIndex > 0
              ? () => {
                  const prev = WORLD_LANDMARKS_200[selectedLandmarkIndex - 1];
                  if (prev) {
                    setSelectedLandmarkId(prev.id);
                    mapRef.current?.flyTo([prev.lat, prev.lng], Math.max(mapRef.current.getZoom(), 5), {
                      duration: 0.6,
                    });
                  }
                }
              : undefined
          }
          onNext={
            selectedLandmarkIndex >= 0 && selectedLandmarkIndex < WORLD_LANDMARKS_200.length - 1
              ? () => {
                  const next = WORLD_LANDMARKS_200[selectedLandmarkIndex + 1];
                  if (next) {
                    setSelectedLandmarkId(next.id);
                    mapRef.current?.flyTo([next.lat, next.lng], Math.max(mapRef.current.getZoom(), 5), {
                      duration: 0.6,
                    });
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function Empty() {
  const t = useT();
  return <li className="px-2 py-6 text-center text-sm text-stone-500">{t.emptySearch}</li>;
}

function PlaceHashtags({ place }: { place: MapPlace }) {
  const tags = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: place.sources.map((s) => `${s.title} ${s.snippet ?? ""}`),
  });

  if (!tags.length) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="장소 해시태그">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full bg-[#1b4965]/[0.08] px-2.5 py-1 text-[12px] font-semibold tracking-tight text-[#1b4965]"
        >
          {formatHashtag(tag)}
        </li>
      ))}
    </ul>
  );
}

function sourceBadge(src: MapPlace["sources"][number]) {
  if (src.type === "youtube" || src.provider === "youtube") {
    return { label: "YouTube", className: "bg-[#ff0000]/10 text-[#b00000]" };
  }
  if (src.provider === "naver_blog" || src.provider.includes("naver")) {
    return { label: "네이버 블로그", className: "bg-[#03c75a]/15 text-[#028a3f]" };
  }
  if (src.provider.includes("tistory")) {
    return { label: "티스토리", className: "bg-orange-100 text-orange-800" };
  }
  return { label: "후기", className: "bg-stone-100 text-stone-600" };
}

function PlacePanel({
  place,
  onClose,
  onSourcesChanged,
}: {
  place: MapPlace;
  onClose: () => void;
  onSourcesChanged?: (placeId: string) => void | Promise<void>;
}) {
  const t = useT();
  const { locale } = useLocale();
  const vibe = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: place.sources.map((s) => `${s.title} ${s.snippet ?? ""}`),
  });
  const cityLabel = place.city_name
    ? displayName({ name: place.city_name, name_en: place.city_name_en }, locale)
    : "";
  const districtLabel = place.district_name
    ? displayName({ name: place.district_name, name_en: place.district_name_en }, locale)
    : "";

  return (
    <section className="absolute inset-x-3 bottom-3 z-[500] max-h-[52%] overflow-y-auto rounded-2xl bg-white/95 shadow-xl backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:max-h-[75%] md:w-[380px]">
      {place.cover_url && (
        <div className="relative h-36 w-full overflow-hidden rounded-t-2xl bg-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={place.cover_url} alt="" className="h-full w-full object-cover" draggable={false} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <p className="absolute bottom-2 left-3 right-12 text-[11px] font-medium text-white/90">
            {t.category[place.category]}
            {vibe[0] ? ` · ${formatHashtag(vibe[0])}` : ""}
          </p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <CategoryBadge category={place.category} active />
            <div className="min-w-0">
              <p className="text-[11px] tracking-wide text-stone-500">
                {t.category[place.category]}
                {cityLabel ? ` · ${cityLabel}` : ""}
                {districtLabel ? ` ${districtLabel}` : ""}
              </p>
              <h2 className="font-display mt-0.5 text-xl text-stone-900">{displayName(place, locale)}</h2>
              {place.address && <p className="mt-1 text-xs text-stone-500">{place.address}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PlaceLikeControls
                  placeId={place.id}
                  likeCount={place.like_count ?? 0}
                  onLiked={() => onSourcesChanged?.(place.id)}
                />
                <PlaceListControls placeId={place.id} />
                {place.is_pick && (
                  <Link
                    href="/picks"
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200"
                  >
                    {t.editorPick}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ShareButton
              compact
              label={t.sharePlace}
              copiedLabel={t.sharePlaceCopied}
              title={`${displayName(place, locale)} · ${t.brand}`}
              text={
                locale === "en"
                  ? `Preview ${displayName(place, locale)} on Beyond the View — map + reviews before you go.`
                  : `${displayName(place, locale)} · 풍경너머에서 후기 지도로 미리 보기`
              }
              url={placeShareUrl(place.id)}
              event="share_place"
              eventProps={{ place_id: place.id, category: place.category }}
            />
            <Link
              href={`/trip/place/?id=${encodeURIComponent(place.id)}`}
              title={t.soloTrip}
              onClick={() => track("solo_trip_open", { place_id: place.id })}
              className="inline-flex items-center gap-1 rounded-full bg-[#1b4965] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#163a52]"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
                />
              </svg>
              {locale === "en" ? "Solo" : "나홀로"}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        </div>

        <PlaceHashtags place={place} />

        {place.description && <p className="mt-3 text-sm leading-relaxed text-stone-700">{place.description}</p>}

        <AffiliateCta
          className="mt-3"
          placeName={displayName(place, locale)}
          cityName={place.city_name}
        />

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">연결된 후기</h3>
          {place.sources.length === 0 ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm leading-relaxed text-stone-500">아직 등록된 링크가 없어요.</p>
              <ReportLinkButton placeId={place.id} />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {place.sources.map((src, i) => {
                const badge = sourceBadge(src);
                return (
                  <li key={src.id} className="rounded-xl border border-stone-200/90 bg-white px-3 py-2.5 shadow-sm">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block hover:opacity-85"
                      onClick={() =>
                        track("open_review", {
                          place_id: place.id,
                          source_id: src.id,
                          type: src.type,
                        })
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold tabular-nums text-stone-400">{i + 1}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        {src.view_count != null && (
                          <span className="text-[10px] text-stone-400">조회 {src.view_count.toLocaleString("ko-KR")}</span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-stone-900">{src.title}</p>
                      {src.snippet && (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-stone-500">{src.snippet}</p>
                      )}
                      <p className="mt-1.5 text-[11px] text-stone-500">
                        {[src.author, src.score != null ? `관련도 ${src.score}` : null].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#1b4965]">
                        {src.type === "youtube" ? t.viewVideo : t.viewOriginal}
                      </p>
                    </a>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SourceVoteControls
                          placeId={place.id}
                          sourceId={src.id}
                          communityScore={src.community_score ?? 0}
                          onVoted={() => onSourcesChanged?.(place.id)}
                        />
                        <SourceRankControls
                          placeId={place.id}
                          sourceId={src.id}
                          boost={src.boost ?? 0}
                          canUp={i > 0}
                          canDown={i < place.sources.length - 1}
                          onRanked={() => onSourcesChanged?.(place.id)}
                        />
                      </div>
                      <ReportLinkButton placeId={place.id} sourceId={src.id} sourceUrl={src.url} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <ContributeLinkForm placeId={place.id} onLinked={() => onSourcesChanged?.(place.id)} />
        </div>

        {place.course_id && (
          <div className="mt-4">
            <Link
              href={`/trip/${place.course_id}`}
              className="block rounded-xl border border-dashed border-stone-300 px-3 py-2 text-center text-xs text-stone-500 hover:border-stone-400 hover:text-stone-700"
            >
              코스 가상여행 열기
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
