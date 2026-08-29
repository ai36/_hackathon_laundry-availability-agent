import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_CONFIG } from "./defaults";
import { ConfigError } from "./load";
import { readOverrides, writeOverrides, overriddenPaths } from "./overrides";

function tmpFile(): string {
  return join(mkdtempSync(join(tmpdir(), "laundry3-cfg-")), "config-overrides.json");
}

test("readOverrides tolerates a missing / non-object file", () => {
  assert.deepEqual(readOverrides(join(tmpdir(), "nope-overrides.json")), {});
});

test("writeOverrides round-trips and validates the merged result", () => {
  const f = tmpFile();
  const merged = writeOverrides({ reservation: { holdMinutes: 12 } }, f);
  assert.equal(merged.reservation.holdMinutes, 12);
  assert.equal(readOverrides(f).reservation?.holdMinutes, 12);
});

test("writeOverrides rejects an invalid merge and does not write", () => {
  const f = tmpFile();
  assert.throws(
    () => writeOverrides({ runtime: { stateRefreshSeconds: 60, staleAfterSeconds: 30 } }, f),
    ConfigError,
  );
  assert.deepEqual(readOverrides(f), {});
});

test("writeOverrides strips paths.* (server-enforced lock)", () => {
  const f = tmpFile();
  writeOverrides({ paths: { dataset: "/etc" }, cycles: { defaultWashMinutes: 40 } }, f);
  const stored = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
  assert.equal(stored.paths, undefined);
  assert.equal((stored.cycles as Record<string, unknown>).defaultWashMinutes, 40);
});

test("overriddenPaths reports only what differs from DEFAULT_CONFIG", () => {
  assert.deepEqual(overriddenPaths(DEFAULT_CONFIG), []);
  const cfg = { ...DEFAULT_CONFIG, cycles: { ...DEFAULT_CONFIG.cycles, defaultDryMinutes: 55 } };
  assert.deepEqual(overriddenPaths(cfg), ["cycles.defaultDryMinutes"]);
});
