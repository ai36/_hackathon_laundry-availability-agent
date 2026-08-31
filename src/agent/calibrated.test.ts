import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { loadFrameLabels } from "@/eval/dataset";
import { loadSiteConfig, type Camera } from "@/eval/site-config";

import { runCalibrated } from "./calibrated";
import type { VisionClient, VisionRequest, VisionResponse } from "./types";
import { requestHash } from "./vision";

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

/**
 * REPLAY-INVARIANT PIN (D-0015 amendment, 2026-08-30). `--mode=calibrated` is a frozen
 * dead-end whose `--replay` must keep hitting the committed `data/cache/calibrated/` files.
 * For every evaluation frame, rebuild the exact request `runCalibrated` would send against
 * the committed site-config / labels / assets and assert its hash resolves to a committed
 * cache file. This fails loudly on every way the replay silently broke before:
 * roster `promptFragment`s folded into the prompt (the roster HAS fragments for scoped
 * machines — e.g. C-01 scopes W-04), absolute / cwd-dependent `extraImagePaths`, prompt-text
 * drift, or a deleted calibration asset flipping the `has*` flags.
 */
test("calibrated --replay hash pins to the committed cache for every eval frame", async () => {
  const frames = readFileSync("data/splits/evaluation.txt", "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
  assert.ok(frames.length >= 5, "evaluation split unexpectedly small");

  const cameras = loadSiteConfig().cameras;
  const labels = loadFrameLabels();

  for (const frameId of frames) {
    const cam = cameras.find((c) => c.id === labels.get(frameId)?.camera);
    assert.ok(cam, `no camera for ${frameId}`);

    const vision = new SpyVision(JSON.stringify({ machines: [] }));
    await runCalibrated(frameId, vision, cam);
    const req = vision.last;
    assert.ok(req, "no request captured");

    // the frozen config: both assets attached, repo-relative, no per-machine notes
    assert.equal(req.extraImagePaths?.length, 2, `${frameId}: expected annotated + mask`);
    for (const p of req.extraImagePaths ?? []) {
      assert.ok(!/^([A-Za-z]:|\/)/.test(p), `${frameId}: extra image path not relative: ${p}`);
    }
    assert.doesNotMatch(req.prompt, /Per-machine notes/, `${frameId}: fragments leaked in`);

    const file = join("data", "cache", "calibrated", `${requestHash(req)}.json`);
    assert.ok(existsSync(file), `${frameId}: replay hash misses committed cache (${file})`);
  }
});
