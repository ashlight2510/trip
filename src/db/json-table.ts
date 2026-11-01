/**
 * JSON table I/O with optional part files for GitHub's ~50MB soft limit.
 * Tables in SPLIT_TABLES are stored as `{name}.part-001.json`, …
 * Readers accept either a single `{name}.json` or numbered parts.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tables, type Row, type TableName } from "./schema";

export const DATA_DIR = path.join(process.cwd(), "data");
/** Keep each part under GitHub's 50MB warning threshold. */
export const MAX_PART_BYTES = 49 * 1024 * 1024;

/** Tables that may exceed a single GitHub-friendly JSON file. */
export const SPLIT_TABLES = new Set<TableName>(["sources"]);

function singlePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

function partPath(name: string, index: number) {
  return path.join(DATA_DIR, `${name}.part-${String(index).padStart(3, "0")}.json`);
}

function listPartPaths(name: string): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  const re = new RegExp(`^${name}\\.part-(\\d+)\\.json$`);
  return fs
    .readdirSync(DATA_DIR)
    .map((f) => {
      const m = f.match(re);
      return m ? { f, n: Number(m[1]) } : null;
    })
    .filter((x): x is { f: string; n: number } => Boolean(x))
    .sort((a, b) => a.n - b.n)
    .map((x) => path.join(DATA_DIR, x.f));
}

export function tableStamp(name: string): string {
  const parts = listPartPaths(name);
  if (parts.length) {
    return parts
      .map((p) => {
        try {
          return `${path.basename(p)}:${fs.statSync(p).mtimeMs}`;
        } catch {
          return `${path.basename(p)}:0`;
        }
      })
      .join("|");
  }
  try {
    return `${name}:${fs.statSync(singlePath(name)).mtimeMs}`;
  } catch {
    return `${name}:0`;
  }
}

export function readTableRaw(name: TableName): unknown {
  const parts = listPartPaths(name);
  if (parts.length) {
    const rows: unknown[] = [];
    for (const p of parts) {
      const chunk = JSON.parse(fs.readFileSync(p, "utf8"));
      if (!Array.isArray(chunk)) throw new Error(`${p} must be a JSON array`);
      rows.push(...chunk);
    }
    return rows;
  }
  const single = singlePath(name);
  if (!fs.existsSync(single)) return [];
  return JSON.parse(fs.readFileSync(single, "utf8"));
}

export function readTable<T extends TableName>(name: T): Row<T>[] {
  return z.array(tables[name]).parse(readTableRaw(name)) as Row<T>[];
}

function utf8Len(s: string) {
  return Buffer.byteLength(s, "utf8");
}

function splitRows(rows: unknown[], maxBytes: number): unknown[][] {
  if (rows.length === 0) return [[]];
  const chunks: unknown[][] = [];
  let current: unknown[] = [];
  let size = 2; // []
  for (const row of rows) {
    const piece = JSON.stringify(row);
    const extra = utf8Len(piece) + (current.length ? 1 : 0); // comma between items
    if (current.length > 0 && size + extra > maxBytes) {
      chunks.push(current);
      current = [];
      size = 2;
    }
    // Single row larger than maxBytes — still emit alone (can't split further).
    current.push(row);
    size += extra;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function writeAtomic(target: string, data: unknown) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data)}\n`);
  fs.renameSync(tmp, target);
}

function removeTableFiles(name: string) {
  const single = singlePath(name);
  if (fs.existsSync(single)) fs.unlinkSync(single);
  for (const p of listPartPaths(name)) fs.unlinkSync(p);
}

export function writeTable<T extends TableName>(name: T, rows: Row<T>[]) {
  const valid = z.array(tables[name]).parse(rows) as Row<T>[];
  const asUnknown = valid as unknown[];

  // Small / non-split tables stay as a single file.
  const compact = JSON.stringify(asUnknown);
  const shouldSplit = SPLIT_TABLES.has(name) && utf8Len(compact) > MAX_PART_BYTES;

  if (!shouldSplit) {
    // Replace atomically: write new single, then drop any stale parts.
    writeAtomic(singlePath(name), asUnknown);
    for (const p of listPartPaths(name)) fs.unlinkSync(p);
    return { parts: 1, bytes: utf8Len(compact) };
  }

  const chunks = splitRows(asUnknown, MAX_PART_BYTES);
  // Write to temp part names first so a failure never deletes the only copy.
  const staged: { final: string; tmp: string; bytes: number }[] = [];
  let total = 0;
  chunks.forEach((chunk, i) => {
    const body = JSON.stringify(chunk);
    const bytes = utf8Len(body);
    total += bytes;
    const final = partPath(name, i + 1);
    if (bytes > MAX_PART_BYTES) {
      throw new Error(`${path.basename(final)} would be ${bytes} bytes (> ${MAX_PART_BYTES}).`);
    }
    const tmp = `${final}.tmp`;
    fs.writeFileSync(tmp, `${body}\n`);
    staged.push({ final, tmp, bytes });
  });

  // Commit: remove old files, then rename temps into place.
  removeTableFiles(name);
  for (const s of staged) fs.renameSync(s.tmp, s.final);
  return { parts: staged.length, bytes: total };
}
