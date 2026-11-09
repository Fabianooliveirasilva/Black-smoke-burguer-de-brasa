// Recomprime os screenshots de QA (PNG com paleta) para manter o repositório leve.
// Uso: node scripts/compress-qa-screenshots.mjs
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dirs = ["docs/qa/exploratory/screenshots", "docs/qa/automated/screenshots"];
let before = 0, after = 0;
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
    const file = path.join(dir, f);
    const size = statSync(file).size;
    const img = sharp(file);
    const { width } = await img.metadata();
    const buf = await img.resize({ width: Math.min(width, 1366) }).png({ palette: true, quality: 80, compressionLevel: 9 }).toBuffer();
    if (buf.length < size) writeFileSync(file, buf);
    before += size; after += Math.min(buf.length, size);
  }
}
console.log(`screenshots: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
