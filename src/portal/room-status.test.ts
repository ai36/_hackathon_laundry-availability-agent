import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildRoomStatus } from "./room-status";

function fixture(): { report: string; roster: string; corr: string } {
  const dir = mkdtempSync(join(tmpdir(), "laundry3-room-"));
  const report = join(dir, "report.json");
  const roster = join(dir, "machines.json");
  const corr = join(dir, "corrections");
  mkdirSync(corr);
  writeFileSync(
    roster,
    JSON.stringify({
      machines: [
        { machineId: "W-01", type: "washer" },
        { machineId: "D-01", type: "dryer" },
      ],
    }),
  );
  writeFileSync(
    report,
    JSON.stringify({
      model: "test-model",
      mode: "agent",
      predictions: {
        frameA: {
          machines: [
            { machineId: "W-01", state: "unknown", confidence: 0.9 },
            { machineId: "D-01", state: "unknown", confidence: 0.4 },
          ],
        },
        frameB: {
          machines: [{ machineId: "W-01", state: "occupied", confidence: 0.55 }],
        },
      },
    }),
  );
  return { report, roster, corr };
}

test("prefers an actionable observation over a more confident unknown", () => {
  const { report, roster, corr } = fixture();
  const room = buildRoomStatus(report, roster, corr);
  const w1 = room.machines.find((m) => m.machineId === "W-01")!;
  assert.equal(w1.state, "occupied"); // 0.55 actionable beats 0.9 unknown
  assert.equal(w1.confidence, 0.55);
  assert.equal(w1.seenIn, 2);
});

test("falls back to the most confident unknown when nothing actionable", () => {
  const { report, roster, corr } = fixture();
  const room = buildRoomStatus(report, roster, corr);
  const d1 = room.machines.find((m) => m.machineId === "D-01")!;
  assert.equal(d1.state, "unknown");
  assert.equal(d1.seenIn, 1);
});

test("counts and provenance are populated", () => {
  const { report, roster, corr } = fixture();
  const room = buildRoomStatus(report, roster, corr);
  assert.equal(room.counts.occupied, 1);
  assert.equal(room.counts.unknown, 1);
  assert.equal(room.provenance.model, "test-model");
  assert.equal(room.provenance.corrections, 0);
});

test("machines are sorted by id and typed from the roster", () => {
  const { report, roster, corr } = fixture();
  const room = buildRoomStatus(report, roster, corr);
  assert.deepEqual(
    room.machines.map((m) => m.machineId),
    ["D-01", "W-01"],
  );
  assert.equal(room.machines.find((m) => m.machineId === "D-01")!.type, "dryer");
});

test("a machine-scope correction overrides the fused state and is flagged", () => {
  const { report, roster, corr } = fixture();
  writeFileSync(
    join(corr, "frameB.json"),
    JSON.stringify({
      frameId: "frameB",
      corrections: [
        {
          machineId: "W-01",
          correctState: "out_of_order",
          scope: "machine",
          note: "taped off",
          by: "integrator",
          at: "x",
        },
      ],
    }),
  );
  const room = buildRoomStatus(report, roster, corr);
  const w1 = room.machines.find((m) => m.machineId === "W-01")!;
  assert.equal(w1.state, "out_of_order");
  assert.equal(w1.corrected, true);
  assert.equal(w1.correction?.scope, "machine");
  assert.equal(room.provenance.corrections, 1);
  assert.equal(room.counts.out_of_order, 1);
});
