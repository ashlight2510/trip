import fs from "node:fs";
import path from "node:path";

const dest = path.resolve("public/landmarks");
const assets = path.resolve(
  process.env.HOME || "",
  ".cursor/projects/Users-sojung-trip/assets",
);
if (fs.existsSync(assets)) {
  for (const f of fs.readdirSync(assets)) {
    if (/^lm-\d{3}\.jpg$/.test(f)) {
      fs.copyFileSync(path.join(assets, f), path.join(dest, f));
    }
  }
}
let src = fs.readFileSync("src/lib/world-landmarks-200.ts", "utf8");
const files = fs.readdirSync(dest);
for (let i = 1; i <= 200; i++) {
  const num = String(i).padStart(3, "0");
  const preferred = files.includes(`lm-${num}.jpg`)
    ? `/landmarks/lm-${num}.jpg`
    : `/landmarks/lm-${num}.svg`;
  src = src.replaceAll(`"image": "/landmarks/lm-${num}.svg"`, `"image": "${preferred}"`);
  src = src.replaceAll(`"image": "/landmarks/lm-${num}.jpg"`, `"image": "${preferred}"`);
}
fs.writeFileSync("src/lib/world-landmarks-200.ts", src);
console.log(
  "synced",
  files.filter((f) => f.endsWith(".jpg")).length,
  "jpg /",
  files.filter((f) => f.endsWith(".svg")).length,
  "svg",
);
