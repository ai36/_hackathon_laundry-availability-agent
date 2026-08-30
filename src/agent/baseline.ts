import { config } from "@/config";
import { frameImagePath } from "@/eval/dataset";
import type { FramePrediction } from "@/eval/types";

import { parseAssessments } from "./parse";
import type { VisionClient } from "./types";

/**
 * The fair baseline: ONE vision call on the whole frame. No calibration config, no
 * per-machine ROI, no verification pass, no memory. It IS told which machine ids appear in
 * the frame and the global numbering convention (so its output is scorable per id) — but
 * not where each machine is or what state it is in.
 */
/**
 * @param fragments optional `machineId -> promptFragment` (the D-0014 feedback loop). The
 *   eval's `runBaseline` never passes this, so its prompt string — and its cache hash — are
 *   unchanged; only the portal's live `/api/refresh` supplies fragments.
 */
export function baselinePrompt(
  machineIds: string[],
  fragments: Record<string, string> = {},
): string {
  const notes = machineIds
    .filter((id) => fragments[id]?.trim())
    .map((id) => `  - ${id}: ${fragments[id].trim()}`);
  return [
    "You are looking at one photo of a shared laundry-room. Washing machines are labelled",
    "W-01, W-02, … and dryers D-01, D-02, …, numbered left-to-right along each bank; for",
    "stacked units the upper machine has the lower number.",
    "",
    `The machines visible in THIS photo are: ${machineIds.join(", ")}.`,
    "Map each id to a machine using the left-to-right / top-to-bottom convention, then",
    "classify its state:",
    '  "free"         — available now (empty, not running)',
    '  "occupied"     — running, or holding laundry / showing time remaining',
    '  "out_of_order" — visibly broken, taped off, powered down, or a hard error on the display',
    '  "unknown"      — you cannot tell from this image (say this rather than guessing)',
    ...(notes.length ? ["", "Per-machine operator reading-rules:", ...notes] : []),
    "",
    "Reply with JSON only, one entry per id above:",
    '{"machines":[{"machineId":"W-01","state":"free|occupied|out_of_order|unknown","confidence":0..1,"rationale":"<short>"}]}',
  ].join("\n");
}

export async function runBaseline(
  frameId: string,
  vision: VisionClient,
  machineIds: string[],
): Promise<FramePrediction> {
  const prompt = baselinePrompt(machineIds);
  const res = await vision.analyze({
    cacheKey: `baseline:${frameId}:${machineIds.join(",")}`,
    imagePath: frameImagePath(frameId),
    prompt,
  });
  const assessments = parseAssessments(res.text);
  return {
    frameId,
    machines: assessments.map((a) => ({
      machineId: a.machineId,
      state: a.state,
      confidence: a.confidence,
      rationale: a.rationale,
    })),
    meta: {
      mode: "baseline",
      model: res.model,
      visionCalls: 1,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: res.costUsd,
    },
  };
}

export const baselineModel = config.agent.visionModel;
