import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { matchOutlineRegion } from "@/db/map-query";

const CACHE_DIR = path.join(process.cwd(), "data", "boundary-cache");

type GeoJSON = { type: string; coordinates: unknown };

function cachePath(id: string) {
  return path.join(CACHE_DIR, `${id}.json`);
}

function readCache(id: string): GeoJSON | null {
  try {
    const raw = fs.readFileSync(cachePath(id), "utf8");
    return JSON.parse(raw) as GeoJSON;
  } catch {
    return null;
  }
}

function writeCache(id: string, geo: GeoJSON) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(id), JSON.stringify(geo));
}

async function fetchNominatimPolygon(query: string): Promise<GeoJSON | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "pungyeong-neomeo/1.0 (travel map boundary)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { geojson?: GeoJSON }[];
  const geo = rows[0]?.geojson;
  if (!geo || geo.type === "Point") return null;
  return geo;
}

export async function GET(req: Request) {
  await connection();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const region = matchOutlineRegion(q);
  if (!region) {
    return Response.json({ region: null, geojson: null });
  }

  let geojson = readCache(region.id);
  if (!geojson) {
    const queries = [region.nameEn, region.name].filter((v): v is string => Boolean(v));
    for (const label of queries) {
      geojson = await fetchNominatimPolygon(label);
      if (geojson) {
        writeCache(region.id, geojson);
        break;
      }
    }
  }

  return Response.json(
    { region, geojson },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
