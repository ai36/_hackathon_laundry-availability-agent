import test from "node:test";
import assert from "node:assert/strict";

import { parseAssessments } from "./parse";

test("parses a clean JSON block", () => {
  const a = parseAssessments(
    `{"machines":[{"machineId":"W-01","state":"free","confidence":0.95,"rationale":"door ajar, drum empty"}]}`,
  );
  assert.equal(a.length, 1);
  assert.deepEqual(a[0], {
    machineId: "W-01",
    state: "free",
    confidence: 0.95,
    rationale: "door ajar, drum empty",
  });
});

test("tolerates prose around the JSON", () => {
  const a = parseAssessments(
    `Here is my assessment:\n{"machines":[{"machineId":"D-07","state":"occupied","confidence":1.2}]}\nHope that helps.`,
  );
  assert.equal(a.length, 1);
  assert.equal(a[0].state, "occupied");
  assert.equal(a[0].confidence, 1); // clamped to [0,1]
});

test("unrecognised state degrades to unknown", () => {
  const a = parseAssessments(
    `{"machines":[{"machineId":"W-02","state":"maybe","confidence":0.5}]}`,
  );
  assert.equal(a[0].state, "unknown");
});

test("no JSON → empty list", () => {
  assert.deepEqual(parseAssessments("I could not tell."), []);
});

test("rows without a machineId are skipped", () => {
  const a = parseAssessments(
    `{"machines":[{"state":"free"},{"machineId":"W-09","state":"free","confidence":0.8}]}`,
  );
  assert.equal(a.length, 1);
  assert.equal(a[0].machineId, "W-09");
});
