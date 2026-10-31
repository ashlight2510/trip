/**
 * Drop non-visit-worthy places (dry-run by default).
 *
 *   yarn place:purge
 *   yarn place:purge -- --apply
 *   yarn place:purge -- --apply --keep-linked-food
 */
import { parseArgs } from "node:util";
import { evaluatePlaceQuality } from "./lib/place-quality";
import { loadEnv, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    "keep-linked-food": { type: "boolean", default: true },
    limit: { type: "string" },
  },
});

loadEnv();

const places = read("places");
const refs = read("place_external_refs");
const links = read("place_sources");
const media = read("place_media");
const sound = read("soundscape_layers");
const courseStops = read("course_stops");
const boosts = read("place_source_boosts");
const contribs = read("user_contributions");
const voteScores = read("place_source_vote_scores");
const votes = read("place_source_votes");
const reports = read("source_reports");

const realByPlace = new Map<string, number>();
const sources = read("sources");
const byId = new Map(sources.map((s) => [s.id, s]));
for (const l of links) {
  const s = byId.get(l.source_id);
  if (!s) continue;
  if (s.provider === "naver_blog" || s.provider === "tistory" || s.type === "youtube") {
    realByPlace.set(l.place_id, (realByPlace.get(l.place_id) ?? 0) + 1);
  }
}

const coursePlaceIds = new Set(courseStops.map((s) => s.place_id));

type Cand = { id: string; name: string; category: string; reason: string; links: number };
const victims: Cand[] = [];

for (const p of places) {
  if (coursePlaceIds.has(p.id)) continue; // never delete course stops
  const linkCount = realByPlace.get(p.id) ?? 0;
  const q = evaluatePlaceQuality({
    name: p.name,
    category: p.category,
    linkCount,
  });
  // Extra safety: well-linked food stays even if rules tighten later.
  if (
    values["keep-linked-food"] &&
    (p.category === "cafe" || p.category === "restaurant") &&
    linkCount >= 3
  ) {
    continue;
  }
  if (q.keep) continue;
  victims.push({
    id: p.id,
    name: p.name,
    category: p.category,
    reason: q.reason ?? "drop",
    links: linkCount,
  });
}

const limit = values.limit ? Number(values.limit) : victims.length;
const doomed = victims.slice(0, limit);
const doomedIds = new Set(doomed.map((d) => d.id));

console.log(
  JSON.stringify(
    {
      candidates: victims.length,
      applying: values.apply ? doomed.length : 0,
      dry_run: !values.apply,
      sample: doomed.slice(0, 20),
      by_reason: doomed.reduce(
        (acc, d) => {
          acc[d.reason] = (acc[d.reason] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    },
    null,
    2,
  ),
);

if (!values.apply) {
  console.log("dry-run only. Apply with: yarn place:purge -- --apply");
  process.exit(0);
}

write(
  "places",
  places.filter((p) => !doomedIds.has(p.id)),
);
write(
  "place_external_refs",
  refs.filter((r) => !doomedIds.has(r.place_id)),
);
write(
  "place_sources",
  links.filter((l) => !doomedIds.has(l.place_id)),
);
write(
  "place_media",
  media.filter((m) => !doomedIds.has(m.place_id)),
);
write(
  "soundscape_layers",
  sound.filter((s) => !doomedIds.has(s.place_id)),
);
write(
  "place_source_boosts",
  boosts.filter((b) => !doomedIds.has(b.place_id)),
);
write(
  "user_contributions",
  contribs.filter((c) => !doomedIds.has(c.place_id)),
);
write(
  "place_source_vote_scores",
  voteScores.filter((v) => !doomedIds.has(v.place_id)),
);
write(
  "place_source_votes",
  votes.filter((v) => !doomedIds.has(v.place_id)),
);
write(
  "source_reports",
  reports.filter((r) => !doomedIds.has(r.place_id)),
);

console.log(`purged ${doomed.length} places (sources orphan GC: yarn source:gc)`);
