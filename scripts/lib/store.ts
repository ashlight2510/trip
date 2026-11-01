import path from "node:path";
import { DATA_DIR, readTable, readTableRaw, writeTable } from "../../src/db/json-table";
import type { Row, TableName } from "../../src/db/schema";

export { DATA_DIR };

export function readRaw(name: TableName): unknown {
  return readTableRaw(name);
}

export function read<T extends TableName>(name: T): Row<T>[] {
  return readTable(name);
}

export function write<T extends TableName>(name: T, rows: Row<T>[]) {
  return writeTable(name, rows);
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
