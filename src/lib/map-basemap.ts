import type { Map as LeafletMap, Layer, TileLayer } from "leaflet";
import type { ExpressionSpecification, Map as MaplibreMap } from "maplibre-gl";
import type { Locale } from "@/i18n/dictionaries";

/** OpenFreeMap — free vector tiles, no API key. */
export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function labelExpression(locale: Locale): ExpressionSpecification {
  if (locale === "en") {
    return ["coalesce", ["get", "name:en"], ["get", "name"], ["get", "name:ko"]];
  }
  return ["coalesce", ["get", "name:ko"], ["get", "name"], ["get", "name:en"]];
}

/** Apply preferred language to all symbol text-field layers on a MapLibre map. */
export function applyMapLanguage(glMap: MaplibreMap, locale: Locale) {
  try {
    const style = glMap.getStyle();
    if (!style) return;
    const expr = labelExpression(locale);
    for (const layer of style.layers ?? []) {
      if (layer.type !== "symbol") continue;
      const layout = layer.layout as { "text-field"?: unknown } | undefined;
      if (!layout || layout["text-field"] == null) continue;
      try {
        glMap.setLayoutProperty(layer.id, "text-field", expr);
      } catch {
        // Some layers use complex expressions that reject overwrite — skip.
      }
    }
  } catch {
    /* style not ready */
  }
}

export type BasemapHandle = {
  setLocale: (next: Locale) => void;
  remove: () => void;
};

function mapStillAlive(map: LeafletMap) {
  try {
    const m = map as unknown as { _loaded?: boolean; _mapPane?: HTMLElement; _container?: HTMLElement };
    if (!m._loaded || !m._mapPane || !m._container) return false;
    if (!m._container.isConnected) return false;
    return true;
  } catch {
    return false;
  }
}

function waitMapReady(map: LeafletMap): Promise<void> {
  return new Promise((resolve) => {
    const m = map as unknown as { _loaded?: boolean };
    if (m._loaded) {
      resolve();
      return;
    }
    map.whenReady(() => resolve());
  });
}

function osmFallback(map: LeafletMap, L: typeof import("leaflet")): BasemapHandle {
  if (!mapStillAlive(map)) {
    return { setLocale() {}, remove() {} };
  }
  const tile = L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map) as TileLayer;
  return {
    setLocale() {},
    remove() {
      try {
        map.removeLayer(tile);
      } catch {
        /* map already torn down */
      }
    },
  };
}

/**
 * Attach a language-aware basemap under an existing Leaflet map.
 * Pass the same `L` instance that created the map.
 * Falls back to OSM raster if MapLibre / Strict-Mode teardown races.
 */
export async function attachOpenFreeMap(
  map: LeafletMap,
  locale: Locale,
  L: typeof import("leaflet"),
): Promise<BasemapHandle> {
  await waitMapReady(map);
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  if (!mapStillAlive(map)) {
    return { setLocale() {}, remove() {} };
  }

  try {
    map.invalidateSize(false);
  } catch {
    return { setLocale() {}, remove() {} };
  }

  try {
    await import("maplibre-gl/dist/maplibre-gl.css");
    const maplibreGl = await import("maplibre-gl");
    (globalThis as unknown as { maplibregl?: typeof maplibreGl.default }).maplibregl = maplibreGl.default;
    const { default: maplibreGL } = await import("@maplibre/maplibre-gl-leaflet");

    // React Strict Mode may have torn the map down while we loaded modules.
    if (!mapStillAlive(map)) {
      return { setLocale() {}, remove() {} };
    }

    const layer = maplibreGL({
      style: OPENFREEMAP_STYLE,
      interactive: false,
    }) as Layer & { getMaplibreMap: () => MaplibreMap };

    map.addLayer(layer);

    let gl: MaplibreMap;
    try {
      gl = layer.getMaplibreMap();
    } catch (err) {
      try {
        map.removeLayer(layer);
      } catch {
        /* ignore */
      }
      throw err;
    }

    const onLoad = () => {
      if (!mapStillAlive(map)) return;
      applyMapLanguage(gl, locale);
    };
    if (gl.loaded()) onLoad();
    else gl.once("load", onLoad);

    return {
      setLocale(next: Locale) {
        if (!mapStillAlive(map)) return;
        applyMapLanguage(gl, next);
      },
      remove() {
        try {
          if (mapStillAlive(map)) map.removeLayer(layer);
        } catch {
          /* map already torn down */
        }
      },
    };
  } catch (err) {
    console.warn("[basemap] MapLibre failed, falling back to OSM raster", err);
    return osmFallback(map, L);
  }
}
