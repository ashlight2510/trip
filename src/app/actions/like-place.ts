"use server";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensureContributorId } from "@/lib/contributor";
import { placeLike, placeLikeScore, type Place, type PlaceLike, type PlaceLikeScore } from "@/db/schema";

const inputSchema = z.object({
  place_id: z.string().min(1),
});

const DATA = path.join(process.cwd(), "data");
const PLACES = path.join(DATA, "places.json");
const LIKES = path.join(DATA, "place_likes.json");
const SCORES = path.join(DATA, "place_like_scores.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export type LikePlaceResult = {
  ok: true;
  likes: number;
  liked: boolean;
};

export async function likePlace(raw: z.infer<typeof inputSchema>): Promise<LikePlaceResult> {
  const input = inputSchema.parse(raw);
  const places = readJson<Place[]>(PLACES, []);
  if (!places.some((p) => p.id === input.place_id)) {
    throw new Error("장소를 찾을 수 없어요.");
  }

  const contributorId = await ensureContributorId();
  const now = new Date().toISOString();

  let likes = z.array(placeLike).parse(readJson<PlaceLike[]>(LIKES, []));
  let scores = z.array(placeLikeScore).parse(readJson<PlaceLikeScore[]>(SCORES, []));

  const vi = likes.findIndex(
    (v) => v.contributor_id === contributorId && v.place_id === input.place_id,
  );
  let liked = false;
  if (vi >= 0) {
    likes.splice(vi, 1);
    liked = false;
  } else {
    likes.push(
      placeLike.parse({
        contributor_id: contributorId,
        place_id: input.place_id,
        created_at: now,
      }),
    );
    liked = true;
  }

  const count = likes.filter((v) => v.place_id === input.place_id).length;
  const si = scores.findIndex((s) => s.place_id === input.place_id);
  const agg = placeLikeScore.parse({
    place_id: input.place_id,
    likes: count,
    updated_at: now,
  });
  if (count === 0) {
    if (si >= 0) scores.splice(si, 1);
  } else if (si >= 0) {
    scores[si] = agg;
  } else {
    scores.push(agg);
  }

  writeJson(LIKES, likes);
  writeJson(SCORES, scores);

  return { ok: true, likes: count, liked };
}
