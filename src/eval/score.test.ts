import test from "node:test";
import assert from "node:assert/strict";

import { scoreAll } from "./score";
import type { FrameLabel, FramePrediction } from "./types";

function label(machines: FrameLabel["machines"]): Map<string, FrameLabel> {
  return new Map([["f1", { frameId: "f1", machines }]]);
}
function pred(machines: FramePrediction["machines"]): Map<string, FramePrediction> {
  return new Map([["f1", { frameId: "f1", machines }]]);
}

test("all correct → 100% accuracy, 0 harmful, full coverage", () => {
  const s = scoreAll(
    pred([
      { machineId: "a", state: "free", confidence: 1 },
      { machineId: "b", state: "occupied", confidence: 1 },
    ]),
    label([
      { machineId: "a", type: "washer", state: "free", gtDeterminate: true },
      { machineId: "b", type: "dryer", state: "occupied", gtDeterminate: true },
    ]),
    ["f1"],
  );
  assert.equal(s.accuracy, 1);
  assert.equal(s.harmfulErrorRate, 0);
  assert.equal(s.coverage, 1);
});

test("a false 'free' is incorrect AND harmful", () => {
  const s = scoreAll(
    pred([{ machineId: "a", state: "free", confidence: 0.9 }]),
    label([{ machineId: "a", type: "washer", state: "occupied", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.accuracy, 0);
  assert.equal(s.harmfulErrorRate, 1);
  assert.equal(s.coverage, 1);
});

test("abstaining on a determinate GT is incorrect but NOT harmful", () => {
  const s = scoreAll(
    pred([{ machineId: "a", state: "unknown", confidence: 0.2 }]),
    label([{ machineId: "a", type: "washer", state: "occupied", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.accuracy, 0);
  assert.equal(s.harmfulErrorRate, 0);
  assert.equal(s.coverage, 0);
  assert.equal(s.accuracyOnCovered, 0);
});

test("indeterminable GT is excluded from accuracy", () => {
  const s = scoreAll(
    pred([
      { machineId: "a", state: "free", confidence: 1 },
      { machineId: "b", state: "occupied", confidence: 1 },
    ]),
    label([
      { machineId: "a", type: "washer", state: "free", gtDeterminate: true },
      { machineId: "b", type: "dryer", state: "unknown", gtDeterminate: false },
    ]),
    ["f1"],
  );
  assert.equal(s.nDeterminate, 1);
  assert.equal(s.nIndeterminable, 1);
  assert.equal(s.accuracy, 1);
});

test("out_of_order predicted correctly is accurate and not harmful", () => {
  const s = scoreAll(
    pred([{ machineId: "a", state: "out_of_order", confidence: 0.9 }]),
    label([{ machineId: "a", type: "washer", state: "out_of_order", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.accuracy, 1);
  assert.equal(s.harmfulErrorRate, 0);
  assert.equal(s.coverage, 1);
});

test("calling an out_of_order machine 'free' is a harmful error", () => {
  const s = scoreAll(
    pred([{ machineId: "a", state: "free", confidence: 0.8 }]),
    label([{ machineId: "a", type: "washer", state: "out_of_order", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.accuracy, 0);
  assert.equal(s.harmfulErrorRate, 1);
});

test("calling a free machine 'out_of_order' is wrong but NOT harmful", () => {
  const s = scoreAll(
    pred([{ machineId: "a", state: "out_of_order", confidence: 0.6 }]),
    label([{ machineId: "a", type: "washer", state: "free", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.accuracy, 0);
  assert.equal(s.harmfulErrorRate, 0);
  assert.equal(s.coverage, 1); // out_of_order is an actionable answer
});

test("a missing prediction counts as unknown and is tracked", () => {
  const s = scoreAll(
    pred([]),
    label([{ machineId: "a", type: "washer", state: "free", gtDeterminate: true }]),
    ["f1"],
  );
  assert.equal(s.missingPredictions, 1);
  assert.equal(s.accuracy, 0);
  assert.equal(s.harmfulErrorRate, 0);
});
