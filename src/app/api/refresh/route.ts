/**
 * "Refresh recognition" (D-0015 integrator console, D-0016 runtime hook).
 *
 *   POST /api/refresh  ->  { ok, room, capture: [...], live, ranAt, note? }
 *
 * One cycle of the runtime loop: for every declared camera, "capture" its current frame
 * (P0: the uploaded stub image — a StaticImageFrameSource, D-0016) and, when
 * `ANTHROPIC_API_KEY` is set, run the vision agent on it for that camera's machine ids. The
 * prompt is `cameraClassifyPrompt` (`src/agent/camera-classify.ts`), NOT the eval's frozen
 * `baselinePrompt` — it folds in the roster's per-machine `promptFragment` hints and, when
 * the camera has them, an annotated "spatial key" still and an analysis mask as extra
 * reference images (D-0015). With none of those calibrated it degrades to the baseline
 * wording. Its accuracy effect is UNMEASURED — the frozen 9-frame eval scores the CLI agent,
 * not this route. Live per-machine states are **fused into the returned room** (below D-0014
 * corrections, which stay authoritative). Key-free, the endpoint degrades to a plain
 * re-fusion of the committed report + `data/corrections/` — no model call, no cost.
 *
 * COST: the live branch calls the Anthropic API once per camera-with-a-feed. It only fires
 * when `ANTHROPIC_API_KEY` is set; the key-free default (the judge's path) makes zero calls.
 * `data/site-config.json` seeds 5 cameras whose stub images are the committed eval frames,
 * so a keyed manual "refresh" is ~5 calls. The client "auto" toggle is off by default and
 * caps itself at MAX_AUTO cycles (see refresh-control).
 *
 * The client "auto" toggle calls this on an interval (period = runtime.stateRefreshSeconds).
 * Node runtime; integrator-only local / on-prem service (no auth — see D-0016).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { cameraClassifyPrompt } from "@/agent/camera-classify";
import { parseAssessments } from "@/agent/parse";
import { AnthropicVisionClient, CachedVisionClient } from "@/agent/vision";
import { loadRoster } from "@/eval/roster";
import { loadSiteConfig } from "@/eval/site-config";
import type { MachineState } from "@/eval/types";
import { buildRoomStatus } from "@/portal/room-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONABLE: MachineState[] = ["free", "occupied", "out_of_order"];

/** Resolve a repo-relative calibration asset to an absolute path, or null if absent. */
function assetPath(rel?: string): string | null {
  if (!rel) return null;
  const abs = join(process.cwd(), rel);
  return existsSync(abs) ? abs : null;
}

export async function POST() {
  const cameras = loadSiteConfig().cameras;
  const haveKey = !!process.env.ANTHROPIC_API_KEY;

  // Per-machine hints from the roster (D-0015) — folded into each camera's prompt.
  const fragments: Record<string, string> = {};
  for (const m of loadRoster().machines) {
    if (m.promptFragment?.trim()) fragments[m.machineId] = m.promptFragment.trim();
  }

  const capture = cameras.map((cam) => ({
    camera: cam.id,
    machineIds: cam.machineIds,
    feed: cam.stubImage && existsSync(join(process.cwd(), cam.stubImage)) ? cam.stubImage : null,
    annotatedPath: assetPath(cam.annotatedShot),
    maskPath: assetPath(cam.mask),
    classified: 0,
    refs: 0,
    error: undefined as string | undefined,
  }));

  // Live per-machine assessments, keyed by machineId (higher confidence wins).
  const liveByMachine = new Map<
    string,
    { state: MachineState; confidence: number; camera: string }
  >();
  let live = false;

  if (haveKey) {
    const vision = new CachedVisionClient(new AnthropicVisionClient(), "data/cache/live", false);
    for (const c of capture) {
      if (!c.feed || c.machineIds.length === 0) continue;
      const extraImagePaths = [c.annotatedPath, c.maskPath].filter((p): p is string => !!p);
      c.refs = extraImagePaths.length;
      try {
        const res = await vision.analyze({
          cacheKey: `live:${c.camera}:${c.machineIds.join(",")}`,
          imagePath: join(process.cwd(), c.feed),
          prompt: cameraClassifyPrompt({
            machineIds: c.machineIds,
            fragments,
            hasAnnotatedShot: !!c.annotatedPath,
            hasMask: !!c.maskPath,
          }),
          extraImagePaths,
        });
        const rows = parseAssessments(res.text).filter((r) => c.machineIds.includes(r.machineId));
        c.classified = rows.length;
        for (const r of rows) {
          const prev = liveByMachine.get(r.machineId);
          if (!prev || r.confidence > prev.confidence) {
            liveByMachine.set(r.machineId, {
              state: r.state,
              confidence: r.confidence,
              camera: c.camera,
            });
          }
        }
        live = true;
      } catch (e) {
        c.error = e instanceof Error ? e.message : "classify failed";
      }
    }
  }

  // Re-fuse the committed report + corrections, then overlay live reads (corrections win).
  const room = buildRoomStatus();
  if (liveByMachine.size > 0) {
    room.machines = room.machines.map((m) => {
      const l = liveByMachine.get(m.machineId);
      if (!l || m.corrected || !ACTIONABLE.includes(l.state)) return m;
      return { ...m, state: l.state, confidence: l.confidence, source: `live:${l.camera}` };
    });
    const counts: Record<MachineState, number> = {
      free: 0,
      occupied: 0,
      unknown: 0,
      out_of_order: 0,
    };
    for (const m of room.machines) counts[m.state]++;
    room.counts = counts;
  }

  return NextResponse.json({
    ok: true,
    room,
    live,
    // Drop the resolved absolute asset paths — the client only needs the ref count.
    capture: capture.map((c) => ({
      camera: c.camera,
      machineIds: c.machineIds,
      feed: c.feed,
      classified: c.classified,
      refs: c.refs,
      error: c.error,
    })),
    ranAt: new Date().toISOString(),
    note: haveKey
      ? undefined
      : "no ANTHROPIC_API_KEY — re-fused the committed report + corrections (no live classify)",
  });
}
