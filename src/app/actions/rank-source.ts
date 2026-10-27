"use server";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { placeSource, placeSourceBoost, type PlaceSource, type PlaceSourceBoost } from "@/db/schema";
import { compareSourceSort } from "@/lib/source-rank";

const inputSchema = z.object({
  place_id: z.string().min(1),
  source_id: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

const BOOSTS = path.join(process.cwd(), "data", "place_source_boosts.json");
const LINKS = path.join(process.cwd(), "data", "place_sources.json");
const SOURCES = path.join(process.cwd(), "data", "sources.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data)}\n`);
  fs.renameSync(tmp, file);
}

function boostKey(placeId: string, sourceId: string) {
  return `${placeId}::${sourceId}`;
}

/**
 * Move a place's source one step up or down in the display order.
 * Persists only to place_source_boosts.json — collectors never overwrite this.
 */
export async function rankSource(raw: z.infer<typeof inputSchema>) {
  const input = inputSchema.parse(raw);
  const links = z
    .array(placeSource)
    .parse(readJson<PlaceSource[]>(LINKS, []))
    .filter((l) => l.place_id === input.place_id);

  if (!links.some((l) => l.source_id === input.source_id)) {
    throw new Error("이 장소에 연결되지 않은 후기입니다.");
  }

  const sources = readJson<{ id: string; view_count: number | null }[]>(SOURCES, []);
  const viewById = new Map(sources.map((s) => [s.id, s.view_count ?? null]));

  let boosts = z.array(placeSourceBoost).parse(readJson<PlaceSourceBoost[]>(BOOSTS, []));
  const boostMap = new Map(boosts.map((b) => [boostKey(b.place_id, b.source_id), b.boost]));

  type Row = {
    source_id: string;
    boost: number;
    relevance: number;
    view_count: number | null;
    rank: number;
  };

  const rows: Row[] = links.map((l) => ({
    source_id: l.source_id,
    boost: boostMap.get(boostKey(l.place_id, l.source_id)) ?? 0,
    relevance: l.relevance,
    view_count: viewById.get(l.source_id) ?? null,
    rank: l.rank,
  }));
  rows.sort(compareSourceSort);

  const index = rows.findIndex((r) => r.source_id === input.source_id);
  if (index < 0) throw new Error("후기를 찾을 수 없습니다.");

  const neighbor = input.direction === "up" ? index - 1 : index + 1;
  if (neighbor < 0 || neighbor >= rows.length) {
    return {
      ok: true as const,
      boost: rows[index]!.boost,
      moved: false as const,
      order: rows.map((r) => r.source_id),
    };
  }

  const cur = rows[index]!;
  const other = rows[neighbor]!;
  // Jump just past the neighbor so sort order flips even when relevance differs.
  const nextBoost =
    input.direction === "up" ? Math.min(1000, other.boost + 1) : Math.max(-1000, other.boost - 1);

  const now = new Date().toISOString();
  const existing = boosts.findIndex(
    (b) => b.place_id === input.place_id && b.source_id === input.source_id,
  );
  const row = placeSourceBoost.parse({
    place_id: input.place_id,
    source_id: input.source_id,
    boost: nextBoost,
    updated_at: now,
  });
  if (existing >= 0) boosts[existing] = row;
  else boosts.push(row);

  // Drop boosts for sources no longer linked to this place.
  const linked = new Set(links.map((l) => l.source_id));
  boosts = boosts.filter((b) => b.place_id !== input.place_id || linked.has(b.source_id));

  writeJson(BOOSTS, boosts);

  const refreshed = rows.map((r) =>
    r.source_id === input.source_id ? { ...r, boost: nextBoost } : r,
  );
  refreshed.sort(compareSourceSort);

  return {
    ok: true as const,
    boost: nextBoost,
    moved: true as const,
    order: refreshed.map((r) => r.source_id),
  };
}
