"use server";

import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  CONTRIB_POINTS,
  MAX_CONTRIB_PER_DAY,
  MAX_SOURCES_PER_PLACE,
} from "@/db/curation";
import {
  contributorWallet,
  placeSource,
  source,
  userContribution,
  type ContributorWallet,
  type PlaceSource,
  type Source,
  type UserContribution,
} from "@/db/schema";
import { parseContribUrl, sourceIdFromUrl } from "@/lib/contrib-url";

const inputSchema = z.object({
  place_id: z.string().min(1),
  url: z.string().min(8).max(2000),
  title: z.string().max(200).optional(),
});

const DATA = path.join(process.cwd(), "data");
const PLACES = path.join(DATA, "places.json");
const SOURCES = path.join(DATA, "sources.json");
const LINKS = path.join(DATA, "place_sources.json");
const CONTRIBS = path.join(DATA, "user_contributions.json");
const WALLETS = path.join(DATA, "contributor_wallets.json");

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

function newContributorId() {
  return `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function newContribRowId() {
  return `uc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function ensureContributorId() {
  const jar = await cookies();
  const existing = jar.get("pn_cid")?.value;
  if (existing && /^c-[a-z0-9]+$/.test(existing)) return existing;
  const id = newContributorId();
  jar.set("pn_cid", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}

function utcDay(iso: string) {
  return iso.slice(0, 10);
}

export type ContributeResult =
  | {
      ok: true;
      status: "linked" | "duplicate" | "pending";
      points_awarded: number;
      points_total: number;
      message: string;
      source_id: string | null;
    }
  | { ok: false; error: string };

export async function contributeSource(raw: z.infer<typeof inputSchema>): Promise<ContributeResult> {
  const input = inputSchema.parse(raw);
  const parsed = parseContribUrl(input.url);
  if (!parsed) {
    return {
      ok: false,
      error: "네이버 블로그 · 티스토리 · YouTube · 브런치 등 공개 후기 URL만 연결할 수 있어요.",
    };
  }

  const places = readJson<{ id: string }[]>(PLACES, []);
  if (!places.some((p) => p.id === input.place_id)) {
    return { ok: false, error: "장소를 찾을 수 없어요." };
  }

  const contributorId = await ensureContributorId();
  const now = new Date().toISOString();
  const today = utcDay(now);

  let contribs = z.array(userContribution).parse(readJson<UserContribution[]>(CONTRIBS, []));
  const todayCount = contribs.filter(
    (c) => c.contributor_id === contributorId && utcDay(c.created_at) === today,
  ).length;
  if (todayCount >= MAX_CONTRIB_PER_DAY) {
    return { ok: false, error: "오늘은 연결 한도에 도달했어요. 내일 다시 도와주세요." };
  }

  let sources = z.array(source).parse(readJson<Source[]>(SOURCES, []));
  let links = z.array(placeSource).parse(readJson<PlaceSource[]>(LINKS, []));
  let wallets = z.array(contributorWallet).parse(readJson<ContributorWallet[]>(WALLETS, []));

  const sourceId = sourceIdFromUrl(parsed.url);
  const existingSource = sources.find((s) => s.url === parsed.url || s.id === sourceId);
  const placeLinks = links.filter((l) => l.place_id === input.place_id);
  const alreadyHere = existingSource
    ? placeLinks.some((l) => l.source_id === existingSource.id)
    : false;

  let status: "linked" | "duplicate" | "pending" = "linked";
  let points: number = CONTRIB_POINTS.linked;
  let linkedSourceId: string | null = existingSource?.id ?? sourceId;
  const title =
    input.title?.trim() ||
    existingSource?.title ||
    parsed.titleHint;

  if (alreadyHere) {
    status = "duplicate";
    points = CONTRIB_POINTS.duplicate;
    linkedSourceId = existingSource!.id;
  } else if (placeLinks.length >= MAX_SOURCES_PER_PLACE) {
    status = "pending";
    points = CONTRIB_POINTS.pending;
    // Keep URL in contributions; don't drop an existing curated link yet.
    if (!existingSource) {
      const row = source.parse({
        id: sourceId,
        type: parsed.type,
        provider: parsed.provider,
        url: parsed.url,
        title,
        author: null,
        author_url: null,
        published_at: null,
        snippet: "유저가 연결한 후기",
        thumbnail_url: null,
        view_count: null,
        score: 70,
        fetched_at: now,
      });
      sources.push(row);
      linkedSourceId = row.id;
    }
  } else {
    if (!existingSource) {
      const row = source.parse({
        id: sourceId,
        type: parsed.type,
        provider: parsed.provider,
        url: parsed.url,
        title,
        author: null,
        author_url: null,
        published_at: null,
        snippet: "유저가 연결한 후기",
        thumbnail_url: null,
        view_count: null,
        score: 72,
        fetched_at: now,
      });
      sources.push(row);
      linkedSourceId = row.id;
    } else {
      linkedSourceId = existingSource.id;
    }
    const usedRanks = new Set(placeLinks.map((l) => l.rank));
    let nextRank = 1;
    while (usedRanks.has(nextRank) && nextRank <= MAX_SOURCES_PER_PLACE) nextRank++;
    if (nextRank > MAX_SOURCES_PER_PLACE) {
      status = "pending";
      points = CONTRIB_POINTS.pending;
    } else {
      links.push(
        placeSource.parse({
          place_id: input.place_id,
          source_id: linkedSourceId!,
          rank: nextRank,
          relevance: 0.72,
          note: "user_contrib",
          timestamp_sec: null,
        }),
      );
      status = "linked";
      points = CONTRIB_POINTS.linked;
    }
  }

  const contrib = userContribution.parse({
    id: newContribRowId(),
    place_id: input.place_id,
    source_id: linkedSourceId,
    contributor_id: contributorId,
    url: parsed.url,
    title,
    status,
    points_awarded: points,
    created_at: now,
  });
  contribs.push(contrib);

  const wi = wallets.findIndex((w) => w.contributor_id === contributorId);
  const prev = wi >= 0 ? wallets[wi]! : null;
  const wallet = contributorWallet.parse({
    contributor_id: contributorId,
    points: (prev?.points ?? 0) + points,
    linked_count: (prev?.linked_count ?? 0) + (status === "linked" ? 1 : 0),
    updated_at: now,
  });
  if (wi >= 0) wallets[wi] = wallet;
  else wallets.push(wallet);

  writeJson(SOURCES, sources);
  writeJson(LINKS, links);
  writeJson(CONTRIBS, contribs);
  writeJson(WALLETS, wallets);

  const messages = {
    linked: `연결됐어요 · +${points}P 적립. 포인트는 나중에 풍경너머에서 쓸 수 있어요.`,
    duplicate: `이미 연결된 후기예요 · 참여 감사 +${points}P. 포인트는 나중에 쓰임이 있어요.`,
    pending: `자리가 가득 차 대기열에 넣었어요 · +${points}P. 포인트는 나중에 풍경너머에서 쓸 수 있어요.`,
  } as const;

  return {
    ok: true,
    status,
    points_awarded: points,
    points_total: wallet.points,
    message: messages[status],
    source_id: linkedSourceId,
  };
}

export async function getMyPoints(): Promise<{ points: number; linked_count: number }> {
  const jar = await cookies();
  const id = jar.get("pn_cid")?.value;
  if (!id || !/^c-[a-z0-9]+$/.test(id)) return { points: 0, linked_count: 0 };
  const wallets = z.array(contributorWallet).parse(readJson<ContributorWallet[]>(WALLETS, []));
  const w = wallets.find((x) => x.contributor_id === id);
  return { points: w?.points ?? 0, linked_count: w?.linked_count ?? 0 };
}
