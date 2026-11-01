/**
 * Fill missing source.thumbnail_url from OG image (blogs) — never store full bodies.
 *
 *   yarn source:thumbs
 *   yarn source:thumbs -- --limit 300
 *   yarn source:thumbs -- --dry-run --limit 20
 */
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { STUB_SOURCE_PROVIDERS } from "../src/db/curation";
import { loadEnv, now, read, write } from "./lib/store";

const { values } = parseArgs({
  options: {
    limit: { type: "string", default: "400" },
    "dry-run": { type: "boolean", default: false },
  },
});

loadEnv();

const limit = Math.max(1, Number(values.limit ?? 400));
const dry = Boolean(values["dry-run"]);
const sources = read("sources");
const ts = now();

function extractOgImage(html: string): string | null {
  const m =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ??
    html.match(/property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i)?.[1];
  if (!m) return null;
  const decoded = m
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
  try {
    const u = new URL(decoded);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const targets = sources.filter(
  (s) =>
    !s.thumbnail_url &&
    s.type === "blog" &&
    !(STUB_SOURCE_PROVIDERS as readonly string[]).includes(s.provider) &&
    /^https?:\/\//.test(s.url),
);

let filled = 0;
let failed = 0;
const slice = targets.slice(0, limit);
console.log(`대상 ${slice.length}/${targets.length} (limit=${limit}${dry ? ", dry-run" : ""})`);

for (let i = 0; i < slice.length; i++) {
  const src = slice[i]!;
  try {
    const res = await fetch(src.url, {
      redirect: "follow",
      headers: {
        "User-Agent": "pungyeong-neomeo-thumb/1.0",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      failed++;
      continue;
    }
    const html = await res.text();
    const thumb = extractOgImage(html);
    if (!thumb) {
      failed++;
    } else if (!dry) {
      src.thumbnail_url = thumb;
      src.fetched_at = ts;
      filled++;
    } else {
      filled++;
    }
  } catch {
    failed++;
  }
  if ((i + 1) % 25 === 0) {
    console.log(`[${i + 1}/${slice.length}] filled=${filled} fail=${failed}`);
    if (!dry) write("sources", sources);
  }
  await sleep(120);
}

if (!dry) write("sources", sources);
console.log(`완료: thumbnail ${filled}곳, fail=${failed}, sources=${sources.length}`);
