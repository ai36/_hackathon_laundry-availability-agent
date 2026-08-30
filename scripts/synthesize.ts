#!/usr/bin/env tsx
/**
 * Correction → `promptFragment` synthesis (D-0014 feedback loop, steps 1–3).
 *
 *   npm run synthesize -- --replay                 # reproduce recorded synthesis, no key/cost
 *   npm run synthesize -- --live                   # generate fragments (paid; needs ANTHROPIC_API_KEY)
 *   npm run synthesize -- --live --dry-run         # print, don't write data/machines.json
 *   npm run synthesize -- --replay --only=img_1821 # only corrections recorded in that frame file
 *
 * For every corrected cell where the baseline model was WRONG, this reads the model's own
 * rationale from the baseline report, asks a model to write a short reading-rule that would
 * have prevented the miss, and stores it as that machine's `promptFragment` in
 * data/machines.json (provenance `synthesis`, or `merged` if a fragment already existed).
 *
 * Backend flag is mandatory (guards against accidental spend): --live | --replay | --fake.
 * Cache dir: data/cache/synthesis/. --replay reproduces from it with no key.
 */
import "./load-env";

import { existsSync, readFileSync, readdirSync } from "node:fs";

import { config } from "@/config";
import { AnthropicVisionClient, CachedVisionClient, FakeVisionClient } from "@/agent/vision";
import type { VisionClient } from "@/agent/types";
import { frameImagePath } from "@/eval/dataset";
import { loadFrameCorrections } from "@/eval/corrections";
import { synthesizeForCorrection } from "@/eval/prompt-synthesis";
import { loadRoster, upsertMachine, writeRoster } from "@/eval/roster";
import type { MachineState } from "@/eval/types";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const replay = args.has("replay");
const fake = args.has("fake");
const live = args.has("live");
const dryRun = args.has("dry-run");
const only = args.get("only") && args.get("only") !== "true" ? args.get("only")! : undefined;
const reportPath =
  args.get("report") && args.get("report") !== "true"
    ? args.get("report")!
    : "docs/artifacts/eval-baseline-2026-08-29.json";

if (Number(replay) + Number(fake) + Number(live) !== 1) {
  console.error("pick exactly one backend: --live (paid), --replay (cache only), or --fake");
  process.exit(1);
}

interface ReportPred {
  machines: { machineId: string; state: MachineState; rationale?: string }[];
}
interface Report {
  predictions: Record<string, ReportPred>;
}

function buildVision(): VisionClient {
  if (fake) return new FakeVisionClient();
  const cacheDir = `${config.paths.cache}/synthesis`;
  if (replay) return new CachedVisionClient(null, cacheDir, true);
  console.log(
    `synthesis: live AnthropicVisionClient (${config.agent.visionModel}) -> ${cacheDir}/`,
  );
  return new CachedVisionClient(new AnthropicVisionClient(), cacheDir, false);
}

async function main(): Promise<void> {
  if (!existsSync(reportPath)) {
    console.error(`baseline report not found: ${reportPath} (pass --report=...)`);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;

  const dir = "data/corrections";
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`))
    : [];
  if (files.length === 0) {
    console.log(`no correction files in ${dir}/${only ? ` matching ${only}` : ""}`);
    return;
  }

  let roster = loadRoster();
  const vision = buildVision();
  const done: { machineId: string; frameId: string; fragment: string; source: string }[] = [];
  let cost = 0;

  for (const file of files) {
    const frameId = file.replace(/\.json$/, "");
    const pred = report.predictions[frameId];
    if (!pred) {
      console.warn(`! ${frameId}: not in ${reportPath} — skipping`);
      continue;
    }
    for (const c of loadFrameCorrections(frameId, dir)) {
      const machine = roster.machines.find((m) => m.machineId === c.machineId);
      const type = c.machineId.startsWith("D") ? ("dryer" as const) : ("washer" as const);
      // Merge into a HUMAN-written rule only. A prior synthesis output is regenerated from
      // scratch, so re-running is idempotent (same prompt → same cache hash → --replay works).
      const src = machine?.fragmentSource;
      const currentFragment =
        src === "synthesis" || src === "merged" ? undefined : machine?.promptFragment;
      const out = await synthesizeForCorrection({
        frameId,
        machineId: c.machineId,
        machineType: type,
        correctState: c.correctState,
        note: c.note,
        currentFragment,
        report,
        vision,
        imagePath: frameImagePath(frameId),
      });
      cost += out?.costUsd ?? 0;
      if (!out || !out.fragment) {
        const why =
          out?.reason === "already-correct"
            ? `baseline already "${c.correctState}" — nothing to learn`
            : out?.reason === "not-in-report"
              ? `not in ${reportPath} — skipping`
              : "model returned no rule";
        console.log(`= ${frameId}/${c.machineId}: ${why}`);
        continue;
      }
      done.push({ machineId: c.machineId, frameId, fragment: out.fragment, source: out.source });
      roster = upsertMachine(roster, {
        machineId: c.machineId,
        type,
        promptFragment: out.fragment,
        fragmentSource: out.source,
      });
      console.log(`+ ${c.machineId} (${out.source}, from ${frameId}): ${out.fragment}`);
    }
  }

  if (done.length === 0) {
    console.log("\nno fragments synthesized.");
    return;
  }
  // On --replay / --fake no money was spent; the summed `cost` is the recorded live cost.
  const costLabel = replay
    ? "$0 (recorded live cost was $" + cost.toFixed(4) + ")"
    : fake
      ? "$0 (fake)"
      : "$" + cost.toFixed(4);
  if (dryRun) {
    console.log(`\n--dry-run: ${done.length} fragment(s) NOT written. cost ${costLabel}`);
    return;
  }
  writeRoster(roster);
  console.log(`\nwrote ${done.length} fragment(s) to data/machines.json. cost ${costLabel}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
