import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
export const MEDIA_NAME = /^[a-f0-9]{32}\.webp$/;

const dir = () => path.resolve(env().UPLOAD_DIR);

/**
 * Validates by decoding (not by extension or client MIME), strips metadata and
 * re-encodes to WebP under a random name. SVG/HTML/polyglots are rejected because
 * they never decode as raster images.
 */
export async function saveProductImage(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "FILE_TOO_LARGE", "Envie uma imagem de até 5 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new HttpError(415, "UNSUPPORTED_FILE", "Arquivo não é uma imagem válida.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new HttpError(415, "UNSUPPORTED_FILE", "Use JPG, PNG, WebP ou AVIF.");
  const output = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const name = `${randomBytes(16).toString("hex")}.webp`;
  await mkdir(dir(), { recursive: true });
  await writeFile(path.join(dir(), name), output, { flag: "wx" });
  return `/media/${name}`;
}

export async function readMedia(name: string) {
  if (!MEDIA_NAME.test(name)) return null;
  try {
    return await readFile(path.join(dir(), name));
  } catch {
    return null;
  }
}
