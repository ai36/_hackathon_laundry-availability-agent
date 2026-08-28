import { existsSync, readFileSync } from "node:fs";

import { config } from "@/config";
import { frameImagePath } from "@/eval/dataset";
import type { FramePrediction, MachinePrediction } from "@/eval/types";

import { parseAssessments } from "./parse";
import type { MachineAssessment, SiteConfig, VisionClient } from "./types";

export function loadSiteConfig(path = config.paths.siteConfig): SiteConfig | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as SiteConfig;
}

/**
 * The agent pipeline: calibrate-aware classification with a verification pass.
 *
 * SKELETON — the per-machine classify and verify steps are stubs. The shape is:
 *   1. load the per-site calibration config (ROIs, reference cues)
 *   2. classify each machine from its ROI  (stub: one whole-frame call, then split)
 *   3. verify machines below config.agent.verification.confidenceThreshold
 *      (stub: re-query with tighter crop; here: pass through)
 *   4. abstain (`unknown`) instead of guessing when still uncertain
 */
export async function runAgent(frameId: string, vision: VisionClient): Promise<FramePrediction> {
  const site = loadSiteConfig();
  let visionCalls = 0;

  // Step 2 (stub): single structured call; a real implementation loops per ROI.
  const res = await vision.analyze({
    cacheKey: `agent:classify:${frameId}`,
    imagePath: frameImagePath(frameId),
    prompt: classifyPrompt(site),
  });
  visionCalls++;
  let assessments = parseAssessments(res.text);

  // Step 3 (stub): machines below the threshold would be re-queried with a tight ROI crop
  // (config.agent.maxVisionCallsPerFrame caps the total). For now they are only flagged.
  const threshold = config.agent.verification.confidenceThreshold;
  const needsVerification = assessments
    .filter((a) => a.confidence < threshold)
    .map((a) => a.machineId);

  // Step 4: abstain instead of guessing when still not confident.
  if (config.agent.abstainWhenUncertain) {
    assessments = assessments.map((a) =>
      a.confidence < threshold ? { ...a, state: "unknown" as const } : a,
    );
  }

  const machines: MachinePrediction[] = assessments.map(toPrediction);
  return {
    frameId,
    machines,
    meta: {
      mode: "agent",
      visionCalls,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: res.costUsd,
      needsVerification,
    },
  };
}

function toPrediction(a: MachineAssessment): MachinePrediction {
  return {
    machineId: a.machineId,
    state: a.state,
    confidence: a.confidence,
    rationale: a.rationale,
  };
}

function classifyPrompt(site: SiteConfig | null): string {
  const roster = site
    ? `Known machines at this site: ${site.machines
        .map((m) => `${m.machineId} (${m.type})`)
        .join(", ")}.`
    : "The site calibration config is not available; identify machines from the image.";
  return [
    "You are monitoring a shared laundry room from a fixed camera.",
    roster,
    "For each machine, decide: free, occupied, out_of_order (broken/taped off/hard error), or unknown (evidence not there — blocked indicator, glare, darkness).",
    "Reply with JSON only:",
    '{"machines":[{"machineId":"<label>","state":"free|occupied|out_of_order|unknown","confidence":0..1,"rationale":"<short>"}]}',
  ].join("\n");
}
