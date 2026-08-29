import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadSiteConfig } from "./pipeline";

const tmp = (body: unknown): string => {
  const p = join(mkdtempSync(join(tmpdir(), "laundry3-cal-")), "site-config.json");
  writeFileSync(p, JSON.stringify(body));
  return p;
};

test("loadSiteConfig returns null for a missing file", () => {
  assert.equal(loadSiteConfig(join(tmpdir(), "nope-cal.json")), null);
});

test("loadSiteConfig returns null for the portal camera-list shape", () => {
  assert.equal(loadSiteConfig(tmp({ cameras: [{ id: "C-01", machineIds: ["W-01"] }] })), null);
  assert.equal(loadSiteConfig(tmp({ cameras: [] })), null);
});

test("loadSiteConfig parses the calibration shape", () => {
  const cfg = loadSiteConfig(
    tmp({
      camera: "cam-1",
      createdAt: "2026-08-29",
      machines: [{ machineId: "W-01", type: "washer", roi: [0, 0, 10, 10] }],
    }),
  );
  assert.equal(cfg?.machines.length, 1);
  assert.equal(cfg?.machines[0].machineId, "W-01");
});
