/**
 * Camera-aware classify prompt for the portal runtime (`POST /api/refresh`, D-0015 / D-0016).
 *
 * Deliberately SEPARATE from the eval's `baselinePrompt` (`src/agent/baseline.ts`) and
 * `classifyPrompt` (`src/agent/pipeline.ts`): those are frozen so the committed 9-frame eval
 * reproduces byte-for-byte. This builder layers in what an integrator has actually
 * calibrated for one camera —
 *
 *   1. per-machine `promptFragment` hints from the roster (`data/machines.json`),
 *   2. an annotated "spatial key" still (`camera.annotatedShot`) — ids drawn on the frame,
 *   3. an analysis mask (`camera.mask`) — solid-black regions the agent must ignore.
 *
 * The two images are sent via `VisionRequest.extraImagePaths` (annotated first, then mask);
 * this text must describe them in that order. With a bare config (no fragments, no
 * annotated/mask — the state every seeded camera is in today) it degrades to the same
 * instruction the baseline uses, so this path is inert until a camera is calibrated.
 *
 * ACCURACY EFFECT IS UNMEASURED. The frozen eval scores the CLI agent on 9 frames, not this
 * route; changing it does not move any reported metric.
 */

export interface CameraClassifyInput {
  machineIds: string[];
  /** machineId -> promptFragment, for machines that have one. */
  fragments?: Record<string, string>;
  /** An annotated still is included as the first extra image. */
  hasAnnotatedShot?: boolean;
  /** An analysis mask is included as the last extra image. */
  hasMask?: boolean;
}

export function cameraClassifyPrompt(input: CameraClassifyInput): string {
  const { machineIds, fragments = {}, hasAnnotatedShot = false, hasMask = false } = input;

  const lines: string[] = [
    "You are monitoring a shared laundry room from one fixed camera. Washers are labelled",
    "W-01, W-02, … and dryers D-01, D-02, …, numbered left-to-right along each bank; for",
    "stacked units the upper machine has the lower number.",
    "",
    `Classify these machines visible in the frame: ${machineIds.join(", ")}.`,
    '  "free"         — available now (empty, not running)',
    '  "occupied"     — running, holding laundry, or showing time remaining',
    '  "out_of_order" — visibly broken, taped off, powered down, or a hard error on the display',
    '  "unknown"      — you cannot tell from this image (say this rather than guessing)',
  ];

  if (hasAnnotatedShot) {
    lines.push(
      "",
      "The image after the main frame is an ANNOTATED reference: the same camera view with",
      "machine ids drawn on it. Use it only to match each id to a physical machine — it may",
      "be an older capture, so never read a machine's state from it.",
    );
  }
  if (hasMask) {
    lines.push(
      "",
      `The ${hasAnnotatedShot ? "next" : "image after the main frame"} is an ANALYSIS MASK:`,
      "solid black regions are not your machines (a doorway, a neighbouring bank, glare).",
      "Ignore anything that falls under a black region.",
    );
  }

  const notes = machineIds
    .filter((id) => fragments[id]?.trim())
    .map((id) => `  - ${id}: ${fragments[id].trim()}`);
  if (notes.length > 0) {
    lines.push("", "Per-machine notes from the site operator:", ...notes);
  }

  lines.push(
    "",
    "Reply with JSON only, one entry per id above:",
    '{"machines":[{"machineId":"W-01","state":"free|occupied|out_of_order|unknown","confidence":0..1,"rationale":"<short>"}]}',
  );

  return lines.join("\n");
}
