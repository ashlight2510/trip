import "server-only";
import { z } from "zod";
import { getMapPlace } from "@/db/map-query";
import type { MapPlace } from "@/db/repo";
import { dataPath, readJsonFile } from "@/lib/json-store";
import { placeList, placeListItem, type PlaceList, type PlaceListItem } from "@/db/schema";

export type SharedListView = {
  list: {
    id: string;
    slug: string;
    title: string;
    is_public: boolean;
    updated_at: string;
  };
  places: Array<MapPlace & { note: string | null; rank: number }>;
};

export function getSharedListBySlug(slug: string): SharedListView | null {
  const lists = z.array(placeList).parse(readJsonFile<PlaceList[]>(dataPath("place_lists"), []));
  const list = lists.find((l) => l.slug === slug);
  if (!list || !list.is_public) return null;

  const items = z
    .array(placeListItem)
    .parse(readJsonFile<PlaceListItem[]>(dataPath("place_list_items"), []))
    .filter((i) => i.list_id === list.id)
    .sort((a, b) => a.rank - b.rank);

  const places: SharedListView["places"] = [];
  for (const item of items) {
    const place = getMapPlace(item.place_id);
    if (!place) continue;
    places.push({ ...place, note: item.note, rank: item.rank });
  }

  return {
    list: {
      id: list.id,
      slug: list.slug,
      title: list.title,
      is_public: list.is_public,
      updated_at: list.updated_at,
    },
    places,
  };
}

export function getListPlacesForOwner(listId: string): SharedListView["places"] {
  const items = z
    .array(placeListItem)
    .parse(readJsonFile<PlaceListItem[]>(dataPath("place_list_items"), []))
    .filter((i) => i.list_id === listId)
    .sort((a, b) => a.rank - b.rank);

  const places: SharedListView["places"] = [];
  for (const item of items) {
    const place = getMapPlace(item.place_id);
    if (!place) continue;
    places.push({ ...place, note: item.note, rank: item.rank });
  }
  return places;
}
