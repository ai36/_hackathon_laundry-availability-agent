import test from "node:test";
import assert from "node:assert/strict";

import { baselinePrompt } from "./baseline";

test("baselinePrompt with no fragments is unchanged (eval cache stays valid)", () => {
  const p = baselinePrompt(["W-01", "W-02"]);
  assert.doesNotMatch(p, /operator reading-rules/i);
  assert.equal(baselinePrompt(["W-01", "W-02"]), baselinePrompt(["W-01", "W-02"], {}));
});

test("baselinePrompt appends a rule only for machines that have one and are in the frame", () => {
  const p = baselinePrompt(["W-01", "W-02"], {
    "W-02": "the 2.25 is the price, not a countdown",
    "W-09": "not in this frame — must not appear",
  });
  assert.match(p, /Per-machine operator reading-rules:/);
  assert.match(p, /- W-02: the 2\.25 is the price, not a countdown/);
  assert.doesNotMatch(p, /W-09/);
});
