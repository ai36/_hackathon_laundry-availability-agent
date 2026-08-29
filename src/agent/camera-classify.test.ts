import test from "node:test";
import assert from "node:assert/strict";

import { cameraClassifyPrompt } from "./camera-classify";

test("bare input degrades to a baseline-style instruction", () => {
  const p = cameraClassifyPrompt({ machineIds: ["W-01", "W-02"] });
  assert.match(p, /Classify these machines, reading state only from IMAGE 1: W-01, W-02/);
  assert.doesNotMatch(p, /LOCATION MAP/);
  assert.doesNotMatch(p, /ANALYSIS MASK/);
  assert.doesNotMatch(p, /Per-machine notes/);
  assert.match(p, /Reply with JSON only/);
});

test("annotated + mask are numbered in send order after the live photo", () => {
  const p = cameraClassifyPrompt({
    machineIds: ["W-01"],
    hasAnnotatedShot: true,
    hasMask: true,
  });
  assert.match(p, /IMAGE 1 is the live camera photo/);
  assert.match(p, /IMAGE 2 is a LOCATION MAP/);
  assert.match(p, /IMAGE 3 is an analysis mask/);
  assert.ok(p.indexOf("LOCATION MAP") < p.indexOf("analysis mask"));
  assert.match(p, /Never read state,[\s\S]*from IMAGE 2/);
  // cross-reference procedure only appears when both images are present
  assert.match(p, /read the id at the same position in IMAGE 2/);
});

test("mask without an annotated shot is IMAGE 2 and has no cross-reference step", () => {
  const p = cameraClassifyPrompt({ machineIds: ["W-01"], hasMask: true });
  assert.match(p, /IMAGE 2 is an analysis mask/);
  assert.doesNotMatch(p, /IMAGE 3/);
  assert.doesNotMatch(p, /same position in IMAGE/);
});

test("only fragments for listed machines with non-empty text are included", () => {
  const p = cameraClassifyPrompt({
    machineIds: ["W-01", "W-02"],
    fragments: {
      "W-01": "  reads 'PF' when the door is ajar  ",
      "W-02": "   ",
      "D-09": "off-camera",
    },
  });
  assert.match(p, /Per-machine notes from the site operator:/);
  assert.match(p, /- W-01: reads 'PF' when the door is ajar/);
  assert.doesNotMatch(p, /W-02:/);
  assert.doesNotMatch(p, /D-09/);
});
