/**
 * Enrich place.tags with vibe hashtags from category seeds + linked blog metadata.
 *
 *   npm run place:tags
 *   npm run place:tags -- --limit 100
 *   npm run place:tags -- <place_id>
 */
import { parseArgs } from "node:util";
import { enrichPlaceTags } from "../src/lib/place-tags";
import { now, read, write } from "./lib/store";

const USAGE = `사용법:
  npm run place:tags
  npm run place:tags -- --limit 100
  npm run place:tags -- <place_id>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    limit: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

const places = read("places");
const sources = read("sources");
const links = read("place_sources");

const textsByPlace = new Map<string, string[]>();
for (const link of links) {
  const src = sources.find((s) => s.id === link.source_id);
  if (!src) continue;
  const list = textsByPlace.get(link.place_id) ?? [];
  list.push([src.title, src.snippet ?? ""].join(" "));
  textsByPlace.set(link.place_id, list);
}

let targets = places;
if (positionals[0]) {
  const one = places.find((p) => p.id === positionals[0]);
  if (!one) {
    console.error(`place ${positionals[0]} 없음`);
    process.exit(1);
  }
  targets = [one];
} else if (values.limit) {
  targets = places.slice(0, Number(values.limit));
}

if (!targets.length) {
  console.log(USAGE);
  process.exit(1);
}

const ts = now();
let changed = 0;

for (const place of targets) {
  const next = enrichPlaceTags({
    category: place.category,
    name: place.name,
    existing: place.tags,
    texts: textsByPlace.get(place.id) ?? [],
  });
  const prev = place.tags.join("|");
  const after = next.join("|");
  if (prev === after && !values.force) continue;
  place.tags = next;
  place.updated_at = ts;
  changed++;
  if (positionals[0]) {
    console.log(`${place.name}: ${next.map((t) => `#${t}`).join(" ")}`);
  }
}

write("places", places);
console.log(`완료: ${changed}/${targets.length}곳 태그 갱신`);
