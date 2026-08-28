import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyCorrections, loadCorrections } from "./corrections";
import type { FramePrediction } from "./types";

function fixture(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "laundry3-corr-"));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(body));
  }
  return dir;
}

const pred = (
  frameId: string,
  machines: Array<[string, FramePrediction["machines"][number]["state"]]>,
): FramePrediction => ({
  frameId,
  machines: machines.map(([machineId, state]) => ({ machineId, state, confidence: 0.6 })),
});

test("observation-scope correction overrides only its own frame", () => {
  const dir = fixture({
    "img_1.json": {
      frameId: "img_1",
      corrections: [
        {
          machineId: "W-01",
          correctState: "occupied",
          by: "integrator",
          at: "2026-08-29T00:00:00Z",
        },
      ],
    },
  });
  try {
    const c = loadCorrections(dir);
    assert.equal(c.count, 1);
    const a = applyCorrections(pred("img_1", [["W-01", "free"]]), c);
    assert.equal(a.applied, 1);
    assert.equal(a.prediction.machines[0].state, "occupied");
    assert.equal(a.prediction.machines[0].confidence, 1);
    // a different frame with the same machine is untouched
    const b = applyCorrections(pred("img_2", [["W-01", "free"]]), c);
    assert.equal(b.applied, 0);
    assert.equal(b.prediction.machines[0].state, "free");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("machine-scope correction applies to every frame", () => {
  const dir = fixture({
    "img_1823.json": {
      frameId: "img_1823",
      corrections: [
        {
          machineId: "D-06",
          correctState: "out_of_order",
          scope: "machine",
          note: "taped off",
          by: "integrator",
          at: "x",
        },
      ],
    },
  });
  try {
    const c = loadCorrections(dir);
    for (const f of ["img_1823", "img_1825", "img_1826"]) {
      const a = applyCorrections(pred(f, [["D-06", "occupied"]]), c);
      assert.equal(a.prediction.machines[0].state, "out_of_order", `frame ${f}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("input prediction is not mutated", () => {
  const dir = fixture({
    "img_1.json": {
      frameId: "img_1",
      corrections: [{ machineId: "W-01", correctState: "occupied", by: "i", at: "x" }],
    },
  });
  try {
    const p = pred("img_1", [["W-01", "free"]]);
    applyCorrections(p, loadCorrections(dir));
    assert.equal(p.machines[0].state, "free");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects an invalid correctState", () => {
  const dir = fixture({
    "img_1.json": {
      frameId: "img_1",
      corrections: [{ machineId: "W-01", correctState: "busy", by: "i", at: "x" }],
    },
  });
  try {
    assert.throws(() => loadCorrections(dir), /correctState/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing directory yields no corrections", () => {
  const c = loadCorrections(join(tmpdir(), "laundry3-corr-does-not-exist"));
  assert.equal(c.count, 0);
});
