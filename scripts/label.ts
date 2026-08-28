#!/usr/bin/env tsx
/**
 * Labelling helper for the laundry3 dataset. See docs/LABELING.md.
 *
 *   npm run label:new   -- <frameId> [--force]   scaffold data/labels/<frameId>.json
 *   npm run label:check -- [--split=NAME]         validate labels (and a split, if given)
 *   npm run label:stats                           coverage + state distribution
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";
import { frameImagePath, loadFrameLabels, loadSplit } from "@/eval/dataset";
import type { MachineType } from "@/eval/types";

const DATA = config.paths.dataset;
const LABELS = join(DATA, "labels");
const ROSTER = join(DATA, "machines.json");

type Roster = { machines: { machineId: string; type: MachineType }[] };

function roster(): Roster {
  if (!existsSync(ROSTER)) {
    fail(`${ROSTER} not found — create the machine roster first (see docs/LABELING.md).`);
  }
  return JSON.parse(readFileSync(ROSTER, "utf8")) as Roster;
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const [sub, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const splitArg = rest.find((a) => a.startsWith("--split="))?.split("=")[1];
const positional = rest.filter((a) => !a.startsWith("--"));

if (sub === "new") cmdNew();
else if (sub === "check") cmdCheck();
else if (sub === "stats") cmdStats();
else fail(`unknown subcommand "${sub ?? ""}". Use: new | check | stats`);

function cmdNew(): void {
  const frameId = positional[0];
  if (!frameId) fail("usage: npm run label:new -- <frameId>");
  if (!existsSync(frameImagePath(frameId))) {
    fail(`no frame image at ${frameImagePath(frameId)} — run npm run dataset:prepare first`);
  }
  const out = join(LABELS, `${frameId}.json`);
  if (existsSync(out) && !flags.has("--force")) fail(`${out} exists — pass --force to overwrite`);

  const skeleton = {
    frameId,
    timestamp: "",
    camera: "",
    frameConditions: [] as string[],
    machines: roster().machines.map((m) => ({
      machineId: m.machineId,
      type: m.type,
      bbox: [0, 0, 0, 0],
      state: "unknown",
      gtDeterminate: true,
      observationNotes: [] as string[],
    })),
  };
  writeFileSync(out, JSON.stringify(skeleton, null, 2) + "\n");
  console.log(`wrote ${out}`);
  console.log(`open ${frameImagePath(frameId)} and set each machine's state / bbox.`);
  console.log(`machines not visible in this frame: delete their entry (do not guess).`);
}

function cmdCheck(): void {
  const ids = new Set(roster().machines.map((m) => m.machineId));
  const labels = loadFrameLabels();
  const problems: string[] = [];
  let bboxTodo = 0;

  for (const [frameId, label] of labels) {
    if (!existsSync(frameImagePath(frameId))) problems.push(`${frameId}: no matching frame image`);
    const seen = new Set<string>();
    for (const m of label.machines) {
      if (!ids.has(m.machineId)) problems.push(`${frameId}: unknown machineId "${m.machineId}"`);
      if (seen.has(m.machineId)) problems.push(`${frameId}: duplicate machineId "${m.machineId}"`);
      seen.add(m.machineId);
      const b = (m as { bbox?: number[] }).bbox;
      if (b && b.length === 4 && b.every((n) => n === 0)) bboxTodo++;
    }
  }
  if (bboxTodo) console.log(`note: ${bboxTodo} machine(s) still have a placeholder bbox [0,0,0,0]`);

  if (splitArg) {
    const listed = loadSplit(splitArg);
    for (const frameId of listed) {
      if (!labels.has(frameId)) problems.push(`split ${splitArg}: "${frameId}" has no label file`);
    }
    for (const other of ["calibration", "evaluation"].filter((s) => s !== splitArg)) {
      const overlap = listed.filter((id) => safeSplit(other).includes(id));
      if (overlap.length)
        problems.push(`split ${splitArg} overlaps ${other}: ${overlap.join(", ")}`);
    }
  }

  report(problems, `${labels.size} label file(s) checked`);
}

function safeSplit(name: string): string[] {
  try {
    return loadSplit(name);
  } catch {
    return [];
  }
}

function cmdStats(): void {
  const labels = loadFrameLabels();
  const dist: Record<string, number> = {};
  let indeterminable = 0;
  let machineRows = 0;
  for (const label of labels.values()) {
    for (const m of label.machines) {
      machineRows++;
      dist[m.state] = (dist[m.state] ?? 0) + 1;
      if (!m.gtDeterminate) indeterminable++;
    }
  }
  console.log(`labelled frames      : ${labels.size}`);
  console.log(`machine observations : ${machineRows}`);
  console.log(`state distribution   : ${JSON.stringify(dist)}`);
  console.log(`gtDeterminate:false  : ${indeterminable}`);
  for (const name of ["calibration", "evaluation", "smoke"]) {
    const s = safeSplit(name);
    console.log(`split ${name.padEnd(12)}: ${s.length} frame(s)`);
  }
}

function report(problems: string[], ok: string): void {
  if (problems.length === 0) {
    console.log(`OK — ${ok}`);
    return;
  }
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
