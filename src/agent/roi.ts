/**
 * The ROI agent (D-0015). One vision call per machine group, on a crop of the live frame
 * taken from the coloured region(s) in `camera.mask` (see `src/eval/mask-regions.ts`).
 *
 * No positional inference: the crop comes from the pixels the integrator painted a machine's
 * colour, so a camera at an angle or a non-standard stack does not matter. A stacked column
 * shares one control panel, so its members are cropped and classified together (the prompt
 * names which unit is the up-arrow readout and which is the down-arrow one). A standalone
 * machine is cropped and classified on its own.
 *
 * `sharp` is used here for cropping — only on `--live`. `--replay` serves every call from
 * `data/cache/roi/` and never crops, so reproduction needs no image library beyond what
 * `next` already installs.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

import { frameImagePath } from "@/eval/dataset";
import { groupRegions, loadMaskRegions, type MaskRegion } from "@/eval/mask-regions";
import type { Camera } from "@/eval/site-config";
import type { FramePrediction, MachinePrediction } from "@/eval/types";

import { parseAssessments } from "./parse";
import type { VisionClient } from "./types";

const STATES = '"state":"free|occupied|out_of_order|unknown"';
const RULES = [
  "States:",
  '  "free"         — available now (empty, not running)',
  '  "occupied"     — running, holding laundry, or a countdown time on the display',
  '  "out_of_order" — an unambiguous error token ("E rot", "Err", "oF"), taped off / an',
  "                   out-of-service sign, or a fully dark panel while neighbours are lit",
  '  "unknown"      — the panel is hidden or genuinely unreadable in this crop',
  "A bare number like 2.25 or 225 with no colon is the PRICE, not a countdown — reads as `free`.",
];

function soloPrompt(id: string, kind: string): string {
  return [
    `This is a close crop of ONE ${kind} in a shared laundry room — machine ${id}.`,
    "Read its control-panel display, indicator lights, door/lid and drum, then classify it.",
    ...RULES,
    "Reply with JSON only:",
    `{"machines":[{"machineId":"${id}",${STATES},"confidence":0..1,"rationale":"<short>"}]}`,
  ].join("\n");
}

function stackPrompt(ids: string[], kind: string): string {
  // These stacked Speed Queen units are pairs sharing ONE panel with two readouts side by
  // side: LEFT (up-arrow ↑) = upper machine, RIGHT (down-arrow ↓) = lower machine.
  let lines: string[];
  if (ids.length === 2) {
    lines = [
      `  - ${ids[0]}: the UPPER machine — read the LEFT readout (the one with the up-arrow ↑)`,
      `  - ${ids[1]}: the LOWER machine — read the RIGHT readout (the one with the down-arrow ↓)`,
    ];
  } else {
    const pos = ["top", "second from top", "third from top", "fourth from top"];
    lines = ids.map((id, i) => `  - ${id}: the ${pos[i] ?? `${i + 1}th`} unit of the stack`);
  }
  return [
    `This is a close crop of a STACKED ${kind} column: two machines, one on top of the other,`,
    "sharing ONE control panel. The panel shows the units' readouts SIDE BY SIDE, not stacked.",
    "Classify each unit from ITS OWN readout:",
    ...lines,
    'A unit whose readout shows a hard error (e.g. "E rot") is out_of_order even if the other',
    "readout on the same panel looks normal.",
    ...RULES,
    "Reply with JSON only, one entry per id:",
    `{"machines":[{"machineId":"${ids[0]}",${STATES},"confidence":0..1,"rationale":"<short>"}]}`,
  ].join("\n");
}

/** Union bbox of a group, padded ~6% and clamped to the frame. */
function cropBox(
  regions: MaskRegion[],
  sx: number,
  sy: number,
  FW: number,
  FH: number,
  shrink = 0,
): { left: number; top: number; width: number; height: number } {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const r of regions) {
    const [bx, by, bw, bh] = r.bbox;
    x0 = Math.min(x0, bx);
    y0 = Math.min(y0, by);
    x1 = Math.max(x1, bx + bw);
    y1 = Math.max(y1, by + bh);
  }
  // optional shrink toward the centre (for standalone regions that perspective makes overlap)
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  x0 = cx - (cx - x0) * (1 - shrink);
  x1 = cx + (x1 - cx) * (1 - shrink);
  y0 = cy - (cy - y0) * (1 - shrink);
  y1 = cy + (y1 - cy) * (1 - shrink);

  const padX = (x1 - x0) * 0.06,
    padY = (y1 - y0) * 0.06;
  const left = Math.max(0, Math.round((x0 - padX) * sx));
  const top = Math.max(0, Math.round((y0 - padY) * sy));
  return {
    left,
    top,
    width: Math.min(FW - left, Math.round((x1 - x0 + 2 * padX) * sx)),
    height: Math.min(FH - top, Math.round((y1 - y0 + 2 * padY) * sy)),
  };
}

export async function runRoi(
  frameId: string,
  vision: VisionClient,
  camera: Camera,
  /** false on `--replay`: skip the crop entirely (the cache is keyed by bbox, not bytes). */
  writeCrops = true,
): Promise<FramePrediction> {
  const regions = await loadMaskRegions(
    join(process.cwd(), camera.mask ?? ""),
    camera.maskLegend ?? {},
  );
  const groups = groupRegions(regions);

  const framePath = frameImagePath(frameId);
  const fm = await sharp(framePath).metadata();
  const FW = fm.width ?? 0,
    FH = fm.height ?? 0;
  const rm = camera.mask
    ? await sharp(join(process.cwd(), camera.mask)).metadata()
    : { width: FW, height: FH };
  const sx = FW / (rm.width ?? FW),
    sy = FH / (rm.height ?? FH);

  const tmp = mkdtempSync(join(tmpdir(), "laundry3-roi-"));
  let inTok = 0,
    outTok = 0,
    cost = 0,
    calls = 0;
  const models = new Set<string>();
  const byId = new Map<string, MachinePrediction>();

  for (const g of groups) {
    const ids = g.regions.map((r) => r.machineId);
    const kind = ids[0].startsWith("D") ? "dryer" : "washer";
    const box = cropBox(g.regions, sx, sy, FW, FH, g.stacked ? 0 : 0.22);

    let imagePath = framePath;
    if (writeCrops) {
      imagePath = join(tmp, `${ids.join("_")}.jpg`);
      await sharp(framePath).extract(box).jpeg({ quality: 90 }).toFile(imagePath);
    }

    // `crop` (not `imagePath`) is folded into the cache hash, so --replay reproduces the
    // same request without cropping.
    const res = await vision.analyze({
      cacheKey: `roi:${frameId}:${ids.join(",")}`,
      imagePath,
      crop: [box.left, box.top, box.width, box.height],
      prompt: g.stacked ? stackPrompt(ids, kind) : soloPrompt(ids[0], kind),
    });
    calls++;
    inTok += res.inputTokens ?? 0;
    outTok += res.outputTokens ?? 0;
    cost += res.costUsd ?? 0;
    if (res.model) models.add(res.model);

    const parsed = parseAssessments(res.text);
    for (const id of ids) {
      const a = parsed.find((x) => x.machineId === id);
      byId.set(id, {
        machineId: id,
        state: a?.state ?? "unknown",
        confidence: a?.confidence ?? 0,
        rationale: a?.rationale ?? "no answer",
      });
    }
  }

  const machines: MachinePrediction[] = camera.machineIds.map(
    (id) =>
      byId.get(id) ?? { machineId: id, state: "unknown", confidence: 0, rationale: "no region" },
  );

  return {
    frameId,
    machines,
    meta: {
      mode: "roi",
      model: [...models].join("+") || undefined,
      visionCalls: calls,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsd: cost,
    },
  };
}
