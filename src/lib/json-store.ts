import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export function dataPath(name: string) {
  return path.join(DATA, `${name}.json`);
}

export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
