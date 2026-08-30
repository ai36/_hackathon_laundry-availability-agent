/**
 * Correction → `promptFragment` synthesis (D-0014, steps 1–3 — the feedback loop).
 *
 * The override (`applyCorrections`) is the *immediate* fix: it replaces the model's answer
 * for a corrected cell. This module is the *durable* fix: it takes one correction plus the
 * model's own (wrong) rationale and asks a model to write a short **reading rule** for that
 * one machine — a visual cue that would have prevented the mistake — which is then stored as
 * the machine's `promptFragment` in `data/machines.json`. Future classifications of that
 * machine get the rule in their prompt, so over time the model stops needing the override.
 *
 * Scope is deliberately narrow: only the one machine's fragment changes. The global
 * classify prompt is never touched. The fragment is a *cue* ("the standby screen shows the
 * price 2.25 with no blinking colon — not a countdown"), never a bare state assertion
 * ("this machine is free") — a state assertion is what the override already does, and it
 * would not generalise to a later capture where the state differs.
 */
import type { MachineState, MachineType } from "./types";
import { extractJsonObject } from "@/agent/parse";
import type { VisionClient } from "@/agent/types";

export interface SynthesisInput {
  machineId: string;
  /** Frame the correction was observed on (its image is sent as context). */
  frameId: string;
  machineType: MachineType;
  /** What the model predicted for this cell. */
  wrongState: MachineState;
  /** The model's own reason for that (wrong) call, from the baseline report. */
  wrongRationale: string;
  /** The integrator's ground truth. */
  correctState: MachineState;
  /** The integrator's free-text note, if any. */
  note?: string;
  /** The machine's existing fragment, if any — the synthesis merges into it. */
  currentFragment?: string;
}

export interface SynthesisResult {
  machineId: string;
  /** The new or merged reading rule. Empty string = the model declined to produce one. */
  fragment: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

const MAX_FRAGMENT_CHARS = 280;

export function synthesisPrompt(input: SynthesisInput): string {
  const kind = input.machineType;
  const lines = [
    `A vision model is classifying ${kind} ${input.machineId} in a shared laundry room from a`,
    `fixed camera as free / occupied / out_of_order / unknown.`,
    ``,
    `On this frame it answered "${input.wrongState}" and reasoned:`,
    `  ${JSON.stringify(input.wrongRationale || "(no rationale recorded)")}`,
    `A human operator says the correct answer is "${input.correctState}".`,
    input.note ? `The operator's note: ${JSON.stringify(input.note)}` : ``,
  ];

  if (input.currentFragment?.trim()) {
    lines.push(
      ``,
      `This machine already has an operator reading-rule; revise it to also cover this miss:`,
      `  ${JSON.stringify(input.currentFragment.trim())}`,
    );
  }

  lines.push(
    ``,
    `Write ONE short reading rule for ${input.machineId} that, added to the model's prompt,`,
    `would have prevented this mistake and will still be correct on future captures where`,
    `this machine's state is different. Requirements:`,
    `  - describe the VISUAL CUE the model misread and how to read it correctly`,
    `    (e.g. "the lit '2.25' is the price, not a countdown; a real countdown blinks a colon")`,
    `  - do NOT assert a fixed state ("this machine is free") unless the operator's note says`,
    `    the machine is permanently out of service / removed — a durable physical fact`,
    `  - ${MAX_FRAGMENT_CHARS} characters max, one or two sentences, no line breaks`,
    `  - if no useful generalisable rule exists, return an empty string`,
    ``,
    `Reply with JSON only: {"fragment": "<rule or empty string>"}`,
  );

  return lines.filter((l) => l !== ``).join("\n");
}

/** Pull `{"fragment": "..."}` out of a model reply; trims and caps length. */
export function parseFragment(text: string): string {
  const json = extractJsonObject(text);
  const raw = (json as { fragment?: unknown } | null)?.fragment;
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_FRAGMENT_CHARS);
}

/**
 * Synthesize one machine's fragment from one correction. `imagePath` is the correction's
 * source frame — sent as context so the model can look at the display it misread. The call
 * is cached by `cacheKey` (not image bytes), so `--replay` reproduces it frame-absent.
 */
export async function synthesizeFragment(
  input: SynthesisInput,
  vision: VisionClient,
  imagePath: string,
): Promise<SynthesisResult> {
  const res = await vision.analyze({
    cacheKey: `synth:${input.frameId}:${input.machineId}`,
    imagePath,
    prompt: synthesisPrompt(input),
  });
  return {
    machineId: input.machineId,
    fragment: parseFragment(res.text),
    model: res.model,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    costUsd: res.costUsd,
  };
}
