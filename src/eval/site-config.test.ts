import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadSiteConfig,
  parseMachineIds,
  removeCamera,
  upsertCamera,
  writeSiteConfig,
  type SiteConfig,
} from "./site-config";

function file(body: unknown): string {
  const p = join(mkdtempSync(join(tmpdir(), "laundry3-site-")), "site-config.json");
  writeFileSync(p, JSON.stringify(body));
  return p;
}

test("parseMachineIds splits on commas / whitespace and dedups", () => {
  assert.deepEqual(parseMachineIds("W-01, W-02  W-02\nD-1"), ["W-01", "W-02", "D-1"]);
  assert.deepEqual(parseMachineIds(""), []);
});

test("loadSiteConfig tolerates a missing file", () => {
  assert.deepEqual(loadSiteConfig(join(tmpdir(), "nope-site.json")), { cameras: [] });
});

test("writeSiteConfig rejects a bad camera id, bad machine id, or duplicate", () => {
  const p = file({ cameras: [] });
  assert.throws(() => writeSiteConfig({ cameras: [{ id: "../x", machineIds: [] }] }, p), /match/);
  assert.throws(
    () => writeSiteConfig({ cameras: [{ id: "cam-1", machineIds: ["a/b"] }] }, p),
    /invalid/,
  );
  assert.throws(
    () =>
      writeSiteConfig(
        {
          cameras: [
            { id: "cam-1", machineIds: [] },
            { id: "cam-1", machineIds: [] },
          ],
        },
        p,
      ),
    /duplicate/,
  );
});

test("upsertCamera adds, edits, renames; removeCamera drops", () => {
  let c: SiteConfig = { cameras: [] };
  c = upsertCamera(c, { id: "cam-1", machineIds: ["W-01", "W-02"] });
  c = upsertCamera(c, {
    id: "cam-1",
    machineIds: ["W-01"],
    stubImage: "data/site-config/cam-1/stub.jpg",
  });
  assert.equal(c.cameras[0].machineIds.length, 1);
  assert.equal(c.cameras[0].stubImage, "data/site-config/cam-1/stub.jpg");
  c = upsertCamera(c, { id: "cam-2", targetId: "cam-1", machineIds: ["W-01"] });
  assert.deepEqual(
    c.cameras.map((x) => x.id),
    ["cam-2"],
  );
  c = removeCamera(c, "cam-2");
  assert.equal(c.cameras.length, 0);
});

test("round-trips through disk", () => {
  const p = file({ cameras: [] });
  writeSiteConfig(
    {
      cameras: [
        { id: "cam-b", machineIds: ["D-1"] },
        { id: "cam-a", machineIds: [] },
      ],
    },
    p,
  );
  assert.deepEqual(
    loadSiteConfig(p).cameras.map((c) => c.id),
    ["cam-a", "cam-b"],
  );
});
