"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapArea, MapPlace } from "@/db/repo";
import type { Place } from "@/db/schema";
import { categoryColor, categoryGlyph, categoryIconSvg, categoryLabel } from "@/lib/categories";
import { fetchPlaceDetail, fetchPlaces, mergePlaces } from "@/lib/map-fetch";
import { enrichPlaceTags, formatHashtag } from "@/lib/place-tags";
import { ReportLinkButton } from "@/components/report-link-button";
import { SourceRankControls } from "@/components/source-rank-controls";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // Seoul fallback
const NEAR_RADIUS_KM = 28;
const NEAR_LIMIT = 220;
/** Show place pins on the map once the user has zoomed in this far (no city click required). */
const PLACE_PIN_ZOOM = 9;
const PLACE_PIN_CAP = 150;

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

/** Teardrop map pin with category glyph — sized for glanceability on the map. */
function pinIcon(category: Place["category"], active: boolean) {
  const color = categoryColor[category];
  const w = active ? 48 : 42;
  const h = active ? 60 : 52;
  const glyphSize = active ? 22 : 20;
  const glyph = categoryIconSvg(category, glyphSize);
  const ring = active ? "0 0 0 5px rgba(27,73,101,.3)" : "none";
  const glyphTop = active ? 15 : 13;
  return L.divIcon({
    className: "pn-place-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    popupAnchor: [0, -(h - 8)],
    html: `<button type="button" aria-label="${categoryLabel[category]}" style="
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
  if (options.length === 0) return null;
  const total = options.reduce((sum, [, n]) => sum + n, 0);
  return (
    <div className={className} role="toolbar" aria-label="장소 카테고리 필터">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
          value === "all" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
        }`}
      >
        전체 {total}
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
            {categoryLabel[key] ?? cat} {n}
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
          <CategoryBadge category={place.category} active={active} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate font-semibold text-stone-900">{place.name}</h2>
              <span className="shrink-0 text-[11px] text-stone-500">{categoryLabel[place.category]}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {[place.city_name, place.district_name].filter(Boolean).join(" · ") || place.address}
            </p>
            <p className="mt-1 text-[11px] text-stone-500">연결된 후기 {place.source_count}건</p>
          </div>
        </div>
      </button>
    </li>
  );
}

function placeMatchScore(place: MapPlace, q: string): number {
  const name = place.name.toLowerCase();
  const city = place.city_name?.toLowerCase() ?? "";
  const district = place.district_name?.toLowerCase() ?? "";
  const address = place.address?.toLowerCase() ?? "";
  const cat = categoryLabel[place.category] ?? "";
  if (name === q) return 1000;
  if (name.startsWith(q)) return 900;
  if (name.includes(q)) return 700;
  if (district === q || district.startsWith(q)) return 500;
  if (city === q || city.startsWith(q)) return 400;
  if (district.includes(q) || city.includes(q)) return 300;
  if (address.includes(q)) return 200;
  const qBare = q.replace(/^#/, "");
  if (place.tags.some((t) => t.toLowerCase() === qBare || t.toLowerCase().includes(qBare))) return 450;
  if (cat.includes(q)) return 100;
  return 0;
}

export function MapExplorer({ areas }: { areas: MapArea[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const fetchSeq = useRef(0);
  /** Last search query we auto-fit the map for — avoid re-fitting on every zoom (trackpad bounce). */
  const fittedSearchQ = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(7);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  /** Latest server search hits (includes area-nearby). Null when not searching. */
  const [searchHits, setSearchHits] = useState<MapPlace[] | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [level, setLevel] = useState<Level>("city");
  const [cityId, setCityId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const showPlacePins = mapZoom >= PLACE_PIN_ZOOM;

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
    const known = (Object.keys(categoryLabel) as Place["category"][])
      .filter((cat) => counts.has(cat))
      .map((cat) => [cat, counts.get(cat) ?? 0] as [string, number]);
    const extras = [...counts.entries()]
      .filter(([cat]) => !(cat in categoryLabel))
      .sort((a, b) => b[1] - a[1]);
    return [...known, ...extras];
  }, [places, cityId, districtId]);

  const city = cities.find((c) => c.id === cityId) ?? null;
  const district = areas.find((a) => a.id === districtId) ?? null;
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;
  const searchQ = query.trim().toLowerCase();
  const isSearching = searchQ.length > 0;

  const visiblePlaces = useMemo(() => {
    if (!isSearching) {
      let list = places;
      if (cityId) list = list.filter((p) => p.city_id === cityId);
      if (districtId) list = list.filter((p) => p.district_id === districtId);
      if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
      return list;
    }

    // Prefer server search hits (already includes matched 동/시 + nearby).
    // Don't re-filter by name — that dropped 원당시장 etc. next to "주교동".
    let list = searchHits ?? places.filter((p) => placeMatchScore(p, searchQ) > 0);
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    return list.slice(0, 120);
  }, [places, searchHits, cityId, districtId, searchQ, isSearching, categoryFilter]);

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
    });
    L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    fitLatLngs(map, cities, 7);
    setMapZoom(map.getZoom());
    setMapReady(true);

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
      map.setZoomAround(map.mouseEventToContainerPoint(e), next, { animate: false });
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

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      if (moveTimer) clearTimeout(moveTimer);
      host.removeEventListener("wheel", onWheel);
      map.off("zoomend", onZoomEnd);
      map.off("moveend", onMoveEnd);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userMarkerRef.current = null;
      setMapReady(false);
    };
  }, [cities]);

  // Boot: nearby places from geolocation (or Seoul fallback).
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;

    const apply = async (lat: number, lng: number, fly: boolean) => {
      if (cancelled) return;
      const map = mapRef.current;
      if (map) {
        if (userMarkerRef.current) userMarkerRef.current.remove();
        userMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: "#1b4965",
          fillOpacity: 1,
        }).addTo(map);
        if (fly) map.flyTo([lat, lng], 11, { duration: 0.7 });
      }
      await loadNearby(lat, lng);
    };

    if (!navigator.geolocation) {
      void apply(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void apply(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {
        void apply(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  // Server search when typing — don't require the whole catalog in memory.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchHits(null);
      fittedSearchQ.current = null;
      return;
    }
    const seq = ++fetchSeq.current;
    const timer = setTimeout(() => {
      setPlacesLoading(true);
      void fetchPlaces({ q, limit: 120 })
        .then((next) => {
          if (seq !== fetchSeq.current) return;
          setSearchHits(next);
          ingestPlaces(next);
        })
        .catch(console.error)
        .finally(() => {
          if (seq === fetchSeq.current) setPlacesLoading(false);
        });
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !mapReady) return;
    layer.clearLayers();

    if (isSearching) {
      visiblePlaces.forEach((place) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: pinIcon(place.category, place.id === selectedPlaceId),
          title: `${place.name} · ${categoryLabel[place.category]}`,
        });
        marker.on("click", () => openPlace(place));
        marker.addTo(layer);
      });
      // Fit once per search query — refitting on zoomend caused trackpad zoom rebound.
      if (visiblePlaces.length && fittedSearchQ.current !== searchQ) {
        fittedSearchQ.current = searchQ;
        fitLatLngs(map, visiblePlaces, 12);
      }
      return;
    }

    if (level === "city") {
      // Keep city chips while overview-ish; fade them out once pins take over.
      if (!showPlacePins || mapZoom < 12) {
        listCities.forEach((area) => {
          const marker = L.marker([area.lat, area.lng], {
            icon: areaIcon(area.name, area.place_count, "city", area.id === cityId),
            title: area.name,
          });
          marker.on("click", () => enterCity(area));
          marker.addTo(layer);
        });
      }
      if (showPlacePins) {
        const bounds = map.getBounds();
        visiblePlaces
          .filter((p) => bounds.contains([p.lat, p.lng]))
          .slice(0, PLACE_PIN_CAP)
          .forEach((place) => {
            const marker = L.marker([place.lat, place.lng], {
              icon: pinIcon(place.category, place.id === selectedPlaceId),
              title: `${place.name} · ${categoryLabel[place.category]}`,
            });
            marker.on("click", () => openPlace(place));
            marker.addTo(layer);
          });
      }
      return;
    }

    if (level === "district") {
      if (!showPlacePins || mapZoom < 13) {
        listDistricts.forEach((area) => {
          const marker = L.marker([area.lat, area.lng], {
            icon: areaIcon(area.name, area.place_count, "district", area.id === districtId),
            title: area.name,
          });
          marker.on("click", () => enterDistrict(area));
          marker.addTo(layer);
        });
      }
      // Place pins respect the active category filter.
      const bounds = map.getBounds();
      visiblePlaces
        .filter((p) => !showPlacePins || bounds.contains([p.lat, p.lng]))
        .slice(0, PLACE_PIN_CAP)
        .forEach((place) => {
          const marker = L.marker([place.lat, place.lng], {
            icon: pinIcon(place.category, place.id === selectedPlaceId),
            title: `${place.name} · ${categoryLabel[place.category]}`,
          });
          marker.on("click", () => openPlace(place));
          marker.addTo(layer);
        });
      return;
    }

    visiblePlaces.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(place.category, place.id === selectedPlaceId),
        title: `${place.name} · ${categoryLabel[place.category]}`,
      });
      marker.on("click", () => openPlace(place));
      marker.addTo(layer);
    });
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
    places,
  ]);

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
    mapRef.current && fitLatLngs(mapRef.current, cities, 7);
  }

  function goDistricts() {
    if (!city) return;
    setLevel("district");
    setDistrictId(null);
    setSelectedPlaceId(null);
    setQuery("");
    mapRef.current && fitLatLngs(mapRef.current, districts.length ? districts : [city], 12);
  }

  const title =
    level === "city" ? "시 선택" : level === "district" ? `${city?.name ?? ""} · 구·동` : `${district?.name ?? ""} · 장소`;
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
      <aside className="z-10 flex max-h-[46vh] w-full flex-col border-b border-stone-200 bg-[#f7f5f1] md:max-h-none md:w-[380px] md:border-b-0 md:border-r">
        <header className="shrink-0 px-5 pb-3 pt-5">
          <p className="text-xs tracking-[0.28em] text-stone-500">풍경너머</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">여행지 지도</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            시 → 구·동 → 장소. 후기는 장소당 최대 10개(블로그 적합도·유튜브 조회수) 원문 링크로 연결합니다.
          </p>

          <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={goCities}
              className={`rounded-full px-2.5 py-1 ${level === "city" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
            >
              전체 시
            </button>
            {city && (
              <>
                <span className="text-stone-400">/</span>
                <button
                  type="button"
                  onClick={goDistricts}
                  className={`rounded-full px-2.5 py-1 ${level === "district" ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
                >
                  {city.name}
                </button>
              </>
            )}
            {district && level === "place" && (
              <>
                <span className="text-stone-400">/</span>
                <span className="rounded-full bg-stone-900 px-2.5 py-1 text-white">{district.name}</span>
              </>
            )}
          </nav>

          <label className="mt-3 block">
            <span className="sr-only">통합검색</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="경복궁, 해운대, 성수동…"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none ring-sky-700/30 placeholder:text-stone-400 focus:ring-2"
            />
          </label>

          {showCategoryFilter && (
            <CategoryFilterBar
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="mt-3 flex flex-wrap gap-1.5"
            />
          )}
          <p className="mt-2 text-[11px] font-medium tracking-wide text-stone-500">
            {placesLoading
              ? "주변 장소를 불러오는 중…"
              : isSearching
                ? `검색 · 장소 ${visiblePlaces.length}건${listCities.length ? ` · 시 ${listCities.length}` : ""}`
                : categoryFilter !== "all"
                  ? `${categoryLabel[categoryFilter as Place["category"]] ?? categoryFilter} · ${visiblePlaces.length}곳`
                  : `${title} · 로드 ${places.length}곳`}
          </p>
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {isSearching ? (
            visiblePlaces.length === 0 && listCities.length === 0 && listDistricts.length === 0 ? (
              <Empty />
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
                  <li className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-wide text-stone-500">시</li>
                )}
                {listCities.map((area) => (
                  <li key={`city-${area.id}`}>
                    <button
                      type="button"
                      onClick={() => enterCity(area)}
                      className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-semibold text-stone-900">{area.name}</h2>
                        <span className="text-[11px] text-stone-500">{area.place_count}곳</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">시로 이동</p>
                    </button>
                  </li>
                ))}
                {listDistricts.length > 0 && (
                  <li className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-wide text-stone-500">구·동</li>
                )}
                {listDistricts.map((area) => (
                  <li key={`district-${area.id}`}>
                    <button
                      type="button"
                      onClick={() => enterDistrict(area)}
                      className="mb-1.5 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/70"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-semibold text-stone-900">{area.name}</h2>
                        <span className="text-[11px] text-stone-500">{area.place_count}곳</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">구·동으로 이동</p>
                    </button>
                  </li>
                ))}
              </>
            )
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
                          <h2 className="font-semibold text-stone-900">{area.name}</h2>
                          <span className="text-[11px] text-stone-500">{area.place_count}곳</span>
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
                          <h2 className="font-semibold text-stone-900">{area.name}</h2>
                          <span className="text-[11px] text-stone-500">{area.place_count}곳</span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">클릭해서 장소 보기</p>
                      </button>
                    </li>
                  ))
                ))}
            </>
          )}
        </ul>
      </aside>

      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0 z-0" />
        {showCategoryFilter && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3 md:justify-start">
            <div className="pointer-events-auto max-w-[min(100%,42rem)] overflow-x-auto rounded-2xl bg-[#f7f5f1]/95 p-2 shadow-md ring-1 ring-stone-200/80 backdrop-blur">
              <CategoryFilterBar
                options={categoryOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
                className="flex w-max gap-1.5"
              />
            </div>
          </div>
        )}
        {selectedPlace && (level === "place" || isSearching) && (
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
    </div>
  );
}

function Empty() {
  return <li className="px-2 py-6 text-center text-sm text-stone-500">검색 결과가 없어요</li>;
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
  const vibe = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: place.sources.map((s) => `${s.title} ${s.snippet ?? ""}`),
  });

  return (
    <section className="absolute inset-x-3 bottom-3 z-[500] max-h-[52%] overflow-y-auto rounded-2xl bg-white/95 shadow-xl backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:max-h-[75%] md:w-[380px]">
      {place.cover_url && (
        <div className="relative h-36 w-full overflow-hidden rounded-t-2xl bg-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={place.cover_url} alt="" className="h-full w-full object-cover" draggable={false} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <p className="absolute bottom-2 left-3 right-12 text-[11px] font-medium text-white/90">
            {categoryLabel[place.category]}
            {vibe[0] ? ` · ${formatHashtag(vibe[0])}` : ""}
          </p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CategoryBadge category={place.category} active />
            <div className="min-w-0">
              <p className="text-[11px] tracking-wide text-stone-500">
                {categoryLabel[place.category]}
                {place.city_name ? ` · ${place.city_name}` : ""}
                {place.district_name ? ` ${place.district_name}` : ""}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-stone-900">{place.name}</h2>
              {place.address && <p className="mt-1 text-xs text-stone-500">{place.address}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <PlaceHashtags place={place} />

        {place.description && <p className="mt-3 text-sm leading-relaxed text-stone-700">{place.description}</p>}

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
                    <a href={src.url} target="_blank" rel="noreferrer" className="block hover:opacity-85">
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
                        {src.type === "youtube" ? "영상 보기 →" : "원문 보기 →"}
                      </p>
                    </a>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <SourceRankControls
                        placeId={place.id}
                        sourceId={src.id}
                        boost={src.boost ?? 0}
                        canUp={i > 0}
                        canDown={i < place.sources.length - 1}
                        onRanked={() => onSourcesChanged?.(place.id)}
                      />
                      <ReportLinkButton placeId={place.id} sourceId={src.id} sourceUrl={src.url} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Link
            href={`/trip/place/${place.id}`}
            className="block rounded-xl bg-[#1b4965] px-3 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#163a52]"
          >
            나홀로 여행 떠나기
          </Link>
          <p className="text-center text-[11px] text-stone-500">카카오 로드뷰로 그 자리에 서서 둘러봅니다</p>
          {place.course_id && (
            <Link
              href={`/trip/${place.course_id}`}
              className="block rounded-xl border border-dashed border-stone-300 px-3 py-2 text-center text-xs text-stone-500 hover:border-stone-400 hover:text-stone-700"
            >
              코스 가상여행 열기
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
