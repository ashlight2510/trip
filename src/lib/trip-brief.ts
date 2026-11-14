import type { MapPlace } from "@/db/repo";
import type { Place } from "@/db/schema";
import {
  DAY_SLOTS,
  placeAccess,
  placeVerdict,
  roleForCategory,
  scoreDayPlace,
  type AccessMode,
  type DayRole,
  type Verdict,
} from "@/lib/day-plan";
import { haversineM } from "@/lib/travel-mode";

/** Drop a filler stop farther than this from the previous stop. */
const FILLER_MAX_KM = 25;
const ALTERNATE_COUNT = 3;

const ROLE_ORDER: DayRole[] = DAY_SLOTS.map((slot) => slot.role);

const DAY_WORDS = new Set(["하루", "주말", "당일", "코스", "당일치기"]);
const NEAR_WORDS = ["내근처", "내주변", "근처"];
const STOP_WORDS = new Set(["내", "우리", "오늘", "이번", "좀", "추천", "여행", "가고", "싶어", "싶은", "갈만한", "곳"]);

type WishDef = {
  alias: string;
  role: DayRole;
  categories: Place["category"][];
  tags: string[];
  /** Peel from the edge of a longer token (강릉카페). Place-name endings stay whole. */
  compound: boolean;
};

const WISH_DEFS: WishDef[] = (
  [
    { alias: "커피맛집", role: "morning", categories: ["cafe"], tags: ["커피맛집"], compound: true },
    { alias: "베이커리", role: "morning", categories: ["cafe"], tags: ["디저트"], compound: true },
    { alias: "브런치", role: "morning", categories: ["cafe"], tags: ["브런치"], compound: true },
    { alias: "디저트", role: "morning", categories: ["cafe"], tags: ["디저트"], compound: true },
    { alias: "해수욕장", role: "morning", categories: ["beach"], tags: ["바다"], compound: false },
    { alias: "수목원", role: "afternoon", categories: ["forest"], tags: ["자연"], compound: false },
    { alias: "휴양림", role: "afternoon", categories: ["forest"], tags: ["숲"], compound: false },
    { alias: "카페", role: "morning", categories: ["cafe"], tags: [], compound: true },
    { alias: "커피", role: "morning", categories: ["cafe"], tags: ["커피맛집"], compound: true },
    { alias: "맛집", role: "lunch", categories: ["restaurant", "market"], tags: ["맛집"], compound: true },
    { alias: "식당", role: "lunch", categories: ["restaurant"], tags: [], compound: false },
    { alias: "음식점", role: "lunch", categories: ["restaurant"], tags: [], compound: false },
    { alias: "점심", role: "lunch", categories: ["restaurant", "market"], tags: [], compound: false },
    { alias: "시장", role: "lunch", categories: ["market"], tags: [], compound: false },
    { alias: "산책", role: "afternoon", categories: ["park", "forest", "street"], tags: ["산책"], compound: true },
    { alias: "사찰", role: "afternoon", categories: ["heritage"], tags: [], compound: false },
    { alias: "한옥", role: "afternoon", categories: ["heritage"], tags: ["한옥"], compound: false },
    { alias: "박물관", role: "afternoon", categories: ["heritage", "landmark"], tags: [], compound: false },
    { alias: "문화재", role: "afternoon", categories: ["heritage"], tags: [], compound: false },
    { alias: "명소", role: "afternoon", categories: ["landmark"], tags: [], compound: false },
    { alias: "공원", role: "afternoon", categories: ["park"], tags: [], compound: false },
    { alias: "숲", role: "afternoon", categories: ["forest"], tags: ["숲"], compound: false },
    { alias: "해변", role: "morning", categories: ["beach"], tags: ["바다"], compound: false },
    { alias: "바다", role: "morning", categories: ["beach"], tags: ["바다"], compound: false },
    { alias: "일몰", role: "sunset", categories: ["viewpoint", "beach"], tags: ["일몰", "노을"], compound: true },
    { alias: "석양", role: "sunset", categories: ["viewpoint", "beach"], tags: ["일몰", "노을"], compound: false },
    { alias: "노을", role: "sunset", categories: ["viewpoint", "beach"], tags: ["일몰", "노을"], compound: true },
    { alias: "야경", role: "sunset", categories: ["viewpoint"], tags: ["야경"], compound: true },
    { alias: "전망", role: "sunset", categories: ["viewpoint"], tags: ["전망"], compound: false },
  ] as const satisfies WishDef[]
)
  .slice()
  .sort((a, b) => b.alias.length - a.alias.length);

export type TripWish = {
  role: DayRole;
  label: string;
  categories: Place["category"][];
  tags: string[];
};

export type ParsedTripBrief = {
  raw: string;
  near: boolean;
  nearLabel: string | null;
  day: boolean;
  wishes: TripWish[];
  /** Leftover place or region words. */
  rest: string;
  /** Region/nearby plus a wish or a day word. A bare name is not a brief. */
  isBrief: boolean;
};

export type BriefStop = {
  place: MapPlace;
  role: DayRole;
  access: AccessMode;
  verdict: Verdict;
  kmFromPrev: number;
  /** Filled in to complete a day. Required wishes stay solid. */
  filler: boolean;
  /** Wish words the user typed, empty for fillers and the named place. */
  label: string;
  alternates: MapPlace[];
};

export type TripBrief = {
  shape: "day" | "addon";
  anchorName: string;
  wishLabels: string[];
  /** True when the user asked for a day and did not name a wish. */
  day: boolean;
  origin: { lat: number; lng: number };
  stops: BriefStop[];
};

function stripToken(token: string): string {
  let t = token;
  if (t.endsWith("이랑") && t.length > 2) t = t.slice(0, -2);
  else if (t.endsWith("랑") && t.length >= 3) t = t.slice(0, -1);
  else if (t.endsWith("하고") && t.length > 2) t = t.slice(0, -2);
  const josas = ["에서", "으로", "부터", "까지", "에게", "의", "에", "로"];
  for (const j of josas) {
    if (t.endsWith(j) && t.length - j.length >= 2) {
      t = t.slice(0, -j.length);
      break;
    }
  }
  return t;
}

function peelNear(token: string): { near: string | null; rest: string } {
  for (const word of NEAR_WORDS) {
    if (token === word) return { near: word, rest: "" };
    if (token.startsWith(word) && token.length > word.length) {
      const leftover = token.slice(word.length);
      const leftoverIsWish = WISH_DEFS.some((w) => w.alias === leftover);
      if (leftover.length >= 2 || leftoverIsWish) return { near: word, rest: leftover };
    }
  }
  return { near: null, rest: token };
}

function peelWishes(token: string): { found: WishDef[]; rest: string } {
  const found: WishDef[] = [];
  let rest = token;
  for (let i = 0; i < 6 && rest; i++) {
    const exact = WISH_DEFS.find((w) => w.alias === rest);
    if (exact) {
      found.push(exact);
      rest = "";
      break;
    }
    const edge = WISH_DEFS.find(
      (w) =>
        w.compound &&
        ((rest.endsWith(w.alias) && rest.length > w.alias.length) ||
          (rest.startsWith(w.alias) && rest.length > w.alias.length)),
    );
    if (!edge) break;
    const atStart = rest.startsWith(edge.alias);
    const leftover = atStart ? rest.slice(edge.alias.length) : rest.slice(0, -edge.alias.length);
    const leftoverIsWish = WISH_DEFS.some((w) => w.alias === leftover);
    if (leftover.length < 2 && !leftoverIsWish) break;
    found.push(edge);
    rest = leftover;
  }
  return { found, rest };
}

function mergeWishes(found: WishDef[]): TripWish[] {
  const byRole = new Map<DayRole, TripWish>();
  for (const wish of found) {
    const prev = byRole.get(wish.role);
    if (!prev) {
      byRole.set(wish.role, {
        role: wish.role,
        label: wish.alias,
        categories: [...wish.categories],
        tags: [...wish.tags],
      });
      continue;
    }
    if (!prev.label.split(", ").includes(wish.alias)) prev.label = `${prev.label}, ${wish.alias}`;
    for (const category of wish.categories) {
      if (!prev.categories.includes(category)) prev.categories.push(category);
    }
    for (const tag of wish.tags) {
      if (!prev.tags.includes(tag)) prev.tags.push(tag);
    }
  }
  return [...byRole.values()].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
}

export function parseTripBrief(qRaw: string): ParsedTripBrief {
  const raw = qRaw.trim().toLowerCase().replace(/[“”"'.,!?·~/]+/g, " ").replace(/\s+/g, " ").trim();
  const empty: ParsedTripBrief = {
    raw,
    near: false,
    nearLabel: null,
    day: false,
    wishes: [],
    rest: "",
    isBrief: false,
  };
  if (!raw) return empty;

  let near = false;
  let nearLabel: string | null = null;
  let day = false;
  const found: WishDef[] = [];
  const restTokens: string[] = [];

  for (const part of raw.split(" ")) {
    let token = stripToken(part);
    if (!token) continue;
    if (DAY_WORDS.has(token)) {
      day = true;
      continue;
    }
    const nearHit = peelNear(token);
    if (nearHit.near) {
      near = true;
      nearLabel ??= nearHit.near;
      token = nearHit.rest;
      if (!token) continue;
    }
    const peeled = peelWishes(token);
    found.push(...peeled.found);
    if (peeled.rest && !STOP_WORDS.has(peeled.rest)) restTokens.push(peeled.rest);
  }

  const wishes = mergeWishes(found);
  const rest = restTokens.join(" ");
  const isBrief = (near || rest.length > 0) && (wishes.length > 0 || day);
  return { raw, near, nearLabel, day, wishes, rest, isBrief };
}

/** Fill empty time slots when the user asked for a day, or named two wishes. */
export function briefFillDay(parsed: ParsedTripBrief): boolean {
  return parsed.day || parsed.wishes.length >= 2;
}

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineM(a.lat, a.lng, b.lat, b.lng) / 1000;
}

/** Branch shops miscategorized as beaches or cafes are not worth a preview stop. */
function isShopBranch(name: string): boolean {
  const compact = name.replace(/\s+/g, "");
  if (/점$/u.test(name.trim()) || /\d+호점/u.test(name)) return true;
  return /안경|약국|편의점|카센터|철물|부동산|병원|의원|치과|마트/u.test(compact);
}

function scoreWish(place: MapPlace, origin: { lat: number; lng: number }, tags: string[]): number {
  const base = scoreDayPlace(place, origin);
  if (base < 0) return -1;
  if (!tags.length) return base;
  const blob = `${place.name} ${(place.tags ?? []).join(" ")} ${place.description ?? ""}`.toLowerCase();
  let bonus = 0;
  for (const tag of tags) {
    if (blob.includes(tag.toLowerCase())) bonus += 40;
  }
  return base + bonus;
}

function rankRequired(
  pool: MapPlace[],
  categories: Place["category"][],
  tags: string[],
  used: Set<string>,
  origin: { lat: number; lng: number },
): MapPlace[] {
  const candidates = pool.filter(
    (p) => !used.has(p.id) && categories.includes(p.category) && !isShopBranch(p.name),
  );
  const scored = candidates
    .map((place) => ({ place, score: scoreWish(place, origin, tags) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "ko"));
  if (scored.length) return scored.map((row) => row.place);
  return [...candidates].sort(
    (a, b) => (b.pin_score ?? 0) - (a.pin_score ?? 0) || a.name.localeCompare(b.name, "ko"),
  );
}

function rankFiller(
  pool: MapPlace[],
  categories: Place["category"][],
  used: Set<string>,
  origin: { lat: number; lng: number },
): MapPlace[] {
  return pool
    .filter((p) => !used.has(p.id) && categories.includes(p.category) && !isShopBranch(p.name))
    .map((place) => ({ place, score: scoreDayPlace(place, origin) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "ko"))
    .slice(0, 30)
    .map((row) => row.place);
}

export function rechainBriefStops(stops: BriefStop[], origin: { lat: number; lng: number }): BriefStop[] {
  let cursor = origin;
  return stops.map((stop) => {
    const kmFromPrev = kmBetween(cursor, stop.place);
    const access = placeAccess(stop.place, cursor);
    const verdict = placeVerdict(stop.place);
    cursor = { lat: stop.place.lat, lng: stop.place.lng };
    return { ...stop, kmFromPrev, access, verdict };
  });
}

export function buildTripBrief(input: {
  pool: MapPlace[];
  origin: { lat: number; lng: number };
  anchorPlace: MapPlace | null;
  anchorName: string;
  wishes: TripWish[];
  fillDay: boolean;
  shape: "day" | "addon";
  day: boolean;
}): TripBrief | null {
  const { pool, origin, anchorPlace, wishes, fillDay, shape, day } = input;
  const used = new Set<string>();

  type Slot = {
    role: DayRole;
    filler: boolean;
    label: string;
    pinned: boolean;
    options: MapPlace[];
  };
  const slots: Slot[] = [];

  if (anchorPlace) {
    used.add(anchorPlace.id);
    slots.push({
      role: roleForCategory(anchorPlace.category),
      filler: false,
      label: "",
      pinned: true,
      options: [anchorPlace],
    });
  }

  for (const wish of wishes) {
    const ranked = rankRequired(pool, wish.categories, wish.tags, used, origin);
    const place = ranked[0];
    if (!place) continue;
    used.add(place.id);
    slots.push({
      role: wish.role,
      filler: false,
      label: wish.label,
      pinned: false,
      options: ranked.slice(0, 1 + ALTERNATE_COUNT),
    });
  }

  if (fillDay) {
    for (const slot of DAY_SLOTS) {
      if (slots.some((s) => s.role === slot.role)) continue;
      const ranked = rankFiller(pool, slot.categories, used, origin);
      if (!ranked.length) continue;
      slots.push({
        role: slot.role,
        filler: true,
        label: "",
        pinned: false,
        options: ranked,
      });
    }
  }

  slots.sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || Number(b.pinned) - Number(a.pinned),
  );

  const taken = new Set<string>();
  const chosen: BriefStop[] = [];
  let cursor = origin;
  for (const slot of slots) {
    const options = slot.options.filter((p) => !taken.has(p.id));
    const place = slot.filler ? options.find((p) => kmBetween(cursor, p) <= FILLER_MAX_KM) : options[0];
    if (!place) continue;
    taken.add(place.id);
    chosen.push({
      place,
      role: slot.role,
      access: "walk",
      verdict: "ok",
      kmFromPrev: 0,
      filler: slot.filler,
      label: slot.label,
      alternates: options.filter((p) => p.id !== place.id).slice(0, ALTERNATE_COUNT),
    });
    cursor = { lat: place.lat, lng: place.lng };
  }

  if (!chosen.length) return null;
  const chosenIds = new Set(chosen.map((stop) => stop.place.id));
  for (const stop of chosen) {
    stop.alternates = stop.alternates.filter((place) => !chosenIds.has(place.id)).slice(0, ALTERNATE_COUNT);
  }
  return {
    shape,
    anchorName: input.anchorName,
    wishLabels: wishes.map((w) => w.label),
    day: day && wishes.length === 0,
    origin,
    stops: rechainBriefStops(chosen, origin),
  };
}
