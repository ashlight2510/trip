"use server";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { sourceReport, type SourceReport } from "@/db/schema";

const inputSchema = z.object({
  place_id: z.string().min(1),
  source_id: z.string().nullable(),
  source_url: z.string().url().nullable(),
  reason: z.enum(["deleted", "wrong_place", "spam", "other"]),
  note: z.string().max(500).nullable(),
});

const FILE = path.join(process.cwd(), "data", "source_reports.json");

function readReports(): SourceReport[] {
  try {
    return z.array(sourceReport).parse(JSON.parse(fs.readFileSync(FILE, "utf8")));
  } catch {
    return [];
  }
}

export async function reportSource(raw: z.infer<typeof inputSchema>) {
  const input = inputSchema.parse(raw);
  const reports = readReports();
  const row = sourceReport.parse({
    id: `rpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    place_id: input.place_id,
    source_id: input.source_id,
    source_url: input.source_url,
    reason: input.reason,
    note: input.note,
    status: "open",
    created_at: new Date().toISOString(),
  });
  reports.push(row);
  fs.writeFileSync(FILE, JSON.stringify(reports, null, 2) + "\n");
  return { ok: true as const, id: row.id };
}
