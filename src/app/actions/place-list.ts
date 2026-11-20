import { STATIC_UNAVAILABLE } from "@/lib/static-unavailable";

export type MyListSnapshot = {
  list: {
    id: string;
    slug: string;
    title: string;
    is_public: boolean;
    share_path: string;
  };
  items: { place_id: string; note: string | null; rank: number }[];
  place_ids: string[];
  count: number;
};

const EMPTY_LIST: MyListSnapshot = {
  list: {
    id: "static",
    slug: "static",
    title: "내 리스트",
    is_public: false,
    share_path: "/my-list/",
  },
  items: [],
  place_ids: [],
  count: 0,
};

export async function getMyList(): Promise<MyListSnapshot> {
  return EMPTY_LIST;
}

export async function peekMyList(): Promise<MyListSnapshot | null> {
  return null;
}

export async function togglePlaceInMyList(_raw: {
  place_id: string;
}): Promise<{ ok: true; in_list: boolean; count: number } & MyListSnapshot> {
  throw new Error(STATIC_UNAVAILABLE);
}

export async function updateMyList(_raw: unknown): Promise<MyListSnapshot> {
  throw new Error(STATIC_UNAVAILABLE);
}
