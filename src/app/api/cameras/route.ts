/**
 * Camera CRUD (D-0015 integrator console).
 *
 *   GET    /api/cameras                                                     -> { ok, cameras }
 *   POST   /api/cameras  { id, machineIdsText, stubImage?, mask? }
 *   PATCH  /api/cameras  { id, targetId?, machineIdsText?, stubImage?, mask? }
 *   DELETE /api/cameras  { id }
 *
 * For an image field on PATCH: a string sets it, `null` / `""` clears it, `undefined` (key
 * absent) leaves it unchanged. `annotatedShot` is no longer settable here (it fed only the
 * `--mode=calibrated` dead-end); an existing value on a camera is preserved untouched.
 *
 * Writes data/site-config.json (a fixed path). Node runtime; works under `npm run dev` /
 * any self-hosted Node/Docker host, not a read-only serverless FS.
 *
 * TRUST BOUNDARY: this route has **no authentication** and writes into the repo. It is for
 * the integrator on a local / on-prem service only (D-0016), where the operator is trusted.
 * Camera and machine ids are restricted to `[A-Za-z0-9_-]+`, but do not expose this route on
 * a shared or public host without a gate.
 */
import { NextResponse } from "next/server";

import {
  loadSiteConfig,
  parseMachineIds,
  removeCamera,
  upsertCamera,
  writeSiteConfig,
  SITE_ID_RE,
} from "@/eval/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  targetId?: string;
  machineIdsText?: string;
  machineIds?: string[];
  stubImage?: string | null;
  mask?: string | null;
};

async function body(req: Request): Promise<Body> {
  try {
    return (await req.json()) as Body;
  } catch {
    throw new Error("body must be JSON");
  }
}

function ids(b: Body): string[] {
  if (Array.isArray(b.machineIds)) return b.machineIds;
  return parseMachineIds(b.machineIdsText ?? "");
}

export function GET() {
  return NextResponse.json({ ok: true, cameras: loadSiteConfig().cameras });
}

export async function POST(req: Request) {
  try {
    const b = await body(req);
    if (!SITE_ID_RE.test(b.id ?? "")) throw new Error("camera id must match [A-Za-z0-9_-]+");
    const cfg = loadSiteConfig();
    if (cfg.cameras.some((c) => c.id === b.id)) {
      return NextResponse.json({ error: `${b.id} already exists` }, { status: 409 });
    }
    const next = writeSiteConfig(
      upsertCamera(cfg, {
        id: b.id!,
        machineIds: ids(b),
        stubImage: b.stubImage || undefined,
        mask: b.mask || undefined,
      }),
    );
    return NextResponse.json({ ok: true, cameras: next.cameras });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await body(req);
    if (!SITE_ID_RE.test(b.id ?? "")) throw new Error("camera id must match [A-Za-z0-9_-]+");
    const cfg = loadSiteConfig();
    const targetId = b.targetId ?? b.id!;
    const cur = cfg.cameras.find((c) => c.id === targetId);
    if (!cur) return NextResponse.json({ error: `${targetId} not found` }, { status: 404 });
    if (b.id !== targetId && cfg.cameras.some((c) => c.id === b.id)) {
      return NextResponse.json({ error: `${b.id} already exists` }, { status: 409 });
    }
    const next = writeSiteConfig(
      upsertCamera(cfg, {
        id: b.id!,
        targetId,
        machineIds:
          b.machineIdsText === undefined && b.machineIds === undefined ? cur.machineIds : ids(b),
        stubImage: b.stubImage === undefined ? cur.stubImage : b.stubImage || undefined,
        annotatedShot: cur.annotatedShot, // preserved, not settable via the portal
        mask: b.mask === undefined ? cur.mask : b.mask || undefined,
      }),
    );
    return NextResponse.json({ ok: true, cameras: next.cameras });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await body(req);
    const cfg = loadSiteConfig();
    if (!cfg.cameras.some((c) => c.id === b.id)) {
      return NextResponse.json({ error: `${b.id} not found` }, { status: 404 });
    }
    const next = writeSiteConfig(removeCamera(cfg, b.id!));
    return NextResponse.json({ ok: true, cameras: next.cameras });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "request failed";
}
