"use server";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { SOURCE_VOTE_HIDE_AT } from "@/db/curation";
import { ensureContributorId } from "@/lib/contributor";
import {
  placeSource,
  placeSourceVote,
  placeSourceVoteScore,
  type PlaceSource,
  type PlaceSourceVote,
  type PlaceSourceVoteScore,
} from "@/db/schema";

const inputSchema = z.object({
  place_id: z.string().min(1),
  source_id: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

const DATA = path.join(process.cwd(), "data");
const LINKS = path.join(DATA, "place_sources.json");
const VOTES = path.join(DATA, "place_source_votes.json");
const SCORES = path.join(DATA, "place_source_vote_scores.json");

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

export type VoteSourceResult = {
  ok: true;
  score: number;
  up: number;
  down: number;
  my_vote: 1 | -1 | 0;
  hidden: boolean;
  hide_at: number;
};

export async function voteSource(raw: z.infer<typeof inputSchema>): Promise<VoteSourceResult> {
  const input = inputSchema.parse(raw);
  const links = z.array(placeSource).parse(readJson<PlaceSource[]>(LINKS, []));
  if (!links.some((l) => l.place_id === input.place_id && l.source_id === input.source_id)) {
    throw new Error("이 장소에 연결되지 않은 후기입니다.");
  }

  const contributorId = await ensureContributorId();
  const now = new Date().toISOString();

  let votes = z.array(placeSourceVote).parse(readJson<PlaceSourceVote[]>(VOTES, []));
  let scores = z
    .array(placeSourceVoteScore)
    .parse(readJson<PlaceSourceVoteScore[]>(SCORES, []));

  const vi = votes.findIndex(
    (v) =>
      v.contributor_id === contributorId &&
      v.place_id === input.place_id &&
      v.source_id === input.source_id,
  );
  const prev = vi >= 0 ? votes[vi]!.value : 0;

  // Same button again → clear vote
  let next: 1 | -1 | 0 = input.value;
  if (prev === input.value) next = 0;

  if (next === 0) {
    if (vi >= 0) votes.splice(vi, 1);
  } else {
    const row = placeSourceVote.parse({
      contributor_id: contributorId,
      place_id: input.place_id,
      source_id: input.source_id,
      value: next,
      updated_at: now,
    });
    if (vi >= 0) votes[vi] = row;
    else votes.push(row);
  }

  // Recompute aggregate for this link from all votes
  const forLink = votes.filter((v) => v.place_id === input.place_id && v.source_id === input.source_id);
  const up = forLink.filter((v) => v.value === 1).length;
  const down = forLink.filter((v) => v.value === -1).length;
  const score = up - down;

  const si = scores.findIndex((s) => s.place_id === input.place_id && s.source_id === input.source_id);
  const agg = placeSourceVoteScore.parse({
    place_id: input.place_id,
    source_id: input.source_id,
    score,
    up,
    down,
    updated_at: now,
  });
  if (si >= 0) scores[si] = agg;
  else scores.push(agg);

  writeJson(VOTES, votes);
  writeJson(SCORES, scores);

  return {
    ok: true,
    score,
    up,
    down,
    my_vote: next,
    hidden: score <= SOURCE_VOTE_HIDE_AT,
    hide_at: SOURCE_VOTE_HIDE_AT,
  };
}
