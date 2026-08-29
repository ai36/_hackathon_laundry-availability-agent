import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { activeReservations, release, reserve } from "./reservations";

const tmp = () => join(mkdtempSync(join(tmpdir(), "laundry3-res-")), "reservations.json");

test("reserve → active, release → gone", () => {
  const f = tmp();
  reserve("W-01", "c-alice", 5, f);
  assert.deepEqual(
    activeReservations(Date.now(), f).map((r) => r.machineId),
    ["W-01"],
  );
  assert.equal(release("W-01", "c-alice", f), true);
  assert.deepEqual(activeReservations(Date.now(), f), []);
});

test("release only removes your own hold", () => {
  const f = tmp();
  reserve("W-02", "c-alice", 5, f);
  assert.equal(release("W-02", "c-bob", f), false);
  assert.equal(activeReservations(Date.now(), f).length, 1);
});

test("reserving a machine again replaces the earlier hold", () => {
  const f = tmp();
  reserve("D-01", "c-alice", 5, f);
  reserve("D-01", "c-bob", 5, f);
  const active = activeReservations(Date.now(), f);
  assert.equal(active.length, 1);
  assert.equal(active[0].by, "c-bob");
});

test("expired reservations are filtered out on read", () => {
  const f = tmp();
  const past = new Date(Date.now() - 60_000).toISOString();
  writeFileSync(
    f,
    JSON.stringify({ reservations: [{ machineId: "W-03", by: "c-x", at: past, expiresAt: past }] }),
  );
  assert.deepEqual(activeReservations(Date.now(), f), []);
});

test("reserve rejects a bad id", () => {
  const f = tmp();
  assert.throws(() => reserve("W 03", "c-x", 5, f), /machineId/);
  assert.throws(() => reserve("W-03", "a/b", 5, f), /client id/);
});
