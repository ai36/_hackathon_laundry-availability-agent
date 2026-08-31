/**
 * Camera-aware classify prompt used by the eval's `--mode=calibrated` (`src/agent/
 * calibrated.ts`). It sends the camera's `annotatedShot` and `mask` as extra images
 * (`VisionRequest.extraImagePaths`, annotated first, then mask) and this text describes
 * them in that order. (`POST /api/refresh` no longer uses it — reverted to `baselinePrompt`
 * on 2026-08-29.)
 *
 * NOTE (2026-08-29): `--mode=calibrated` is a **retired dead-end** (−13.7 pp — see
 * `docs/CHANGELOG.md`) and `camera.mask` was afterwards repainted as a colour-coded region
 * map for `--mode=roi`. This prompt still calls it a "transparent analysis mask" because the
 * committed `data/cache/calibrated/` was recorded against the earlier transparent masks;
 * `--replay` reads those recorded responses, so it reproduces. Do not re-run
 * `--mode=calibrated --live` expecting the recorded numbers. This prompt text itself is
 * FROZEN — the replay hash folds it in (see `calibrated.ts`, 2026-08-30).
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

  // Number the images so the model can't confuse the live photo with the reference layers.
  let n = 1;
  const liveNo = n++;
  const annotatedNo = hasAnnotatedShot ? n++ : 0;
  const maskNo = hasMask ? n++ : 0;

  const lines: string[] = [
    "You are monitoring a shared laundry room from one fixed camera. Washers are labelled",
    "W-01, W-02, … and dryers D-01, D-02, …, numbered left-to-right along each bank; for",
    "stacked units the upper machine has the lower number.",
    "",
    `IMAGE ${liveNo} is the live camera photo. It is the ONLY source of truth for every`,
    "machine's state — read each machine's display, indicator lights, lid and drum from it.",
  ];

  if (hasAnnotatedShot) {
    lines.push(
      "",
      `IMAGE ${annotatedNo} is a LOCATION MAP, not a photo: the same camera view with each`,
      'machine painted a flat solid colour and its id (e.g. "W-01") printed on it. Its ONLY',
      "purpose is to tell you which machine sits at which position. Never read state, lights,",
      `displays, or activity from IMAGE ${annotatedNo} — a flat colour block carries no`,
      "information about whether that machine is running.",
    );
  }
  if (hasMask) {
    lines.push(
      "",
      `IMAGE ${maskNo} is an analysis mask with IMAGE ${liveNo}'s exact framing (it is not`,
      `laid over the photo and hides nothing). Each clear / transparent window marks the one`,
      `region of IMAGE ${liveNo} that decides a machine's state — its control panel and`,
      "display. Everything under solid black is another bank, background, or a redaction —",
      "do not analyse it.",
    );
  }
  if (hasAnnotatedShot && hasMask) {
    lines.push(
      "",
      `To tell which machine a transparent window belongs to: take that window's position in`,
      `IMAGE ${maskNo} and read the id at the same position in IMAGE ${annotatedNo}. Then`,
      `judge that machine only from the matching region of IMAGE ${liveNo}.`,
    );
  }

  lines.push(
    "",
    `Classify these machines, reading state only from IMAGE ${liveNo}: ${machineIds.join(", ")}.`,
    '  "free"         — available now (empty, not running)',
    '  "occupied"     — running, holding laundry, or showing time remaining',
    '  "out_of_order" — visibly broken, taped off, powered down, or a hard error on the display',
    '  "unknown"      — you cannot tell from the live photo (say this rather than guessing)',
  );

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
