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
 * The agent pipeline.
 *
 *   1. classify every machine from the whole frame (same starting point as the baseline)
 *   2. verification pass — for machines that came back `unknown` or below
 *      `config.agent.verification.confidenceThreshold`, a second focused vision call that
 *      names those machines and lists explicit out-of-order cues; its answers override
 *      pass 1 for those ids. Capped by `config.agent.maxVisionCallsPerFrame`.
 *   3. abstain — the model already says `unknown` when it can't tell, so this only
 *      overrides an *answered* machine whose confidence is very low (a near-guess), at
 *      half the verification threshold. (An earlier version abstained at the full 0.7
 *      threshold and collapsed coverage to ~4% — see the changelog.)
 *
 * ROI cropping / temporal memory are later iterations.
 */
export async function runAgent(
  frameId: string,
  vision: VisionClient,
  machineIds: string[],
): Promise<FramePrediction> {
  const site = loadSiteConfig();
  const threshold = config.agent.verification.confidenceThreshold;
  let visionCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  const models = new Set<string>();

  const call = async (cacheKey: string, prompt: string): Promise<MachineAssessment[]> => {
    const res = await vision.analyze({ cacheKey, imagePath: frameImagePath(frameId), prompt });
    visionCalls++;
    inputTokens += res.inputTokens ?? 0;
    outputTokens += res.outputTokens ?? 0;
    costUsd += res.costUsd ?? 0;
    if (res.model) models.add(res.model);
    return parseAssessments(res.text);
  };

  // Step 1 — classify.
  const byId = new Map<string, MachineAssessment>();
  for (const a of await call(
    `agent:classify:${frameId}:${machineIds.join(",")}`,
    classifyPrompt(site, machineIds),
  )) {
    byId.set(a.machineId, a);
  }

  // Step 2 — verification pass on the shaky ones.
  const shaky = machineIds.filter((id) => {
    const a = byId.get(id);
    return !a || a.state === "unknown" || a.confidence < threshold;
  });
  const verified: string[] = [];
  if (
    config.agent.verification.enabled &&
    shaky.length > 0 &&
    visionCalls < config.agent.maxVisionCallsPerFrame
  ) {
    for (const a of await call(`agent:verify:${frameId}:${shaky.join(",")}`, verifyPrompt(shaky))) {
      if (shaky.includes(a.machineId)) {
        byId.set(a.machineId, a);
        verified.push(a.machineId);
      }
    }
  }

  // Step 3 — abstain only on a near-guess (very low confidence on an answered machine).
  const abstainFloor = threshold / 2;
  const machines: MachinePrediction[] = machineIds.map((id) => {
    const a = byId.get(id) ?? {
      machineId: id,
      state: "unknown" as const,
      confidence: 0,
      rationale: "no answer",
    };
    const nearGuess =
      config.agent.abstainWhenUncertain && a.state !== "unknown" && a.confidence < abstainFloor;
    return {
      machineId: id,
      state: nearGuess ? "unknown" : a.state,
      confidence: a.confidence,
      rationale: a.rationale,
    };
  });

  return {
    frameId,
    machines,
    meta: {
      mode: "agent",
      model: [...models].join("+") || undefined,
      visionCalls,
      inputTokens,
      outputTokens,
      costUsd,
      verifiedMachineIds: verified,
    },
  };
}

function classifyPrompt(site: SiteConfig | null, machineIds: string[]): string {
  const roster = site
    ? `Calibration says these machines are in view: ${site.machines
        .map((m) => `${m.machineId} (${m.type})`)
        .join(", ")}.`
    : "";
  return [
    "You are monitoring a shared laundry room from a fixed camera. Washers are W-01, W-02, …",
    "and dryers D-01, D-02, …, numbered left-to-right along each bank; for stacked units the",
    "upper machine has the lower number.",
    roster,
    `Classify these machines visible in the frame: ${machineIds.join(", ")}.`,
    "States: free (empty, not running); occupied (running / holding laundry / time on display);",
    "out_of_order (broken, taped off, powered down, hard error); unknown (evidence not there —",
    "blocked indicator, glare, darkness — say this rather than guessing).",
    "Reply with JSON only, one entry per id:",
    '{"machines":[{"machineId":"W-01","state":"free|occupied|out_of_order|unknown","confidence":0..1,"rationale":"<short>"}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

function verifyPrompt(machineIds: string[]): string {
  return [
    "Second look. Focus ONLY on these machines and study each one's control panel, display,",
    `door position and drum: ${machineIds.join(", ")}.`,
    "First describe exactly what you see on each (digits/letters on the display, lights, lid",
    "up or down, laundry visible), then classify it.",
    "Out-of-order cues: the display shows an error like 'Err', 'E rot', 'oF', 'dc'; the panel",
    "is dark/unlit while neighbours are lit; there is tape or an out-of-service sign.",
    "Occupied cues: a countdown time, a lit 'running'/'sensing' indicator, laundry in the drum.",
    "Free cues: blank or price-only display ('2.25'), lid closed, empty drum.",
    "Seven-segment digits can have dim or dead segments — read the overall shape and the",
    "neighbouring machines' style; do not turn 'occupied' into 'out_of_order' just because a",
    "segment is missing, and do not read a partial digit as an error code.",
    "Only answer unknown if the relevant area is genuinely hidden or unreadable.",
    "Reply with JSON only, one entry per id:",
    '{"machines":[{"machineId":"W-01","state":"free|occupied|out_of_order|unknown","confidence":0..1,"rationale":"<what you saw>"}]}',
  ].join("\n");
}
