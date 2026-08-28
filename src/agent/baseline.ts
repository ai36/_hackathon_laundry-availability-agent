import { config } from "@/config";
import { frameImagePath } from "@/eval/dataset";
import type { FramePrediction } from "@/eval/types";

import { parseAssessments } from "./parse";
import type { VisionClient } from "./types";

const BASELINE_PROMPT = [
  "You are looking at a photo of a shared laundry room.",
  "List every washing machine and dryer you can see and whether each is free or occupied.",
  'If you cannot tell for a machine, use state "unknown" rather than guessing.',
  "Reply with JSON only:",
  '{"machines":[{"machineId":"<label>","state":"free|occupied|unknown","confidence":0..1,"rationale":"<short>"}]}',
  'Use the printed machine number where visible, otherwise a stable position label like "row1-3".',
].join("\n");

/**
 * The fair baseline: ONE vision call on the whole frame, no calibration config, no
 * per-machine ROI, no verification, no memory.
 */
export async function runBaseline(frameId: string, vision: VisionClient): Promise<FramePrediction> {
  const res = await vision.analyze({
    cacheKey: `baseline:${frameId}`,
    imagePath: frameImagePath(frameId),
    prompt: BASELINE_PROMPT,
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
      visionCalls: 1,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: res.costUsd,
    },
  };
}

export { BASELINE_PROMPT };
export const baselineModel = config.agent.visionModel;
