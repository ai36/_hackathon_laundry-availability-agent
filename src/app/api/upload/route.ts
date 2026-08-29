/**
 * Image upload for the integrator console (D-0015).
 *
 *   POST /api/upload   multipart/form-data
 *     file      : the image (jpeg / png / webp, ≤ 4 MB)
 *     kind      : "camera-stub" | "camera-annotated" | "camera-mask" | "machine-reference"
 *     ownerId   : camera id or machine id ([A-Za-z0-9_-]+)
 *     state     : required for "machine-reference" (free|occupied|out_of_order|unknown)
 *   -> { ok, path }   a repo-relative path under data/site-config/<ownerId>/
 *
 * Node runtime; works under `npm run dev` / any self-hosted Node/Docker host.
 *
 * TRUST BOUNDARY: this route has **no authentication** and writes image files into the repo
 * (under data/site-config/, which is git-ignored). It is for the integrator on a local /
 * on-prem service only (D-0016), where the operator is trusted. `ownerId` is restricted to
 * `[A-Za-z0-9_-]+` and the filename + extension are fixed per kind (the ext comes from a
 * **magic-byte sniff**, not the client mime), so the write stays inside
 * data/site-config/<ownerId>/ and only real jpeg/png/webp lands on disk; a 4 MB cap is
 * enforced. Do not expose this route on a shared or public host without a gate.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { SITE_ID_RE } from "@/eval/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["camera-stub", "camera-annotated", "camera-mask", "machine-reference"] as const;
const STATES = ["free", "occupied", "out_of_order", "unknown"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024;

/** Magic-byte sniff — don't trust the client-supplied mime for what lands on disk. */
function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    const ownerId = String(form.get("ownerId") ?? "");
    const state = String(form.get("state") ?? "");

    if (!(file instanceof Blob)) throw new Error("file is required");
    if (!KINDS.includes(kind as (typeof KINDS)[number]))
      throw new Error(`kind must be one of ${KINDS.join(", ")}`);
    if (!SITE_ID_RE.test(ownerId)) throw new Error("ownerId must match [A-Za-z0-9_-]+");
    if (kind === "machine-reference" && !STATES.includes(state)) {
      throw new Error(`state must be one of ${STATES.join(", ")}`);
    }
    if (!EXT[file.type]) throw new Error("file must be jpeg, png, or webp");
    if (file.size > MAX_BYTES) throw new Error("file exceeds 4 MB");

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = sniff(buf); // the extension comes from the bytes, not the client's mime
    if (!ext) throw new Error("file content is not a valid jpeg, png, or webp");

    const base =
      kind === "camera-stub"
        ? "stub"
        : kind === "camera-annotated"
          ? "annotated"
          : kind === "camera-mask"
            ? "mask"
            : `ref-${state}`;
    const relDir = join("data", "site-config", ownerId);
    mkdirSync(join(process.cwd(), relDir), { recursive: true });
    const rel = join(relDir, `${base}.${ext}`).replace(/\\/g, "/");
    writeFileSync(join(process.cwd(), rel), buf);

    return NextResponse.json({ ok: true, path: rel });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload failed" },
      { status: 400 },
    );
  }
}
