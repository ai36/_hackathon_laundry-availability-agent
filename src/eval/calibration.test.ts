import test from "node:test";
import assert from "node:assert/strict";

import { cameraForFrame } from "./calibration";
import type { Camera } from "./site-config";
import type { FrameLabel } from "./types";

const cams: Camera[] = [
  { id: "C-01", machineIds: ["W-01", "W-02"] },
  { id: "C-02", machineIds: ["D-01"] },
];

const labels = new Map<string, FrameLabel>([
  ["f-owned", { frameId: "f-owned", camera: "C-02", machines: [] }],
  ["f-blank", { frameId: "f-blank", camera: "", machines: [] }],
  ["f-none", { frameId: "f-none", machines: [] }],
  ["f-unknown", { frameId: "f-unknown", camera: "C-99", machines: [] }],
]);

test("cameraForFrame resolves the label's camera id", () => {
  assert.equal(cameraForFrame("f-owned", cams, labels)?.id, "C-02");
});

test("cameraForFrame returns null for a blank or missing camera field", () => {
  assert.equal(cameraForFrame("f-blank", cams, labels), null);
  assert.equal(cameraForFrame("f-none", cams, labels), null);
});

test("cameraForFrame returns null when the camera id is not in the site config", () => {
  assert.equal(cameraForFrame("f-unknown", cams, labels), null);
});
