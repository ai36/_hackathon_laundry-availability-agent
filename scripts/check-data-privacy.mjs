#!/usr/bin/env node
/**
 * Privacy gate for the laundry3 dataset. Runs as a pre-commit hook and via
 * `npm run check:data`.
 *
 * Fails (exit 1) when the staged change would commit:
 *   1. anything under data/raw/ or data/frames/ (local-only working dirs), or
 *   2. an image under data/ that is not in data/public/, or
 *   3. an image under data/ that still carries embedded metadata (EXIF / XMP /
 *      IPTC / PNG text chunks) — GPS, device serial and timestamps identify the
 *      building and the author (ground rules 06 / 07 / 08).
 *
 * Dependency-free: inspects the staged blob bytes for known metadata markers.
 * It is a gate, not a scrubber — strip metadata before re-staging, e.g.
 *   exiftool -all= FILE            (exiftool)
 *   magick mogrify -strip FILE     (ImageMagick)
 */

import { execFileSync } from "node:child_process";

const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif|tiff?)$/i;

function stagedFiles() {
  let out;
  try {
    out = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], { encoding: "buffer" });
  } catch {
    return []; // not a git repo / no index — nothing to gate
  }
  return out
    .toString("utf8")
    .split("\0")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stagedBytes(path) {
  try {
    return execFileSync("git", ["show", `:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/** Returns a short reason string if the buffer carries metadata, else "". */
function metadataReason(buf) {
  if (!buf || buf.length < 12) return "";
  const ascii = buf.toString("latin1");

  // JPEG: APP1 (EXIF/XMP), APP13 (Photoshop/IPTC)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    if (ascii.includes("Exif\0\0")) return "JPEG EXIF (APP1)";
    if (ascii.includes("http://ns.adobe.com/xap/")) return "JPEG XMP (APP1)";
    if (ascii.includes("Photoshop 3.0")) return "JPEG IPTC (APP13)";
    // generic APP1..APP15 scan over segment headers
    let i = 2;
    while (i + 4 < buf.length && buf[i] === 0xff) {
      const marker = buf[i + 1];
      if (marker === 0xda || marker === 0xd9) break; // start of scan / end
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xe1 && marker <= 0xef) return `JPEG APP${marker - 0xe0} segment`;
      i += 2 + len;
    }
  }

  // PNG: text / EXIF chunks
  if (buf[0] === 0x89 && ascii.startsWith("\x89PNG")) {
    for (const chunk of ["eXIf", "tEXt", "iTXt", "zTXt"]) {
      if (ascii.includes(chunk)) return `PNG ${chunk} chunk`;
    }
  }

  // WebP: EXIF / XMP chunks
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") {
    if (ascii.includes("EXIF")) return "WebP EXIF chunk";
    if (ascii.includes("XMP ")) return "WebP XMP chunk";
  }

  // HEIC/HEIF and TIFF are metadata-heavy containers we don't parse — reject outright.
  if (/^....ftyp(heic|heif|mif1|msf1)/.test(ascii))
    return "HEIC/HEIF container (convert to stripped JPEG/PNG)";
  if ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d))
    return "TIFF container";

  return "";
}

const problems = [];
for (const f of stagedFiles()) {
  const norm = f.replace(/\\/g, "/");
  if (norm.startsWith("data/raw/") || norm.startsWith("data/frames/")) {
    problems.push(
      `${f} — data/raw/ and data/frames/ are local-only; do not commit frames from here`,
    );
    continue;
  }
  if (!norm.startsWith("data/") || !IMAGE_RE.test(norm)) continue;
  if (!norm.startsWith("data/public/")) {
    problems.push(`${f} — committed images must live under data/public/ (cleaned subset only)`);
  }
  const reason = metadataReason(stagedBytes(f));
  if (reason) {
    problems.push(
      `${f} — embedded metadata: ${reason}. Strip it (exiftool -all= / mogrify -strip) and re-stage`,
    );
  }
}

if (problems.length) {
  console.error("check-data-privacy: refusing the commit\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nSee data/README.md for the dataset privacy rules.");
  process.exit(1);
}

process.exit(0);
