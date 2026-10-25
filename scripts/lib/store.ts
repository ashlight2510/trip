import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tables, type Row, type TableName } from "../../src/db/schema";

export const DATA_DIR = path.join(process.cwd(), "data");

const file = (name: TableName) => path.join(DATA_DIR, `${name}.json`);

export function readRaw(name: TableName): unknown {
  return JSON.parse(fs.readFileSync(file(name), "utf8"));
}

export function read<T extends TableName>(name: T): Row<T>[] {
  return z.array(tables[name]).parse(readRaw(name)) as Row<T>[];
}

export function write<T extends TableName>(name: T, rows: Row<T>[]) {
  const valid = z.array(tables[name]).parse(rows);
  fs.writeFileSync(file(name), JSON.stringify(valid, null, 2) + "\n");
}

export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(process.cwd(), f));
    } catch {}
  }
}

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`환경변수 ${name} 가 필요합니다. .env.local 에 추가하세요 (.env.local.example 참고).`);
    process.exit(1);
  }
  return v;
}

export const now = () => new Date().toISOString();
