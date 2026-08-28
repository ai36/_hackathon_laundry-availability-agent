#!/usr/bin/env tsx
/**
 * Build the committable frame set from local originals.
 *
 *   data/raw/*.{jpg,jpeg}  ->  data/public/frames/<slug>.jpg          (downscaled, metadata stripped)
 *   data/raw/*.mov         ->  data/public/frames/<slug>_<nnn>.jpg    (frames at --fps, same treatment)
 *
 * Originals in data/raw/ are git-ignored and never leave the machine. Only the cleaned,
 * downscaled JPEGs under data/public/frames/ are committed. Requires ffmpeg on PATH.
 *
 *   npx tsx scripts/prepare-dataset.ts [--fps=1] [--max-still=1600] [--max-video=1280] [--force]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";

const RAW_DIR = "data/raw";
const OUT_DIR = "data/public/frames";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const FPS = Number(args.get("fps") ?? 1);
const MAX_STILL = Number(args.get("max-still") ?? 1600);
const MAX_VIDEO = Number(args.get("max-video") ?? 1280);
const FORCE = args.has("force");

function ffmpeg(inArgs: string[]): void {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inArgs], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Rewrite a JPEG dropping every APPn marker (EXIF/XMP/IPTC/ICC/Adobe) and the COM comment
 * (ffmpeg writes a `Lavc<version>` string there). A plain JFIF APP0, if present, is kept.
 * `-map_metadata -1` alone leaves ICC (APP2) and the COM behind; this makes the frame
 * truly minimal so the privacy gate stays strict.
 */
function stripJpegAppSegments(buf: Buffer): Buffer {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf; // not a JPEG
  const out: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI — copy the rest verbatim
    const len = buf.readUInt16BE(i + 2);
    const seg = buf.subarray(i, i + 2 + len);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isCom = marker === 0xfe;
    const isJfifApp0 = marker === 0xe0 && seg.subarray(4, 9).toString("latin1") === "JFIF\0";
    if ((!isApp && !isCom) || isJfifApp0) out.push(seg);
    i += 2 + len;
  }
  out.push(buf.subarray(i));
  return Buffer.concat(out);
}

function cleanOutputs(): void {
  for (const f of readdirSync(OUT_DIR).filter((x) => x.endsWith(".jpg"))) {
    const p = join(OUT_DIR, f);
    writeFileSync(p, stripJpegAppSegments(readFileSync(p)));
  }
}

if (!existsSync(RAW_DIR)) {
  console.error(`${RAW_DIR}/ not found — put the original photos/videos there first.`);
  process.exit(1);
}
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg not found on PATH. Install it and retry.");
  process.exit(1);
}

if (FORCE && existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const raw = readdirSync(RAW_DIR).sort();
const stills = raw.filter((f) => /\.(jpe?g)$/i.test(f));
const videos = raw.filter((f) => /\.(mov|mp4|m4v)$/i.test(f));

type Entry = { frame: string; source: string; kind: "still" | "video"; approxSeconds?: number };
const manifest: Entry[] = [];

for (const file of stills) {
  const out = `${slug(parse(file).name)}.jpg`;
  ffmpeg([
    "-i",
    join(RAW_DIR, file),
    "-map_metadata",
    "-1",
    "-vf",
    `scale='min(${MAX_STILL},iw)':-2`,
    "-q:v",
    "3",
    join(OUT_DIR, out),
  ]);
  manifest.push({ frame: out, source: file, kind: "still" });
  console.log(`still  ${file} -> ${out}`);
}

for (const file of videos) {
  const base = slug(parse(file).name);
  ffmpeg([
    "-i",
    join(RAW_DIR, file),
    "-map_metadata",
    "-1",
    "-vf",
    `fps=${FPS},scale='min(${MAX_VIDEO},iw)':-2`,
    "-q:v",
    "4",
    join(OUT_DIR, `${base}_%03d.jpg`),
  ]);
  const produced = readdirSync(OUT_DIR)
    .filter((f) => f.startsWith(`${base}_`) && f.endsWith(".jpg"))
    .sort();
  produced.forEach((f, i) => {
    manifest.push({
      frame: f,
      source: file,
      kind: "video",
      approxSeconds: +((i + 0.5) / FPS).toFixed(2),
    });
  });
  console.log(`video  ${file} -> ${produced.length} frames @ ${FPS} fps`);
}

cleanOutputs();

manifest.sort((a, b) => a.frame.localeCompare(b.frame));
writeFileSync(
  join(OUT_DIR, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), fps: FPS, frames: manifest }, null, 2) +
    "\n",
);

console.log(`\n${manifest.length} frames -> ${OUT_DIR}/  (+ manifest.json)`);
console.log("Review them, then run `npm run check:data` before committing.");
