/**
 * Export world attractions workbook (default 500, or top-N by visitor/fame).
 *
 * Curated from recent visitor rankings (city tourism boards / Euromonitor /
 * theme-park reports, last ~5 years), UNESCO World Heritage lists, and
 * frequently featured places in Nat Geo / Lonely Planet / Travel + Leisure.
 *
 *   yarn tsx scripts/export-world-attractions.mts
 *   yarn tsx scripts/export-world-attractions.mts -- --limit 200 --out exports/전세계_명소_200.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import ExcelJS from "exceljs";
import {
  WORLD_ATTRACTIONS_500,
  type WorldAttraction,
} from "./data/world-attractions-500";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    limit: { type: "string", default: "500" },
    top: { type: "boolean", default: false },
  },
});

const limit = Math.max(1, Number(values.limit) || 500);
const useTopRanking = Boolean(values.top) || limit < WORLD_ATTRACTIONS_500.length;
const outPath = path.resolve(
  process.cwd(),
  values.out ??
    (limit === 500
      ? "exports/전세계_명소_500.xlsx"
      : `exports/전세계_명소_${limit}.xlsx`),
);

function fameScore(note?: string): number {
  const n = note ?? "";
  if (n.includes("최근 5년 최고 방문권")) return 100;
  if (n.includes("최근 5년")) return 90;
  if (n.includes("최근 방문 상위")) return 80;
  if (n.includes("테마파크 상위")) return 78;
  if (n.includes("휴양 상위")) return 72;
  if (n.includes("유네스코") && (n.includes("Nat Geo") || n.includes("신7대")))
    return 88;
  if (n.includes("유네스코") && n.includes("최근")) return 85;
  if (n.includes("Nat Geo")) return 70;
  if (n.includes("유네스코")) return 60;
  if (n.includes("Travel + Leisure") || n.includes("Lonely Planet")) return 55;
  if (n.includes("미술관") || n.includes("도시 관광 상위")) return 50;
  return 30;
}

function pickRows(all: WorldAttraction[], n: number, ranked: boolean) {
  if (!ranked) return all.slice(0, n);
  return all
    .map((a, i) => ({
      a,
      score: fameScore(a.note) * 1000 + (all.length - i),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, n)
    .map((x) => x.a);
}

if (WORLD_ATTRACTIONS_500.length < 200) {
  throw new Error(
    `Expected a large curated list, got ${WORLD_ATTRACTIONS_500.length}`,
  );
}

const rows = pickRows(WORLD_ATTRACTIONS_500, limit, useTopRanking);

const workbook = new ExcelJS.Workbook();
workbook.creator = "trip";
workbook.created = new Date();

const sheet = workbook.addWorksheet(`전세계 명소 ${rows.length}`, {
  views: [{ state: "frozen", ySplit: 1 }],
});

sheet.columns = [
  { header: "번호", key: "no", width: 8 },
  { header: "관광명소", key: "name", width: 36 },
  { header: "나라", key: "country", width: 16 },
  { header: "소개", key: "intro", width: 72 },
  { header: "참고", key: "note", width: 28 },
];

const header = sheet.getRow(1);
header.font = { bold: true, color: { argb: "FFFFFFFF" } };
header.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E79" },
};
header.alignment = { vertical: "middle", horizontal: "center" };
header.height = 22;

rows.forEach((row, i) => {
  sheet.addRow({
    no: i + 1,
    name: row.name,
    country: row.country,
    intro: row.intro,
    note: row.note ?? "",
  });
});

sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: 1, column: 5 },
};

sheet.getColumn("intro").alignment = { wrapText: true, vertical: "top" };
for (let r = 2; r <= rows.length + 1; r++) {
  sheet.getRow(r).height = 36;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
await workbook.xlsx.writeFile(outPath);

console.log(
  `Wrote ${rows.length} rows${useTopRanking ? " (top-ranked)" : ""} → ${outPath}`,
);
