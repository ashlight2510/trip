import type { Map as LeafletMap, Layer } from "leaflet";
import type { ExpressionSpecification, Map as MaplibreMap } from "maplibre-gl";
import type { Locale } from "@/i18n/dictionaries";

/** OpenFreeMap — free vector tiles, no API key. */
export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function labelExpression(locale: Locale): ExpressionSpecification {
  if (locale === "en") {
    return ["coalesce", ["get", "name:en"], ["get", "name"], ["get", "name:ko"]];
  }
  return ["coalesce", ["get", "name:ko"], ["get", "name"], ["get", "name:en"]];
}

/** Apply preferred language to all symbol text-field layers on a MapLibre map. */
export function applyMapLanguage(glMap: MaplibreMap, locale: Locale) {
  const style = glMap.getStyle();
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
}

export type BasemapHandle = {
  setLocale: (next: Locale) => void;
  remove: () => void;
};

/** Dynamically attach OpenFreeMap under Leaflet and set label language. */
export async function attachOpenFreeMap(map: LeafletMap, locale: Locale): Promise<BasemapHandle> {
  await import("maplibre-gl/dist/maplibre-gl.css");
  const maplibreGl = await import("maplibre-gl");
  (globalThis as unknown as { maplibregl?: typeof maplibreGl.default }).maplibregl = maplibreGl.default;
  await import("@maplibre/maplibre-gl-leaflet");
  const L = (await import("leaflet")).default;

  const layer = (
    L as unknown as {
      maplibreGL: (opts: { style: string; interactive?: boolean }) => Layer & {
        getMaplibreMap: () => MaplibreMap;
      };
    }
  )
    .maplibreGL({ style: OPENFREEMAP_STYLE, interactive: false })
    .addTo(map);

  const gl = layer.getMaplibreMap();
  const onLoad = () => applyMapLanguage(gl, locale);
  if (gl.loaded()) onLoad();
  else gl.once("load", onLoad);

  return {
    setLocale(next: Locale) {
      applyMapLanguage(gl, next);
    },
    remove() {
      try {
        map.removeLayer(layer);
      } catch {
        /* map already torn down */
      }
    },
  };
}
