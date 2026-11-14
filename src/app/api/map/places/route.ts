import { connection } from "next/server";
import { searchMapPlaces } from "@/db/map-query";

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const scopeRaw = url.searchParams.get("scope");
  const result = searchMapPlaces({
    lat: num(url.searchParams.get("lat")),
    lng: num(url.searchParams.get("lng")),
    radiusKm: num(url.searchParams.get("radiusKm")) ?? 25,
    west: num(url.searchParams.get("west")),
    south: num(url.searchParams.get("south")),
    east: num(url.searchParams.get("east")),
    north: num(url.searchParams.get("north")),
    q: url.searchParams.get("q") ?? undefined,
    scope: scopeRaw === "near" ? "near" : "all",
    cityId: url.searchParams.get("cityId") ?? undefined,
    districtId: url.searchParams.get("districtId") ?? undefined,
    limit: num(url.searchParams.get("limit")) ?? (url.searchParams.get("q") ? 200 : 250),
    includeSources: url.searchParams.get("includeSources") === "1",
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
