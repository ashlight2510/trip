import { donghaeFilm } from "./films/donghae";
import { mapleFilm } from "./films/maple";
import { maldivesVlogFilm } from "./films/maldives";
import { opinBakeryFilm } from "./films/opin-bakery";
import { winterFilm } from "./films/winter";
import type { PhotoVlogFilm } from "./types";

export type VlogCatalogItem = {
  href: string;
  film: PhotoVlogFilm;
  /** Cover still (first scene image). */
  cover: string;
};

export type VlogCatalogCategory = {
  id: string;
  label: string;
  items: VlogCatalogItem[];
};

function item(href: string, film: PhotoVlogFilm): VlogCatalogItem {
  return {
    href,
    film,
    cover: film.scenes[0]?.image ?? "",
  };
}

/** All photo+script vlogs, grouped for the /vlog menu. */
export const vlogCatalog: VlogCatalogCategory[] = [
  {
    id: "season",
    label: "계절",
    items: [item("/vlog/maple", mapleFilm), item("/vlog/winter", winterFilm)],
  },
  {
    id: "korea",
    label: "국내",
    items: [item("/vlog/donghae", donghaeFilm)],
  },
  {
    id: "cafe",
    label: "카페",
    items: [item("/vlog/opin-bakery", opinBakeryFilm)],
  },
  {
    id: "abroad",
    label: "해외",
    items: [item("/vlog/maldives", maldivesVlogFilm)],
  },
];

export function flatVlogCatalog() {
  return vlogCatalog.flatMap((category) =>
    category.items.map((entry) => ({ ...entry, categoryId: category.id, categoryLabel: category.label })),
  );
}

export function findVlogCatalogItem(href: string) {
  return flatVlogCatalog().find((entry) => entry.href === href) ?? null;
}
