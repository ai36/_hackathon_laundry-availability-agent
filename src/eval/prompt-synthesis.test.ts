import test from "node:test";
import assert from "node:assert/strict";

import type { VisionClient, VisionRequest, VisionResponse } from "@/agent/types";

import {
  parseFragment,
  synthesisPrompt,
  synthesizeFragment,
  type SynthesisInput,
} from "./prompt-synthesis";

const BASE: SynthesisInput = {
  machineId: "W-01",
  frameId: "img_1819",
  machineType: "washer",
  wrongState: "occupied",
  wrongRationale: "display shows 2.25, reads as a countdown",
  correctState: "free",
  note: "standby price screen",
};

class CannedVision implements VisionClient {
  seen: VisionRequest[] = [];
  constructor(private readonly text: string) {}
  async analyze(req: VisionRequest): Promise<VisionResponse> {
    this.seen.push(req);
    return { text: this.text, model: "canned", inputTokens: 10, outputTokens: 5, costUsd: 0.001 };
  }
}

test("synthesisPrompt carries the wrong call, the truth, and the note", () => {
  const p = synthesisPrompt(BASE);
  assert.match(p, /answered "occupied"/);
  assert.match(p, /correct answer is "free"/);
  assert.match(p, /2\.25, reads as a countdown/);
  assert.match(p, /standby price screen/);
  assert.match(p, /JSON only: \{"fragment"/);
});

test("synthesisPrompt asks to merge when a fragment already exists", () => {
  const p = synthesisPrompt({ ...BASE, currentFragment: "check the door latch" });
  assert.match(p, /already has an operator reading-rule/);
  assert.match(p, /check the door latch/);
});

test("parseFragment pulls the string out of a JSON reply and normalises whitespace", () => {
  assert.equal(
    parseFragment('here you go: {"fragment": "the lit  2.25  is the price,\\nnot a countdown"}'),
    "the lit 2.25 is the price, not a countdown",
  );
});

test("parseFragment returns empty string when the model declines or the reply is junk", () => {
  assert.equal(parseFragment('{"fragment": ""}'), "");
  assert.equal(parseFragment("no json here"), "");
  assert.equal(parseFragment('{"other": 1}'), "");
});

test("parseFragment caps length at 280 chars", () => {
  const long = "x".repeat(400);
  assert.equal(parseFragment(`{"fragment": "${long}"}`).length, 280);
});

test("synthesizeFragment calls vision with a stable per-cell cache key and returns the parsed rule", async () => {
  const vision = new CannedVision(
    '{"fragment": "the 2.25 is the price; a real countdown blinks a colon"}',
  );
  const r = await synthesizeFragment(BASE, vision, "data/public/frames/img_1819.jpg");

  assert.equal(vision.seen[0].cacheKey, "synth:img_1819:W-01");
  assert.equal(vision.seen[0].imagePath, "data/public/frames/img_1819.jpg");
  assert.equal(r.machineId, "W-01");
  assert.equal(r.fragment, "the 2.25 is the price; a real countdown blinks a colon");
  assert.equal(r.costUsd, 0.001);
});
