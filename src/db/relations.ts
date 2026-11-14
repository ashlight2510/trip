import type { TableName } from "./schema";

/** Keys and references shared by the integrity check and the SQL export. */
export const relations: Record<
  TableName,
  {
    primaryKey: string[];
    unique?: string[][];
    references?: { column: string; table: TableName; nullable?: boolean }[];
  }
> = {
  regions: {
    primaryKey: ["id"],
    references: [{ column: "parent_id", table: "regions", nullable: true }],
  },
  places: {
    primaryKey: ["id"],
    references: [{ column: "region_id", table: "regions" }],
  },
  place_external_refs: {
    primaryKey: ["provider", "external_id"],
    references: [{ column: "place_id", table: "places" }],
  },
  sources: {
    primaryKey: ["id"],
    unique: [["url"]],
  },
  place_sources: {
    primaryKey: ["place_id", "source_id"],
    unique: [["place_id", "rank"]],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources" },
    ],
  },
  region_sources: {
    primaryKey: ["region_id", "source_id"],
    unique: [["region_id", "rank"]],
    references: [
      { column: "region_id", table: "regions" },
      { column: "source_id", table: "sources" },
    ],
  },
  soundscape_layers: {
    primaryKey: ["place_id", "position"],
    references: [{ column: "place_id", table: "places" }],
  },
  place_media: {
    primaryKey: ["id"],
    references: [{ column: "place_id", table: "places" }],
  },
  courses: {
    primaryKey: ["id"],
  },
  course_stops: {
    primaryKey: ["course_id", "position"],
    references: [
      { column: "course_id", table: "courses" },
      { column: "place_id", table: "places" },
    ],
  },
  source_reports: {
    primaryKey: ["id"],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources", nullable: true },
    ],
  },
  place_source_boosts: {
    primaryKey: ["place_id", "source_id"],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources" },
    ],
  },
  user_contributions: {
    primaryKey: ["id"],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources", nullable: true },
    ],
  },
  contributor_wallets: {
    primaryKey: ["contributor_id"],
  },
  place_source_vote_scores: {
    primaryKey: ["place_id", "source_id"],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources" },
    ],
  },
  place_source_votes: {
    primaryKey: ["contributor_id", "place_id", "source_id"],
    references: [
      { column: "place_id", table: "places" },
      { column: "source_id", table: "sources" },
    ],
  },
  place_likes: {
    primaryKey: ["contributor_id", "place_id"],
    references: [{ column: "place_id", table: "places" }],
  },
  place_like_scores: {
    primaryKey: ["place_id"],
    references: [{ column: "place_id", table: "places" }],
  },
  place_picks: {
    primaryKey: ["place_id", "collection"],
    references: [{ column: "place_id", table: "places" }],
  },
  place_lists: {
    primaryKey: ["id"],
    unique: [["slug"]],
  },
  place_list_items: {
    primaryKey: ["list_id", "place_id"],
    references: [
      { column: "list_id", table: "place_lists" },
      { column: "place_id", table: "places" },
    ],
  },
};

/** Parents before children, so inserts never violate a foreign key. */
export const insertOrder: TableName[] = [
  "regions",
  "places",
  "place_external_refs",
  "sources",
  "place_sources",
  "region_sources",
  "soundscape_layers",
  "place_media",
  "courses",
  "course_stops",
  "source_reports",
  "place_source_boosts",
  "user_contributions",
  "contributor_wallets",
  "place_source_vote_scores",
  "place_source_votes",
  "place_likes",
  "place_like_scores",
  "place_picks",
  "place_lists",
  "place_list_items",
];
