/**
 * Shared place quality rules for seed + purge.
 * Prefer visit-worthy destinations; drop clinics, convenience chains, etc.
 */
import type { Place } from "../../src/db/schema";
import {
  PLACE_HARD_DROP_NAME,
  PLACE_HARD_DROP_CATEGORY_TEXT,
  VISIT_PRIORITY_CATEGORIES,
  isFranchiseChainName,
} from "../../src/db/curation";
import { isChainOrBranchPlace } from "./source-relevance";

export type PlaceQualityInput = {
  name: string;
  category: Place["category"];
  /** Kakao category_name or similar free text. */
  categoryText?: string | null;
  /** How many real (non-stub) sources are linked. */
  linkCount?: number;
};

export type PlaceQualityResult = {
  keep: boolean;
  reason?: string;
  /** Soft: keep for now but deprioritize in collectors. */
  lowPriority?: boolean;
};

/** Hard reject at seed / purge. */
export function isHardDropPlace(input: PlaceQualityInput): boolean {
  const text = `${input.name} ${input.categoryText ?? ""}`;
  if (PLACE_HARD_DROP_NAME.test(input.name)) return true;
  if (PLACE_HARD_DROP_CATEGORY_TEXT.test(text)) return true;
  return false;
}

/**
 * Visit-worthy keep decision.
 * Cafe/restaurant with many links can stay even if chain-ish.
 */
export function evaluatePlaceQuality(input: PlaceQualityInput): PlaceQualityResult {
  if (isHardDropPlace(input)) {
    return { keep: false, reason: "hard_drop" };
  }

  const priority = VISIT_PRIORITY_CATEGORIES.has(input.category);
  const links = input.linkCount ?? 0;
  const chain = isChainOrBranchPlace(input.name) || isFranchiseChainName(input.name);

  if (priority) {
    if (chain && links < 2) return { keep: true, lowPriority: true, reason: "chain_landmark" };
    return { keep: true };
  }

  // cafe / restaurant: keep if already curated with links, else soft-drop weak chains
  if (input.category === "cafe" || input.category === "restaurant") {
    if (links >= 3) return { keep: true };
    if (chain && links === 0) return { keep: false, reason: "empty_chain_food" };
    if (chain) return { keep: true, lowPriority: true, reason: "chain_food" };
    return { keep: true, lowPriority: links < 1 };
  }

  return { keep: true, lowPriority: true, reason: "other_category" };
}

export function sortPlacesVisitFirst<T extends { category: Place["category"]; id: string }>(
  list: T[],
): T[] {
  const rank = (c: Place["category"]) => {
    if (VISIT_PRIORITY_CATEGORIES.has(c)) return 0;
    if (c === "cafe" || c === "restaurant" || c === "market") return 1;
    return 2;
  };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category) || a.id.localeCompare(b.id));
}
