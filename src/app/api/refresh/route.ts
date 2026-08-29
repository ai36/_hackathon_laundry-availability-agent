/**
 * "Refresh recognition" (D-0015 integrator console, D-0016 runtime hook).
 *
 *   POST /api/refresh  ->  { ok, room, capture: [...], live, ranAt, note? }
 *
 * One cycle of the runtime loop: for every declared camera, "capture" its current frame
 * (P0: the uploaded stub image — a StaticImageFrameSource, D-0016) and, when
 * `ANTHROPIC_API_KEY` is set, run the vision agent on it for that camera's machine ids. Live
 * per-machine states are **fused into the returned room** (below D-0014 corrections, which
 * stay authoritative). Key-free, the endpoint degrades to a plain re-fusion of the committed
 * report + `data/corrections/` — no model call, no cost.
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

import { baselinePrompt } from "@/agent/baseline";
import { parseAssessments } from "@/agent/parse";
import { AnthropicVisionClient, CachedVisionClient } from "@/agent/vision";
import type { MachineState } from "@/eval/types";
import { loadSiteConfig } from "@/eval/site-config";
import { buildRoomStatus } from "@/portal/room-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONABLE: MachineState[] = ["free", "occupied", "out_of_order"];

export async function POST() {
  const cameras = loadSiteConfig().cameras;
  const haveKey = !!process.env.ANTHROPIC_API_KEY;

  const capture = cameras.map((cam) => ({
    camera: cam.id,
    machineIds: cam.machineIds,
    feed: cam.stubImage && existsSync(join(process.cwd(), cam.stubImage)) ? cam.stubImage : null,
    classified: 0,
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
      try {
        const res = await vision.analyze({
          cacheKey: `live:${c.camera}:${c.machineIds.join(",")}`,
          imagePath: join(process.cwd(), c.feed),
          prompt: baselinePrompt(c.machineIds),
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
    capture,
    ranAt: new Date().toISOString(),
    note: haveKey
      ? undefined
      : "no ANTHROPIC_API_KEY — re-fused the committed report + corrections (no live classify)",
  });
}
