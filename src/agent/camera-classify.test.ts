import test from "node:test";
import assert from "node:assert/strict";

import { cameraClassifyPrompt } from "./camera-classify";

test("bare input degrades to a baseline-style instruction", () => {
  const p = cameraClassifyPrompt({ machineIds: ["W-01", "W-02"] });
  assert.match(p, /classify these machines visible in the frame: W-01, W-02/i);
  assert.doesNotMatch(p, /ANNOTATED reference/);
  assert.doesNotMatch(p, /ANALYSIS MASK/);
  assert.doesNotMatch(p, /Per-machine notes/);
  assert.match(p, /Reply with JSON only/);
});

test("annotated + mask instructions appear in send order", () => {
  const p = cameraClassifyPrompt({
    machineIds: ["W-01"],
    hasAnnotatedShot: true,
    hasMask: true,
  });
  assert.ok(p.indexOf("ANNOTATED reference") < p.indexOf("ANALYSIS MASK"));
  assert.match(p, /never read a machine's state from it/);
  assert.match(p, /Ignore anything that falls under a black region/);
});

test("mask-only wording points at the image right after the main frame", () => {
  const p = cameraClassifyPrompt({ machineIds: ["W-01"], hasMask: true });
  assert.match(p, /The image after the main frame is an ANALYSIS MASK/);
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
