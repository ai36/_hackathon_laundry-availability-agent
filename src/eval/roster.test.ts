import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadRoster, removeMachine, upsertMachine, writeRoster, type Roster } from "./roster";

function file(body: unknown): string {
  const p = join(mkdtempSync(join(tmpdir(), "laundry3-roster-")), "machines.json");
  writeFileSync(p, JSON.stringify(body));
  return p;
}

test("loadRoster tolerates a missing / minimal file", () => {
  assert.deepEqual(loadRoster(join(tmpdir(), "nope-machines.json")), { machines: [] });
});

test("writeRoster sorts washers before dryers, then natural id order", () => {
  const p = file({ machines: [] });
  writeRoster(
    {
      machines: [
        { machineId: "D-2", type: "dryer" },
        { machineId: "W-10", type: "washer" },
        { machineId: "D-1", type: "dryer" },
        { machineId: "W-2", type: "washer" },
      ],
    },
    p,
  );
  assert.deepEqual(
    loadRoster(p).machines.map((m) => m.machineId),
    ["W-2", "W-10", "D-1", "D-2"],
  );
});

test("writeRoster rejects a bad id, bad type, or duplicate", () => {
  const p = file({ machines: [] });
  assert.throws(
    () => writeRoster({ machines: [{ machineId: "../x", type: "washer" }] }, p),
    /match/,
  );
  assert.throws(
    () => writeRoster({ machines: [{ machineId: "W-1", type: "spinner" as "washer" }] }, p),
    /washer/,
  );
  assert.throws(
    () =>
      writeRoster(
        {
          machines: [
            { machineId: "W-1", type: "washer" },
            { machineId: "W-1", type: "dryer" },
          ],
        },
        p,
      ),
    /duplicate/,
  );
});

test("upsertMachine adds, edits, and renames; removeMachine drops", () => {
  let r: Roster = { machines: [{ machineId: "W-1", type: "washer" }] };
  r = upsertMachine(r, { machineId: "W-2", type: "dryer" });
  assert.equal(r.machines.length, 2);
  r = upsertMachine(r, {
    machineId: "W-2",
    type: "washer",
    promptFragment: "  digits = minutes  ",
  });
  const w2 = r.machines.find((m) => m.machineId === "W-2")!;
  assert.equal(w2.type, "washer");
  assert.equal(w2.promptFragment, "digits = minutes");
  r = upsertMachine(r, { machineId: "W-9", targetId: "W-2" }); // rename
  assert.ok(r.machines.some((m) => m.machineId === "W-9"));
  assert.ok(!r.machines.some((m) => m.machineId === "W-2"));
  r = removeMachine(r, "W-1");
  assert.deepEqual(
    r.machines.map((m) => m.machineId),
    ["W-9"],
  );
});

test("an empty promptFragment is stored as undefined", () => {
  const p = file({ machines: [] });
  writeRoster(
    upsertMachine({ machines: [] }, { machineId: "W-1", type: "washer", promptFragment: "   " }),
    p,
  );
  assert.equal(JSON.parse(readFileSync(p, "utf8")).machines[0].promptFragment, undefined);
});
