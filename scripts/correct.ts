#!/usr/bin/env tsx
/**
 * Record an integrator correction (D-0014). See docs/EVALUATION.md and src/eval/corrections.ts.
 *
 *   npm run correct -- <frameId> <machineId> <state> [--scope=machine] [--note="..."] [--by=NAME]
 *   npm run correct -- --list [frameId]
 *
 *   state  : free | occupied | out_of_order | unknown
 *   --scope: "observation" (default, this frame only) or "machine" (this machine everywhere)
 *
 * Writes/updates data/corrections/<frameId>.json. Re-running for the same (frame, machine)
 * replaces the earlier entry.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { loadCorrections, writeCorrection, type Correction } from "@/eval/corrections";

const DIR = "data/corrections";
const STATES = ["free", "occupied", "out_of_order", "unknown"] as const;

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const argv = process.argv.slice(2);
const flags = new Map(
  argv
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? "true"] as const;
    }),
);
const positional = argv.filter((a) => !a.startsWith("--"));

if (flags.has("list")) {
  cmdList(positional[0]);
} else {
  cmdAdd();
}

function cmdList(frameId?: string): void {
  const { byFrame, byMachine, count } = loadCorrections(DIR);
  if (count === 0) {
    console.log(`no corrections in ${DIR}/`);
    return;
  }
  if (byMachine.size) {
    console.log("machine-scope (every frame):");
    for (const c of byMachine.values()) {
      console.log(
        `  ${c.machineId.padEnd(6)} -> ${c.correctState}${c.note ? `  (${c.note})` : ""}`,
      );
    }
  }
  for (const [fid, list] of byFrame) {
    if (frameId && fid !== frameId) continue;
    console.log(`${fid}:`);
    for (const c of list) {
      console.log(
        `  ${c.machineId.padEnd(6)} -> ${c.correctState}${c.note ? `  (${c.note})` : ""}`,
      );
    }
  }
}

function cmdAdd(): void {
  const [frameId, machineId, state] = positional;
  if (!frameId || !machineId || !state) {
    fail("usage: npm run correct -- <frameId> <machineId> <state> [--scope=machine] [--note=...]");
  }
  if (!STATES.includes(state as (typeof STATES)[number])) {
    fail(`state must be one of: ${STATES.join(" | ")}`);
  }
  const scope = (flags.get("scope") ?? "observation") as Correction["scope"];
  if (!existsSync(join("data/labels", `${frameId}.json`))) {
    console.warn(`! no label file for ${frameId} — recording the correction anyway`);
  }

  const noteFlag = flags.get("note");
  const byFlag = flags.get("by");
  try {
    writeCorrection(
      {
        frameId,
        machineId,
        correctState: state as Correction["correctState"],
        scope,
        note: noteFlag && noteFlag !== "true" ? noteFlag : undefined,
        by: byFlag && byFlag !== "true" ? byFlag : undefined,
      },
      DIR,
    );
  } catch (err) {
    fail(err instanceof Error ? err.message : "write failed");
  }

  console.log(`${join(DIR, `${frameId}.json`)}: ${machineId} -> ${state} (${scope})`);
  const total = readdirSync(DIR).filter((f) => f.endsWith(".json")).length;
  console.log(`${total} correction file(s) in ${DIR}/`);
}
