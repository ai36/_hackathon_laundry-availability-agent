#!/usr/bin/env tsx
/**
 * Build the initial data/labels/*.json from the dataset author's per-frame state list
 * (provided 2026-08-28; ids keyed to data/raw/_reference/*). Run once:
 *
 *   npx tsx scripts/gen-initial-labels.ts
 *
 * Kept as provenance for how the ground truth was created. After this, edit the JSON files
 * directly (see docs/LABELING.md) — do not re-run, it overwrites.
 *
 * Vocabulary map: free->free, busy->occupied, error->out_of_order, off->out_of_order
 * (author: "off" = out of order), unknown->unknown with gtDeterminate:false (author could
 * not determine from the photo).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";
import type { FrameLabel, MachineLabel, MachineState } from "@/eval/types";

const LABELS = join(config.paths.dataset, "labels");

/** Raw author strings per frame. */
const SPEC: Record<string, Record<string, string>> = {
  img_1819: {
    "W-01": "free",
    "W-02": "free",
    "W-03": "free",
    "W-04": "off",
    "W-05": "free",
    "W-06": "free",
    "W-07": "free",
  },
  img_1821: {
    "D-01": "busy",
    "D-02": "error",
    "D-03": "free",
    "D-04": "free",
    "D-05": "busy",
    "D-06": "error",
    "D-07": "busy",
    "D-08": "unknown",
    "W-15": "free",
    "W-16": "free",
  },
  img_1822: {
    "D-01": "busy",
    "D-02": "error",
    "D-03": "unknown",
    "D-04": "unknown",
    "D-05": "unknown",
    "D-06": "unknown",
    "D-07": "unknown",
  },
  img_1823: {
    "D-01": "unknown",
    "D-02": "unknown",
    "D-03": "free",
    "D-04": "free",
    "D-05": "busy",
    "D-06": "error",
    "D-07": "busy",
    "D-08": "unknown",
    "D-09": "free",
    "D-10": "unknown",
    "W-16": "free",
  },
  img_1824: { "D-04": "unknown", "D-05": "busy", "D-06": "error", "D-08": "unknown" },
  img_1825: { "D-04": "unknown", "D-05": "busy", "D-06": "error", "D-08": "unknown" },
  img_1826: { "D-04": "unknown", "D-05": "busy", "D-06": "error", "D-08": "unknown" },
  img_8629: {
    "W-06": "free",
    "W-07": "free",
    "W-08": "free",
    "W-09": "free",
    "W-10": "free",
    "W-11": "free",
    "W-12": "free",
    "W-13": "free",
    "W-14": "free",
    "W-15": "free",
  },
  img_8633: { "W-13": "free", "W-14": "busy", "W-15": "free", "W-16": "free" },
};

/** author term -> (state, gtDeterminate, note) */
function normalise(raw: string): { state: MachineState; gt: boolean; note?: string } {
  switch (raw.trim().toLowerCase()) {
    case "free":
      return { state: "free", gt: true };
    case "busy":
    case "budy":
      return { state: "occupied", gt: true };
    case "error":
      return { state: "out_of_order", gt: true };
    case "off":
      return { state: "out_of_order", gt: true, note: "author labelled 'off' (out of order)" };
    case "unknown":
    case "unknoun":
      return { state: "unknown", gt: false };
    default:
      throw new Error(`unrecognised state "${raw}"`);
  }
}

mkdirSync(LABELS, { recursive: true });
let written = 0;
for (const [frameId, machines] of Object.entries(SPEC)) {
  const rows: MachineLabel[] = Object.entries(machines).map(([machineId, raw]) => {
    const { state, gt, note } = normalise(raw);
    // bbox is omitted here — it is only needed for per-ROI calibration (P1), not the
    // whole-frame baseline. Filled in a later pass; see docs/LABELING.md.
    const row: MachineLabel = {
      machineId,
      type: machineId.startsWith("W-") ? "washer" : "dryer",
      state,
      gtDeterminate: gt,
      observationNotes: [],
    };
    if (note) row.note = note;
    return row;
  });
  const label: FrameLabel = {
    frameId,
    timestamp: "",
    camera: "",
    frameConditions: [],
    machines: rows,
  };
  const out = join(LABELS, `${frameId}.json`);
  if (existsSync(out)) console.warn(`overwriting ${out}`);
  writeFileSync(out, JSON.stringify(label, null, 2) + "\n");
  written++;
}
console.log(`wrote ${written} label files to ${LABELS}/`);
