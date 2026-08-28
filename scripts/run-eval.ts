#!/usr/bin/env tsx
/**
 * Run the baseline or the agent over a dataset split, score it, and write a report.
 *
 *   npx tsx scripts/run-eval.ts --mode=baseline --split=evaluation
 *   npx tsx scripts/run-eval.ts --mode=agent --split=evaluation --replay
 *
 * One of these is required (guards against accidental spend):
 *   --live    : call the Claude API for real; writes data/cache/<mode>/.
 *   --replay  : serve every vision call from the on-disk cache (no key, no cost). Cache miss = error.
 *   --fake    : deterministic FakeVisionClient, no cache, no network (wiring check — empty predictions).
 *
 * --out=... : report path (default docs/artifacts/eval-<mode>-<YYYY-MM-DD>.json)
 */
import "./load-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { config } from "@/config";
import { runBaseline } from "@/agent/baseline";
import { runAgent } from "@/agent/pipeline";
import { AnthropicVisionClient, CachedVisionClient, FakeVisionClient } from "@/agent/vision";
import type { VisionClient } from "@/agent/types";
import { loadFrameLabels, loadSplit } from "@/eval/dataset";
import { formatScores, scoreAll } from "@/eval/score";
import type { FramePrediction } from "@/eval/types";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const mode = (args.get("mode") ?? "baseline") as "baseline" | "agent";
const split = args.get("split") ?? "evaluation";
const replay = args.has("replay");
const fake = args.has("fake");
const live = args.has("live");
const today = new Date().toISOString().slice(0, 10);
const outPath = args.get("out") ?? `docs/artifacts/eval-${mode}-${today}.json`;

if (mode !== "baseline" && mode !== "agent") {
  console.error(`--mode must be "baseline" or "agent"`);
  process.exit(1);
}
if (Number(replay) + Number(fake) + Number(live) !== 1) {
  console.error(
    "pick exactly one backend: --live (paid API call), --replay (cache only), or --fake (offline stub)",
  );
  process.exit(1);
}

function buildVisionClient(): VisionClient {
  if (fake) {
    console.warn("! --fake: FakeVisionClient, no cache, no network — predictions will be empty");
    return new FakeVisionClient();
  }
  const cacheDir = `${config.paths.cache}/${mode}`;
  if (replay) return new CachedVisionClient(null, cacheDir, true);
  console.log(
    `vision: live AnthropicVisionClient (${config.agent.visionModel}) — caching to ${cacheDir}/`,
  );
  return new CachedVisionClient(new AnthropicVisionClient(), cacheDir, false);
}

async function main(): Promise<void> {
  const frameIds = loadSplit(split);
  const labels = loadFrameLabels();
  const vision = buildVisionClient();

  if (frameIds.length === 0) {
    console.log(`split "${split}" is empty — add frame ids to data/splits/${split}.txt`);
  }

  const predictions = new Map<string, FramePrediction>();
  for (const frameId of frameIds) {
    const pred =
      mode === "baseline" ? await runBaseline(frameId, vision) : await runAgent(frameId, vision);
    predictions.set(frameId, pred);
  }

  const scores = scoreAll(predictions, labels, frameIds);
  const labelled = frameIds.filter((id) => labels.has(id)).length;

  const totals = [...predictions.values()].reduce(
    (t, p) => ({
      visionCalls: t.visionCalls + (p.meta?.visionCalls ?? 0),
      inputTokens: t.inputTokens + (p.meta?.inputTokens ?? 0),
      outputTokens: t.outputTokens + (p.meta?.outputTokens ?? 0),
      costUsd: t.costUsd + (p.meta?.costUsd ?? 0),
    }),
    { visionCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
  );

  const backend = fake ? "fake" : replay ? "replay" : "live";
  console.log(
    `\nmode=${mode} split=${split} frames=${frameIds.length} labelled=${labelled} backend=${backend}`,
  );
  console.log(formatScores(scores));
  console.log(
    `\nvision calls: ${totals.visionCalls}  tokens: ${totals.inputTokens} in / ${totals.outputTokens} out  cost: $${totals.costUsd.toFixed(4)}`,
  );

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        mode,
        split,
        backend,
        generatedAt: new Date().toISOString(),
        model: config.agent.visionModel,
        frames: frameIds,
        labelledFrames: labelled,
        scores,
        totals,
        predictions: Object.fromEntries(predictions),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nreport -> ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
