/**
 * Garbage-collect orphan sources and stub providers.
 *
 *   yarn source:gc
 *   yarn source:gc -- --apply
 */
import { parseArgs } from "node:util";
import { STUB_SOURCE_PROVIDERS } from "../src/db/curation";
import { loadEnv, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    "keep-orphans": { type: "boolean", default: false },
  },
});

loadEnv();

const sources = read("sources");
const links = read("place_sources");
const regionLinks = read("region_sources");
const boosts = read("place_source_boosts");
const voteScores = read("place_source_vote_scores");
const votes = read("place_source_votes");
const contribs = read("user_contributions");
const reports = read("source_reports");

const stub = new Set<string>(STUB_SOURCE_PROVIDERS);
const referenced = new Set<string>();
for (const l of links) referenced.add(l.source_id);
for (const l of regionLinks) referenced.add(l.source_id);
for (const c of contribs) if (c.source_id) referenced.add(c.source_id);

const stubIds = new Set(sources.filter((s) => stub.has(s.provider)).map((s) => s.id));
const orphanIds = new Set(
  values["keep-orphans"] ? [] : sources.filter((s) => !referenced.has(s.id)).map((s) => s.id),
);

const dropIds = new Set([...stubIds, ...orphanIds]);

const nextSources = sources.filter((s) => !dropIds.has(s.id));
const nextLinks = links.filter((l) => !stubIds.has(l.source_id) && !dropIds.has(l.source_id));
const nextRegion = regionLinks.filter((l) => !dropIds.has(l.source_id));
const nextBoosts = boosts.filter((b) => !dropIds.has(b.source_id));
const nextVoteScores = voteScores.filter((v) => !dropIds.has(v.source_id));
const nextVotes = votes.filter((v) => !dropIds.has(v.source_id));
const nextReports = reports.map((r) =>
  r.source_id && dropIds.has(r.source_id) ? { ...r, source_id: null } : r,
);

console.log(
  JSON.stringify(
    {
      sources_before: sources.length,
      sources_after: nextSources.length,
      drop_stubs: stubIds.size,
      drop_orphans: orphanIds.size,
      unlink_stub_place_sources: links.length - nextLinks.length,
      dry_run: !values.apply,
    },
    null,
    2,
  ),
);

if (!values.apply) {
  console.log("dry-run only. Apply with: yarn source:gc -- --apply");
  process.exit(0);
}

write("sources", nextSources);
write("place_sources", nextLinks);
write("region_sources", nextRegion);
write("place_source_boosts", nextBoosts);
write("place_source_vote_scores", nextVoteScores);
write("place_source_votes", nextVotes);
write("source_reports", nextReports);
console.log("gc applied");
