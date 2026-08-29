import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

import { groupRegions, loadMaskRegions, type MaskRegion } from "./mask-regions";

/** Paint solid rectangles of the given colours onto a black `w×h` PNG. */
async function makeMap(
  w: number,
  h: number,
  rects: { hex: string; left: number; top: number; width: number; height: number }[],
): Promise<string> {
  const overlays = rects.map((r) => ({
    input: {
      create: {
        width: r.width,
        height: r.height,
        channels: 4 as const,
        background: `#${r.hex}`,
      },
    },
    left: r.left,
    top: r.top,
  }));
  const p = join(mkdtempSync(join(tmpdir(), "laundry3-rm-")), "map.png");
  await sharp({ create: { width: w, height: h, channels: 4, background: "#000000" } })
    .composite(overlays)
    .png()
    .toFile(p);
  return p;
}

test("loadMaskRegions returns one bbox per legend colour", async () => {
  const map = await makeMap(200, 100, [
    { hex: "ff0000", left: 10, top: 10, width: 40, height: 60 },
    { hex: "00ff00", left: 120, top: 20, width: 50, height: 50 },
  ]);
  const regions = await loadMaskRegions(map, { ff0000: "W-01", "00ff00": "W-02" });
  regions.sort((a, b) => a.bbox[0] - b.bbox[0]);
  assert.equal(regions.length, 2);
  assert.equal(regions[0].machineId, "W-01");
  assert.deepEqual(regions[0].bbox, [10, 10, 40, 60]);
  assert.equal(regions[1].machineId, "W-02");
});

test("loadMaskRegions tolerates colour drift (nearest legend colour wins)", async () => {
  // painted #f40800, legend says #ff0000 — within tolerance
  const map = await makeMap(120, 80, [{ hex: "f40800", left: 5, top: 5, width: 60, height: 60 }]);
  const regions = await loadMaskRegions(map, { ff0000: "W-01", "0000ff": "W-02" });
  assert.equal(regions.length, 1);
  assert.equal(regions[0].machineId, "W-01");
});

test("loadMaskRegions returns [] with no legend or missing file", async () => {
  const map = await makeMap(50, 50, [{ hex: "ff0000", left: 5, top: 5, width: 20, height: 20 }]);
  assert.deepEqual(await loadMaskRegions(map, {}), []);
  assert.deepEqual(await loadMaskRegions(join(tmpdir(), "nope.png"), { ff0000: "W-01" }), []);
});

const R = (machineId: string, x: number, y: number, w = 30, h = 30): MaskRegion => ({
  machineId,
  bbox: [x, y, w, h],
  centre: [x + w / 2, y + h / 2],
  pixels: w * h,
});

test("groupRegions: a vertical x-overlapping pair is one stacked group", () => {
  const groups = groupRegions([R("D-01", 10, 0, 40, 50), R("D-02", 12, 45, 40, 50)]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].stacked, true);
  assert.deepEqual(
    groups[0].regions.map((r) => r.machineId),
    ["D-01", "D-02"],
  ); // ordered top→bottom
});

test("groupRegions: a perspective-diagonal row stays as separate solo groups", () => {
  // three machines receding: x and y both step by a similar amount → NOT a stack
  const groups = groupRegions([
    R("W-14", 0, 40, 80, 60),
    R("W-15", 40, 20, 70, 55),
    R("W-16", 75, 5, 60, 45),
  ]);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => !g.stacked));
});
