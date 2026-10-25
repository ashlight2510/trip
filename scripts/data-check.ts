import { z } from "zod";
import { relations } from "../src/db/relations";
import { tables, type TableName } from "../src/db/schema";
import { readRaw } from "./lib/store";

const errors: string[] = [];
const rows = {} as Record<TableName, Record<string, unknown>[]>;

for (const name of Object.keys(tables) as TableName[]) {
  const result = z.array(tables[name]).safeParse(readRaw(name));
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${name}[${issue.path.join(".")}]: ${issue.message}`);
    }
    rows[name] = [];
  } else {
    rows[name] = result.data as Record<string, unknown>[];
  }
}

const keyOf = (row: Record<string, unknown>, cols: string[]) => cols.map((c) => String(row[c])).join("|");

for (const [name, rel] of Object.entries(relations) as [TableName, (typeof relations)[TableName]][]) {
  for (const cols of [rel.primaryKey, ...(rel.unique ?? [])]) {
    const seen = new Set<string>();
    rows[name].forEach((row, i) => {
      const k = keyOf(row, cols);
      if (seen.has(k)) errors.push(`${name}[${i}]: duplicate (${cols.join(", ")}) = ${k}`);
      seen.add(k);
    });
  }

  for (const ref of rel.references ?? []) {
    const targets = new Set(rows[ref.table].map((r) => String(r.id)));
    rows[name].forEach((row, i) => {
      const v = row[ref.column];
      if (v === null && ref.nullable) return;
      if (!targets.has(String(v))) errors.push(`${name}[${i}].${ref.column}: ${String(v)} not found in ${ref.table}`);
    });
  }
}

for (const [table, group] of [
  ["course_stops", "course_id"],
  ["soundscape_layers", "place_id"],
  ["place_media", "place_id"],
] as const) {
  const positions = new Map<string, number[]>();
  for (const row of rows[table]) {
    const k = String(row[group]);
    positions.set(k, [...(positions.get(k) ?? []), Number(row.position)]);
  }
  for (const [k, list] of positions) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((p, i) => p !== i)) errors.push(`${table}: positions for ${k} must be 0..${list.length - 1}, got ${sorted.join(",")}`);
  }
}

for (const [table, group] of [
  ["place_sources", "place_id"],
  ["region_sources", "region_id"],
] as const) {
  const ranks = new Map<string, number[]>();
  for (const row of rows[table]) {
    const k = String(row[group]);
    ranks.set(k, [...(ranks.get(k) ?? []), Number(row.rank)]);
  }
  for (const [k, list] of ranks) {
    if (list.length > 3) errors.push(`${table}: ${k} has ${list.length} links (max 3)`);
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((r, i) => r !== i + 1)) errors.push(`${table}: ranks for ${k} must be 1..n, got ${sorted.join(",")}`);
  }
}

const regionCountry = new Map(rows.regions.map((r) => [String(r.id), String(r.country_code)]));
rows.courses.forEach((c) => {
  const stops = rows.course_stops.filter((s) => s.course_id === c.id);
  if (stops.length === 0) errors.push(`courses: ${String(c.id)} has no stops`);
});
rows.regions.forEach((r, i) => {
  if (r.parent_id && r.parent_id !== r.id && regionCountry.get(String(r.parent_id)) !== r.country_code) {
    errors.push(`regions[${i}]: country_code differs from parent ${String(r.parent_id)}`);
  }
});

const counts = (Object.keys(rows) as TableName[]).map((n) => `${n}=${rows[n].length}`).join("  ");
if (errors.length) {
  console.error(`데이터 검사 실패 (${errors.length}건)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`데이터 검사 통과  ${counts}`);
