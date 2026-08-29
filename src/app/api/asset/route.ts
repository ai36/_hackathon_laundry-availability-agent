/**
 * GET /api/asset?path=<repo-relative path>   ->   the image bytes
 *
 * Preview helper for the integrator console. It serves a committed public frame, or an
 * uploaded site-config image **only if some camera in `data/site-config.json` references
 * it** — after a traversal check, an existence check, and a magic-byte sniff.
 *
 * TRUST BOUNDARY: no authentication; integrator-only local / on-prem service (D-0016). Read
 * only — it never writes. The `..`-reject + the frames-prefix / config-reference allow-list
 * keep reads to files the console itself points at; do not expose this route on a shared or
 * public host without a gate.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

import { NextResponse } from "next/server";

import { loadSiteConfig } from "@/eval/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRAMES_PREFIX = "data/public/frames/";
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/** Every image path any camera currently points at (stub / annotated / mask). */
function referencedPaths(): Set<string> {
  const out = new Set<string>();
  for (const cam of loadSiteConfig().cameras) {
    for (const p of [cam.stubImage, cam.annotatedShot, cam.mask]) if (p) out.add(p);
  }
  return out;
}

function sniff(b: Buffer): keyof typeof MIME | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (
    b.length >= 12 &&
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

export function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("path") ?? "";
  const rel = normalize(raw).replace(/\\/g, "/");
  const allowed =
    !rel.includes("..") && (rel.startsWith(FRAMES_PREFIX) || referencedPaths().has(rel));
  if (!allowed) {
    return NextResponse.json({ error: "path not allowed" }, { status: 400 });
  }
  const abs = join(process.cwd(), rel);
  if (!existsSync(abs)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = readFileSync(abs);
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "not an image" }, { status: 415 });

  return new NextResponse(new Uint8Array(buf), {
    headers: { "content-type": MIME[kind], "cache-control": "no-store" },
  });
}
