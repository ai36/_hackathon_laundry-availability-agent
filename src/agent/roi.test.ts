import test from "node:test";
import assert from "node:assert/strict";

import type { Camera } from "@/eval/site-config";

import { runRoi } from "./roi";
import type { VisionClient, VisionRequest, VisionResponse } from "./types";

/** Returns a canned answer per cacheKey, and records every request. */
class MapVision implements VisionClient {
  seen: VisionRequest[] = [];
  constructor(private readonly byKey: Record<string, string>) {}
  async analyze(req: VisionRequest): Promise<VisionResponse> {
    this.seen.push(req);
    return { text: this.byKey[req.cacheKey] ?? '{"machines":[]}', model: "map" };
  }
}

// C-01: the committed region map + legend (front-on washers → four solo crops).
const C01: Camera = {
  id: "C-01",
  machineIds: ["W-01", "W-02", "W-03", "W-04"],
  stubImage: "data/public/frames/img_1819.jpg",
  mask: "data/public/frames/img_1819.mask.png",
  maskLegend: { ff0000: "W-01", "0000ff": "W-02", "00ff00": "W-03", ffff00: "W-04" },
};

test("runRoi crops one call per machine and maps answers back by id", async () => {
  const vision = new MapVision({
    "roi:img_1819:W-01": '{"machines":[{"machineId":"W-01","state":"free","confidence":0.9}]}',
    "roi:img_1819:W-02": '{"machines":[{"machineId":"W-02","state":"occupied","confidence":0.8}]}',
    "roi:img_1819:W-03":
      '{"machines":[{"machineId":"W-03","state":"out_of_order","confidence":0.7}]}',
    // W-04: no canned answer → falls back to unknown
  });

  const pred = await runRoi("img_1819", vision, C01, /* writeCrops */ false);

  assert.equal(pred.meta?.mode, "roi");
  assert.equal(pred.meta?.visionCalls, 4);
  assert.deepEqual(
    pred.machines.map((m) => [m.machineId, m.state]),
    [
      ["W-01", "free"],
      ["W-02", "occupied"],
      ["W-03", "out_of_order"],
      ["W-04", "unknown"],
    ],
  );
  // every request carried a crop bbox and a per-machine cache key
  assert.equal(vision.seen.length, 4);
  for (const r of vision.seen) {
    assert.ok(Array.isArray(r.crop) && r.crop.length === 4);
    assert.match(r.cacheKey, /^roi:img_1819:W-0[1-4]$/);
  }
});

test("runRoi yields `unknown` for a machine with no coloured region", async () => {
  const cam: Camera = { ...C01, machineIds: [...C01.machineIds, "W-99"] };
  const pred = await runRoi("img_1819", new MapVision({}), cam, false);
  assert.equal(pred.machines.find((m) => m.machineId === "W-99")?.state, "unknown");
});
