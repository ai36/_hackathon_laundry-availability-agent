import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_CONFIG } from "./defaults";
import { loadConfig, validateConfig, ConfigError } from "./load";

test("defaults are valid", () => {
  assert.doesNotThrow(() => validateConfig(DEFAULT_CONFIG));
});

test("loadConfig with no overrides returns the defaults", () => {
  assert.deepEqual(loadConfig(), DEFAULT_CONFIG);
});

test("overrides deep-merge onto defaults", () => {
  const c = loadConfig({ reservation: { holdMinutes: 10 } });
  assert.equal(c.reservation.holdMinutes, 10);
  // untouched siblings survive
  assert.equal(c.reservation.maxActivePerUser, DEFAULT_CONFIG.reservation.maxActivePerUser);
  assert.equal(c.site.name, DEFAULT_CONFIG.site.name);
});

test("rejects an out-of-range fraction", () => {
  assert.throws(() => loadConfig({ reservation: { maxReservedFractionOfFree: 1.5 } }), ConfigError);
});

test("rejects a non-positive hold time", () => {
  assert.throws(() => loadConfig({ reservation: { holdMinutes: 0 } }), ConfigError);
});

test("rejects an invalid IANA time zone", () => {
  assert.throws(() => loadConfig({ site: { timezone: "Mars/Olympus" } }), ConfigError);
});

test("rejects stale window shorter than the refresh interval", () => {
  assert.throws(
    () => loadConfig({ runtime: { stateRefreshSeconds: 60, staleAfterSeconds: 30 } }),
    ConfigError,
  );
});

test("rejects a capture interval longer than the state-refresh interval", () => {
  assert.throws(
    () => loadConfig({ runtime: { captureIntervalSeconds: 60, stateRefreshSeconds: 30 } }),
    ConfigError,
  );
});

test("rejects a non-integer machine count", () => {
  assert.throws(() => loadConfig({ site: { machines: { washers: 12.5 } } }), ConfigError);
});

test("rejects an empty machine roster", () => {
  assert.throws(() => loadConfig({ site: { machines: { washers: 0, dryers: 0 } } }), ConfigError);
});

test("accepts a washers-only site", () => {
  const c = loadConfig({ site: { machines: { washers: 8, dryers: 0 } } });
  assert.equal(c.site.machines.washers, 8);
  assert.equal(c.site.machines.dryers, 0);
});

test("overrides the still-frame target width", () => {
  const c = loadConfig({ frames: { maxStillPx: 2048 } });
  assert.equal(c.frames.maxStillPx, 2048);
  assert.equal(c.frames.maxVideoPx, DEFAULT_CONFIG.frames.maxVideoPx);
});

test("rejects a non-integer or tiny frame width", () => {
  assert.throws(() => loadConfig({ frames: { maxStillPx: 1600.5 } }), ConfigError);
  assert.throws(() => loadConfig({ frames: { maxVideoPx: 32 } }), ConfigError);
});

test("rejects a non-positive video fps", () => {
  assert.throws(() => loadConfig({ frames: { videoFps: 0 } }), ConfigError);
});

test("accepts a valid vision effort and rejects an unknown one", () => {
  assert.equal(loadConfig({ agent: { visionEffort: "medium" } }).agent.visionEffort, "medium");
  assert.throws(() => loadConfig({ agent: { visionEffort: "max" as "high" } }), ConfigError);
});
