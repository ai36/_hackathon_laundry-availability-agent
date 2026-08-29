import test from "node:test";
import assert from "node:assert/strict";

import type { Camera } from "@/eval/site-config";

import { runCalibrated } from "./calibrated";
import type { VisionClient, VisionRequest, VisionResponse } from "./types";

/** Captures the request and returns a canned reply. */
class SpyVision implements VisionClient {
  last?: VisionRequest;
  constructor(private readonly text: string) {}
  async analyze(req: VisionRequest): Promise<VisionResponse> {
    this.last = req;
    return { text: this.text, model: "spy", inputTokens: 1, outputTokens: 1, costUsd: 0 };
  }
}

const camera: Camera = {
  id: "C-01",
  machineIds: ["W-01", "W-02", "W-03"],
  // asset paths that don't exist -> filtered out, but the prompt still mentions neither
  annotatedShot: "data/public/frames/does-not-exist.annotated.jpg",
  mask: "data/public/frames/does-not-exist.mask.png",
};

test("runCalibrated asks about exactly the camera's machines, in order", async () => {
  const vision = new SpyVision(
    JSON.stringify({
      machines: [
        { machineId: "W-02", state: "occupied", confidence: 0.9, rationale: "running" },
        { machineId: "W-01", state: "free", confidence: 0.8, rationale: "idle" },
      ],
    }),
  );
  const pred = await runCalibrated("f1", vision, camera);

  assert.deepEqual(
    pred.machines.map((m) => m.machineId),
    ["W-01", "W-02", "W-03"],
  );
  assert.equal(pred.machines[0].state, "free");
  assert.equal(pred.machines[1].state, "occupied");
  // no assessment returned for W-03 -> unknown
  assert.equal(pred.machines[2].state, "unknown");
  assert.equal(pred.meta?.mode, "calibrated");
  assert.equal(pred.meta?.visionCalls, 1);
  assert.equal(vision.last?.cacheKey, "calibrated:f1:W-01,W-02,W-03");
});

test("runCalibrated drops missing calibration asset files from the request", async () => {
  const vision = new SpyVision(JSON.stringify({ machines: [] }));
  await runCalibrated("f1", vision, camera);
  assert.deepEqual(vision.last?.extraImagePaths, []);
  // prompt must not promise images that were not attached
  assert.doesNotMatch(vision.last?.prompt ?? "", /ANNOTATED reference/);
  assert.doesNotMatch(vision.last?.prompt ?? "", /ANALYSIS MASK/);
});
