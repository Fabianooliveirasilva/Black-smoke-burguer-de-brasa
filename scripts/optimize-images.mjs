// Re-encodes source photos in public/images to max 1600px progressive mozjpeg.
// next/image serves AVIF/WebP variants at runtime; this keeps the originals lean.
import sharp from "sharp";
import { readdirSync, statSync, renameSync } from "node:fs";
import path from "node:path";

const root = path.resolve("public/images");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
for (const file of walk(root).filter((f) => f.endsWith(".jpg"))) {
  const tmp = `${file}.tmp`;
  await sharp(file).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(tmp);
  renameSync(tmp, file);
}
console.log("optimized");
