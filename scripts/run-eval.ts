#!/usr/bin/env tsx
/**
 * Run the baseline or the agent over a dataset split, score it, and write a report.
 *
 *   npx tsx scripts/run-eval.ts --mode=baseline --split=evaluation
 *   npx tsx scripts/run-eval.ts --mode=agent --split=evaluation --replay
 *
 * --replay  : serve every vision call from the on-disk cache (no API key, no cost).
 *             Fails on a cache miss.
 * --out=... : report path (default docs/artifacts/eval-<mode>-<YYYY-MM-DD>.json)
 *
 * Vision backend: currently a FakeVisionClient behind the cache (skeleton). The real
 * Claude vision client is wired in when the baseline runs for real.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { config } from "@/config";
import { runBaseline } from "@/agent/baseline";
import { runAgent } from "@/agent/pipeline";
import { CachedVisionClient, FakeVisionClient } from "@/agent/vision";
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
const today = new Date().toISOString().slice(0, 10);
const outPath = args.get("out") ?? `docs/artifacts/eval-${mode}-${today}.json`;

if (mode !== "baseline" && mode !== "agent") {
  console.error(`--mode must be "baseline" or "agent"`);
  process.exit(1);
}

function buildVisionClient(): VisionClient {
  // TODO: when ANTHROPIC_API_KEY is set and !replay, use AnthropicVisionClient here.
  const inner = replay ? null : new FakeVisionClient();
  if (!replay) {
    console.warn(
      "! using FakeVisionClient (skeleton) — predictions will be empty until the real client is wired",
    );
  }
  return new CachedVisionClient(inner, `${config.paths.cache}/${mode}`, replay);
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

  console.log(
    `\nmode=${mode} split=${split} frames=${frameIds.length} labelled=${labelled}${replay ? " (replay)" : ""}`,
  );
  console.log(formatScores(scores));

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        mode,
        split,
        replay,
        generatedAt: new Date().toISOString(),
        model: config.agent.visionModel,
        frames: frameIds,
        labelledFrames: labelled,
        scores,
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
