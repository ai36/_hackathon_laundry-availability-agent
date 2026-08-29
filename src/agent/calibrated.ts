/**
 * The calibrated agent (D-0015). One vision call per frame, like the baseline — but the
 * prompt is `cameraClassifyPrompt` and the call also carries the camera's calibration:
 *
 *   - the machine-id list is the **camera's** declared scope, not every machine in the frame;
 *   - the camera's `annotatedShot` (ids drawn on the view) goes in as a reference image;
 *   - the camera's `mask` (transparent over the panels to read, black elsewhere) goes in
 *     as a reference image + a prompt instruction;
 *   - any roster `promptFragment` for a scoped machine is appended as a per-machine note.
 *
 * The A/B against `runBaseline` is exact: same frame, same machine list, same model — the
 * only difference is the annotated shot, the mask, and the fragments.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { frameImagePath } from "@/eval/dataset";
import { loadRoster } from "@/eval/roster";
import type { Camera } from "@/eval/site-config";
import type { FramePrediction, MachinePrediction } from "@/eval/types";

import { cameraClassifyPrompt } from "./camera-classify";
import { parseAssessments } from "./parse";
import type { VisionClient } from "./types";

/** Repo-relative calibration asset → absolute path, or undefined if the file is absent. */
function assetPath(rel?: string): string | undefined {
  if (!rel) return undefined;
  const abs = join(process.cwd(), rel);
  return existsSync(abs) ? abs : undefined;
}

export async function runCalibrated(
  frameId: string,
  vision: VisionClient,
  camera: Camera,
): Promise<FramePrediction> {
  const machineIds = camera.machineIds;

  const fragments: Record<string, string> = {};
  for (const m of loadRoster().machines) {
    if (m.promptFragment?.trim() && machineIds.includes(m.machineId)) {
      fragments[m.machineId] = m.promptFragment.trim();
    }
  }

  const annotated = assetPath(camera.annotatedShot);
  const mask = assetPath(camera.mask);
  const extraImagePaths = [annotated, mask].filter((p): p is string => !!p);

  const res = await vision.analyze({
    cacheKey: `calibrated:${frameId}:${machineIds.join(",")}`,
    imagePath: frameImagePath(frameId),
    prompt: cameraClassifyPrompt({
      machineIds,
      fragments,
      hasAnnotatedShot: !!annotated,
      hasMask: !!mask,
    }),
    extraImagePaths,
  });

  const byId = new Map(parseAssessments(res.text).map((a) => [a.machineId, a]));
  const machines: MachinePrediction[] = machineIds.map((id) => {
    const a = byId.get(id);
    return {
      machineId: id,
      state: a?.state ?? "unknown",
      confidence: a?.confidence ?? 0,
      rationale: a?.rationale ?? "no answer",
    };
  });

  return {
    frameId,
    machines,
    meta: {
      mode: "calibrated",
      model: res.model,
      visionCalls: 1,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: res.costUsd,
    },
  };
}
