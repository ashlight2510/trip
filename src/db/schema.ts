import { z } from "zod";

/**
 * Each schema mirrors one future Postgres table (see db/schema.sql).
 * Keys are column names, so a JSON row maps 1:1 onto an INSERT.
 */

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase kebab-case slug");
const isoDate = z.iso.datetime({ offset: true });
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const countryCode = z.string().length(2).toUpperCase();
const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const regionLevel = z.enum(["country", "province", "city", "district"]);

export const region = z.object({
  id,
  parent_id: id.nullable(),
  level: regionLevel,
  name: z.string().min(1),
  name_en: z.string().nullable(),
  country_code: countryCode,
  lat,
  lng,
});

export const placeCategory = z.enum([
  "beach",
  "cafe",
  "forest",
  "market",
  "heritage",
  "landmark",
  "restaurant",
  "park",
  "street",
  "viewpoint",
]);

export const place = z.object({
  id,
  name: z.string().min(1),
  name_en: z.string().nullable(),
  category: placeCategory,
  region_id: id,
  address: z.string().nullable(),
  lat,
  lng,
  description: z.string().nullable(),
  tags: z.array(z.string()),
  view_heading: z.number().min(0).lt(360).nullable(),
  palette: z.tuple([color, color]).nullable(),
  created_at: isoDate,
  updated_at: isoDate,
});

export const externalProvider = z.enum(["kakao", "google", "naver", "osm"]);

export const placeExternalRef = z.object({
  place_id: id,
  provider: externalProvider,
  external_id: z.string().min(1),
  url: z.url().nullable(),
  fetched_at: isoDate,
});

export const sourceType = z.enum(["blog", "youtube", "article"]);

export const source = z.object({
  id,
  type: sourceType,
  provider: z.string().min(1),
  url: z.url(),
  title: z.string().min(1),
  author: z.string().nullable(),
  author_url: z.url().nullable(),
  published_at: z.iso.date().nullable(),
  /** Short snippet returned by the search API, never the full post body. */
  snippet: z.string().max(400).nullable(),
  thumbnail_url: z.url().nullable(),
  /**
   * Popularity proxy. YouTube can fill real view_count; Naver blog search has no views,
   * so we store a normalized score from search rank (and optional editor boost).
   */
  view_count: z.number().int().nonnegative().nullable(),
  score: z.number().min(0).max(100).nullable(),
  fetched_at: isoDate,
});

export const placeSource = z.object({
  place_id: id,
  source_id: id,
  /** 1 = best featured link for this place (cap: MAX_SOURCES_PER_PLACE). */
  rank: z.number().int().min(1).max(10),
  relevance: z.number().min(0).max(1),
  note: z.string().nullable(),
  timestamp_sec: z.number().int().nonnegative().nullable(),
});

/** Featured posts at region (시/구) level — also capped at 3. */
export const regionSource = z.object({
  region_id: id,
  source_id: id,
  rank: z.number().int().min(1).max(3),
  /** Optional theme, often mirrors a place category. */
  category: placeCategory.nullable(),
  relevance: z.number().min(0).max(1),
  note: z.string().nullable(),
});

export const soundKind = z.enum(["waves", "gulls", "wind", "birds", "leaves", "cafe", "market"]);

export const soundscapeLayer = z.object({
  place_id: id,
  position: z.number().int().nonnegative(),
  kind: soundKind,
  gain: z.number().min(0).max(1.5),
  bearing: z.number().min(0).lt(360).nullable(),
  label: z.string().nullable(),
});

/**
 * Freely reusable place media only:
 * - Wikimedia / CC / KOGL images (hotlink or self-host with attribution)
 * - Official tourism YouTube channels (embed via official player, never download)
 * PhotoKorea and similar portals need a separate download+license workflow; don't hotlink those here.
 */
export const mediaKind = z.enum(["image", "youtube"]);
export const mediaLicense = z.enum([
  "cc-by",
  "cc-by-sa",
  "cc0",
  "kogl-1",
  "kogl-2",
  "kogl-3",
  "youtube-embed",
]);

export const placeMedia = z.object({
  id,
  place_id: id,
  position: z.number().int().nonnegative(),
  kind: mediaKind,
  /** Image URL, or YouTube watch/embed URL / bare video id. */
  url: z.string().min(1),
  title: z.string().nullable(),
  credit: z.string().min(1),
  credit_url: z.url().nullable(),
  license: mediaLicense,
  license_url: z.url().nullable(),
  provider: z.string().min(1),
  /** YouTube start seconds when kind is youtube. */
  start_sec: z.number().int().nonnegative().nullable(),
  is_cover: z.boolean(),
});

export const course = z.object({
  id,
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  country_code: countryCode,
  cover: z.tuple([color, color]),
  visibility: z.enum(["public", "unlisted", "private"]),
  created_at: isoDate,
  updated_at: isoDate,
});

export const courseStop = z.object({
  course_id: id,
  position: z.number().int().nonnegative(),
  place_id: id,
  heading: z.number().min(0).lt(360).nullable(),
  tip: z.string().nullable(),
});

/** User reports for dead / deleted outbound links (never scrape bodies; only unlink). */
export const reportReason = z.enum(["deleted", "wrong_place", "spam", "other"]);

export const sourceReport = z.object({
  id,
  place_id: id,
  source_id: id.nullable(),
  source_url: z.url().nullable(),
  reason: reportReason,
  note: z.string().max(500).nullable(),
  status: z.enum(["open", "resolved", "dismissed"]),
  created_at: isoDate,
});

/**
 * Manual ranking overlay for place↔source links.
 * Kept separate from place_sources so collectors/prunes never wipe editor order.
 * Later: same shape as a Postgres table.
 */
export const placeSourceBoost = z.object({
  place_id: id,
  source_id: id,
  /** Higher = shown first. Up/down adjusts relative to neighbors. */
  boost: z.number().int().min(-1000).max(1000),
  updated_at: isoDate,
});

/** Anonymous browser id for community link contributions (cookie `pn_cid`). */
const contributorId = z.string().regex(/^c-[a-z0-9]+$/, "contributor cookie id");

/**
 * User-submitted outbound link for a place.
 * We store only URL metadata + link row — never blog/video bodies.
 */
export const userContribution = z.object({
  id,
  place_id: id,
  source_id: id.nullable(),
  contributor_id: contributorId,
  url: z.url(),
  title: z.string().min(1).max(200).nullable(),
  status: z.enum(["linked", "duplicate", "pending", "rejected"]),
  points_awarded: z.number().int().nonnegative(),
  created_at: isoDate,
});

/** Running points balance per anonymous contributor. Hint: usable later in-product. */
export const contributorWallet = z.object({
  contributor_id: contributorId,
  points: z.number().int().nonnegative(),
  linked_count: z.number().int().nonnegative(),
  updated_at: isoDate,
});

/** Aggregated community +/- for a place↔source link. */
export const placeSourceVoteScore = z.object({
  place_id: id,
  source_id: id,
  /** Net score (up − down). Hidden in UI when ≤ SOURCE_VOTE_HIDE_AT. */
  score: z.number().int(),
  up: z.number().int().nonnegative(),
  down: z.number().int().nonnegative(),
  updated_at: isoDate,
});

/** One vote per anonymous contributor per link (flip allowed). */
export const placeSourceVote = z.object({
  contributor_id: contributorId,
  place_id: id,
  source_id: id,
  value: z.union([z.literal(1), z.literal(-1)]),
  updated_at: isoDate,
});

/** Place-level like (one per anonymous contributor; toggle). */
export const placeLike = z.object({
  contributor_id: contributorId,
  place_id: id,
  created_at: isoDate,
});

/** Aggregated like count for a place. */
export const placeLikeScore = z.object({
  place_id: id,
  likes: z.number().int().nonnegative(),
  updated_at: isoDate,
});

/**
 * Editorial “풍경너머 픽” membership.
 * Collections are curated lists (good cafes, standout places) shown on /picks.
 */
export const placePickCollection = z.enum(["pn-picks", "pn-cafe", "pn-guam"]);

export const placePick = z.object({
  place_id: id,
  collection: placePickCollection,
  note: z.string().max(240).nullable(),
  rank: z.number().int().nonnegative(),
  featured_at: isoDate,
});

/** User-saved place list (anonymous contributor). Share via /l/[slug] when public. */
export const placeList = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9]{6,16}$/, "share slug"),
  contributor_id: contributorId,
  title: z.string().min(1).max(80),
  is_public: z.boolean(),
  created_at: isoDate,
  updated_at: isoDate,
});

export const placeListItem = z.object({
  list_id: id,
  place_id: id,
  note: z.string().max(240).nullable(),
  rank: z.number().int().nonnegative(),
  added_at: isoDate,
});

export const tables = {
  regions: region,
  places: place,
  place_external_refs: placeExternalRef,
  sources: source,
  place_sources: placeSource,
  region_sources: regionSource,
  soundscape_layers: soundscapeLayer,
  place_media: placeMedia,
  courses: course,
  course_stops: courseStop,
  source_reports: sourceReport,
  place_source_boosts: placeSourceBoost,
  user_contributions: userContribution,
  contributor_wallets: contributorWallet,
  place_source_vote_scores: placeSourceVoteScore,
  place_source_votes: placeSourceVote,
  place_likes: placeLike,
  place_like_scores: placeLikeScore,
  place_picks: placePick,
  place_lists: placeList,
  place_list_items: placeListItem,
} as const;

export type TableName = keyof typeof tables;
export type Row<T extends TableName> = z.infer<(typeof tables)[T]>;

export type Region = Row<"regions">;
export type Place = Row<"places">;
export type PlaceExternalRef = Row<"place_external_refs">;
export type Source = Row<"sources">;
export type PlaceSource = Row<"place_sources">;
export type RegionSource = Row<"region_sources">;
export type SoundscapeLayer = Row<"soundscape_layers">;
export type PlaceMedia = Row<"place_media">;
export type Course = Row<"courses">;
export type CourseStop = Row<"course_stops">;
export type SourceReport = Row<"source_reports">;
export type PlaceSourceBoost = Row<"place_source_boosts">;
export type UserContribution = Row<"user_contributions">;
export type ContributorWallet = Row<"contributor_wallets">;
export type PlaceSourceVoteScore = Row<"place_source_vote_scores">;
export type PlaceSourceVote = Row<"place_source_votes">;
export type PlaceLike = Row<"place_likes">;
export type PlaceLikeScore = Row<"place_like_scores">;
export type PlacePick = Row<"place_picks">;
export type PlacePickCollection = z.infer<typeof placePickCollection>;
export type PlaceList = Row<"place_lists">;
export type PlaceListItem = Row<"place_list_items">;
