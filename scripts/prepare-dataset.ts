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
 * Redaction, two ways (both keyed by SOURCE basename, so one spec covers every frame from a
 * fixed camera):
 *   1. `data/raw/masks/<source>.png` — a raster mask painted once per camera angle. Opaque
 *      pixels become a solid gray patch on the frame; transparent pixels pass through. Any
 *      shape. This is the recommended path for a real integrator (paint once, reuse).
 *   2. `data/raw/redactions.json` (see data/redactions.example.json) — per-source
 *      rectangles, blur or fill. Used when no mask exists for that source.
 * A mask wins over rectangles for the same source. Without either, NOTHING is redacted;
 * `--blur-all=N` is a coarse fallback that blurs every frame.
 *
 * Resolution and fps default to `frames.*` in laundry3.config.ts; the flags below override
 * per-run. The still-frame width (`frames.maxStillPx`) is the resolution a per-camera mask
 * must be authored at and the resolution the runtime feeds the agent.
 *
 *   npx tsx scripts/prepare-dataset.ts [--fps=N] [--max-still=PX] [--max-video=PX]
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

import { config } from "@/config";

const RAW_DIR = "data/raw";
const OUT_DIR = "data/public/frames";
const MASK_DIR = "data/raw/masks";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
// `frames.*` sizes come from laundry3.config.ts; CLI flags override per-run. Video sampling
// rate is a dataset-prep detail, not a deployment knob — default 1 fps, `--fps=N` to change.
const FPS = Number(args.get("fps") ?? 1);
const MAX_STILL = Number(args.get("max-still") ?? config.frames.maxStillPx);
const MAX_VIDEO = Number(args.get("max-video") ?? config.frames.maxVideoPx);
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

/** Resolve a per-source raster mask (`data/raw/masks/<source>.png`), if one exists. */
function maskFor(source: string): string | null {
  const p = join(MASK_DIR, `${parse(source).name}.png`);
  return existsSync(p) ? p : null;
}

/**
 * Composite a per-angle raster mask onto a frame in place. The mask is scaled to the frame,
 * its RGB forced to gray, its own alpha kept — so opaque paint becomes a solid gray patch
 * and transparent areas are untouched. Shape-agnostic; authored once per fixed camera.
 */
function applyMask(file: string, maskPath: string): void {
  const tmp = `${file}.red.jpg`;
  const filter =
    "[1:v][0:v]scale2ref=w=iw:h=ih[m][base];" +
    "[m]format=rgba,geq=r=128:g=128:b=128:a='alpha(X,Y)'[mg];" +
    "[base][mg]overlay=0:0";
  ffmpeg([
    "-i",
    file,
    "-i",
    maskPath,
    "-filter_complex",
    filter,
    "-map_metadata",
    "-1",
    "-q:v",
    "3",
    tmp,
  ]);
  rmSync(file);
  renameSync(tmp, file);
}

function redactOutputs(manifest: Entry[]): number {
  const spec = loadRedactions();
  const sourcesWithMask = new Set(
    existsSync(MASK_DIR)
      ? readdirSync(MASK_DIR)
          .filter((f) => f.toLowerCase().endsWith(".png"))
          .map((f) => parse(f).name)
      : [],
  );
  const specSources = spec.sources ? Object.keys(spec.sources).length : 0;
  if (specSources === 0 && sourcesWithMask.size === 0) {
    console.log(
      "no data/raw/masks/*.png and no data/raw/redactions.json — frames are NOT redacted. " +
        "Add a per-angle mask or copy data/redactions.example.json before committing (see data/README.md).",
    );
    return 0;
  }
  let masked = 0;
  let boxed = 0;
  for (const entry of manifest) {
    const srcKey = parse(entry.source).name;
    const p = join(OUT_DIR, entry.frame);
    const mask = maskFor(entry.source);
    if (mask) {
      applyMask(p, mask);
      masked++;
      continue; // a mask supersedes rectangles for this source
    }
    const rects = spec.sources?.[srcKey];
    if (!rects?.length) continue;
    for (const r of rects) applyRect(p, r, spec);
    boxed++;
  }
  console.log(
    `redacted ${masked + boxed} frame(s): ${masked} via per-angle mask (${sourcesWithMask.size} mask` +
      `${sourcesWithMask.size === 1 ? "" : "s"}), ${boxed} via ${specSources} rectangle spec(s)`,
  );
  return masked + boxed;
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
