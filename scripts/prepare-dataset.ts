#!/usr/bin/env tsx
/**
 * Build the committable frame set from local originals.
 *
 *   data/raw/*.{jpg,jpeg}  ->  data/public/frames/<slug>.jpg          (downscaled, metadata stripped)
 *   data/raw/*.mov         ->  data/public/frames/<slug>_<nnn>.jpg    (frames at --fps, same treatment)
 *
 * Originals in data/raw/ are git-ignored and never leave the machine. Only the cleaned,
 * downscaled, redacted JPEGs under data/public/frames/ are committed. Requires ffmpeg on PATH.
 *
 * Redaction: `data/raw/redactions.json` (see data/redactions.example.json) blurs/fills
 * per-source rectangles — vendor phone/email, QR codes, notices, window views. Without that
 * file NOTHING is redacted; `--blur-all=N` is a coarse fallback that blurs every frame.
 *
 *   npx tsx scripts/prepare-dataset.ts [--fps=1] [--max-still=1600] [--max-video=1280]
 *                                      [--blur-all=0] [--force]
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
// Global light blur applied to every frame — makes fine print (phone numbers, QR codes,
// notices) unreadable while leaving door state / display digits / indicator lights legible.
// Tune per dataset; 0 disables. Per-source rectangles (redactions.json) handle the rest.
const BLUR_ALL = Number(args.get("blur-all") ?? 0);

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

/**
 * Redaction spec (git-ignored, in data/raw/). Rectangles are in OUTPUT (post-downscale)
 * pixel space. A produced frame gets the rectangle list of its SOURCE basename (without
 * extension), so one spec covers every frame from a fixed camera.
 *
 *   { "defaults": { "mode": "blur", "strength": 30 },
 *     "sources": { "IMG_1823": [ { "x":200,"y":350,"w":1400,"h":130,"note":"sticker band" } ],
 *                  "IMG_8629": [ { "x":300,"y":0,"w":520,"h":240,"mode":"fill" } ] } }
 */
type Rect = { x: number; y: number; w: number; h: number; mode?: "blur" | "fill"; note?: string };
type RedactionSpec = {
  defaults?: { mode?: "blur" | "fill"; strength?: number };
  sources?: Record<string, Rect[]>;
};

function loadRedactions(): RedactionSpec {
  const p = join(RAW_DIR, "redactions.json");
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as RedactionSpec) : {};
}

/** Apply one rectangle in place (blur or solid fill) using ffmpeg. */
function applyRect(file: string, r: Rect, spec: RedactionSpec): void {
  const mode = r.mode ?? spec.defaults?.mode ?? "blur";
  const strength = spec.defaults?.strength ?? 30;
  const tmp = `${file}.red.jpg`;
  const vf =
    mode === "fill"
      ? `drawbox=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:color=gray:t=fill`
      : `split[a][b];[b]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=${strength}:2[bl];` +
        `[a][bl]overlay=${r.x}:${r.y}`;
  ffmpeg(["-i", file, "-vf", vf, "-map_metadata", "-1", "-q:v", "3", tmp]);
  rmSync(file);
  renameSync(tmp, file);
}

function redactOutputs(manifest: Entry[]): number {
  const spec = loadRedactions();
  if (!spec.sources || Object.keys(spec.sources).length === 0) {
    console.log(
      "no data/raw/redactions.json — frames are NOT redacted. " +
        "Copy data/redactions.example.json and tune before committing frames (see data/README.md).",
    );
    return 0;
  }
  let n = 0;
  for (const entry of manifest) {
    const srcKey = parse(entry.source).name;
    const rects = spec.sources[srcKey];
    if (!rects?.length) continue;
    const p = join(OUT_DIR, entry.frame);
    for (const r of rects) applyRect(p, r, spec);
    n++;
  }
  console.log(`redacted ${n} frame(s) from ${Object.keys(spec.sources).length} source spec(s)`);
  return n;
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

const blurChain = BLUR_ALL > 0 ? `,boxblur=${BLUR_ALL}:1` : "";

for (const file of stills) {
  const out = `${slug(parse(file).name)}.jpg`;
  ffmpeg([
    "-i",
    join(RAW_DIR, file),
    "-map_metadata",
    "-1",
    "-vf",
    `scale='min(${MAX_STILL},iw)':-2${blurChain}`,
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

redactOutputs(manifest);
cleanOutputs();

manifest.sort((a, b) => a.frame.localeCompare(b.frame));
writeFileSync(
  join(OUT_DIR, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), fps: FPS, frames: manifest }, null, 2) +
    "\n",
);

console.log(`\n${manifest.length} frames -> ${OUT_DIR}/  (+ manifest.json)`);
console.log("Review them, then run `npm run check:data` before committing.");
