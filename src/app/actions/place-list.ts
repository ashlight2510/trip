"use server";

import { z } from "zod";
import { ensureContributorId, peekContributorId } from "@/lib/contributor";
import { dataPath, readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  placeList,
  placeListItem,
  type Place,
  type PlaceList,
  type PlaceListItem,
} from "@/db/schema";

const PLACES = dataPath("places");
const LISTS = dataPath("place_lists");
const ITEMS = dataPath("place_list_items");

function newListId() {
  return `list-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function newSlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function loadLists() {
  return z.array(placeList).parse(readJsonFile<PlaceList[]>(LISTS, []));
}

function loadItems() {
  return z.array(placeListItem).parse(readJsonFile<PlaceListItem[]>(ITEMS, []));
}

function saveLists(rows: PlaceList[]) {
  writeJsonFile(LISTS, rows);
}

function saveItems(rows: PlaceListItem[]) {
  writeJsonFile(ITEMS, rows);
}

async function ensureMyList(): Promise<PlaceList> {
  const contributorId = await ensureContributorId();
  const now = new Date().toISOString();
  let lists = loadLists();
  let mine = lists.find((l) => l.contributor_id === contributorId);
  if (mine) return mine;

  let slug = newSlug();
  while (lists.some((l) => l.slug === slug)) slug = newSlug();

  mine = placeList.parse({
    id: newListId(),
    slug,
    contributor_id: contributorId,
    title: "내 리스트",
    is_public: false,
    created_at: now,
    updated_at: now,
  });
  lists.push(mine);
  saveLists(lists);
  return mine;
}

export type MyListSnapshot = {
  list: {
    id: string;
    slug: string;
    title: string;
    is_public: boolean;
    share_path: string;
  };
  place_ids: string[];
  count: number;
};

function snapshotFor(list: PlaceList): MyListSnapshot {
  const items = loadItems().filter((i) => i.list_id === list.id);
  items.sort((a, b) => a.rank - b.rank);
  return {
    list: {
      id: list.id,
      slug: list.slug,
      title: list.title,
      is_public: list.is_public,
      share_path: `/l/${list.slug}`,
    },
    place_ids: items.map((i) => i.place_id),
    count: items.length,
  };
}

/** Creates the default list if needed — Server Actions / client only. */
export async function getMyList(): Promise<MyListSnapshot> {
  return snapshotFor(await ensureMyList());
}

/** RSC-safe: returns null when no cookie / list yet. */
export async function peekMyList(): Promise<MyListSnapshot | null> {
  const contributorId = await peekContributorId();
  if (!contributorId) return null;
  const list = loadLists().find((l) => l.contributor_id === contributorId);
  if (!list) return null;
  return snapshotFor(list);
}

export async function togglePlaceInMyList(raw: {
  place_id: string;
}): Promise<MyListSnapshot & { in_list: boolean }> {
  const placeId = z.string().min(1).parse(raw.place_id);
  const places = readJsonFile<Place[]>(PLACES, []);
  if (!places.some((p) => p.id === placeId)) throw new Error("장소를 찾을 수 없어요.");

  const list = await ensureMyList();
  const now = new Date().toISOString();
  let items = loadItems();
  const idx = items.findIndex((i) => i.list_id === list.id && i.place_id === placeId);
  let inList = false;

  if (idx >= 0) {
    items.splice(idx, 1);
    // re-pack ranks
    const mine = items.filter((i) => i.list_id === list.id).sort((a, b) => a.rank - b.rank);
    mine.forEach((row, i) => {
      row.rank = i + 1;
    });
    inList = false;
  } else {
    const mineCount = items.filter((i) => i.list_id === list.id).length;
    items.push(
      placeListItem.parse({
        list_id: list.id,
        place_id: placeId,
        note: null,
        rank: mineCount + 1,
        added_at: now,
      }),
    );
    inList = true;
  }

  saveItems(items);

  const lists = loadLists();
  const li = lists.findIndex((l) => l.id === list.id);
  if (li >= 0) {
    lists[li] = { ...lists[li]!, updated_at: now };
    saveLists(lists);
  }

  return { ...snapshotFor(list), in_list: inList };
}

export async function updateMyList(raw: {
  title?: string;
  is_public?: boolean;
}): Promise<MyListSnapshot> {
  const input = z
    .object({
      title: z.string().min(1).max(80).optional(),
      is_public: z.boolean().optional(),
    })
    .parse(raw);

  const list = await ensureMyList();
  const now = new Date().toISOString();
  const lists = loadLists();
  const li = lists.findIndex((l) => l.id === list.id);
  if (li < 0) throw new Error("리스트를 찾을 수 없어요.");

  const next = {
    ...lists[li]!,
    title: input.title?.trim() || lists[li]!.title,
    is_public: input.is_public ?? lists[li]!.is_public,
    updated_at: now,
  };
  lists[li] = placeList.parse(next);
  saveLists(lists);
  return getMyList();
}
