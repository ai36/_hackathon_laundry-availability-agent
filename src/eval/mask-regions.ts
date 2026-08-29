/**
 * Reads a camera's region-map PNG (`camera.mask`) + `camera.maskLegend` into one bounding
 * box per machine (D-0015). Each non-black pixel is assigned to the nearest legend colour
 * (Euclidean RGB, within `MAX_DIST`), so drift from resizing / anti-aliasing is tolerated;
 * pixels of the same machine's colour are unioned even if the painted region is in two
 * pieces.
 *
 * `sharp` is imported here (and in `src/agent/roi.ts`) only — the `--mode=roi` crop path.
 * It is never on a `--replay` code path, so reproduction needs no image library, same as
 * `ffmpeg` for `dataset:prepare`.
 */
import { existsSync, readFileSync } from "node:fs";

import sharp from "sharp";

export interface MaskRegion {
  machineId: string;
  /** [x, y, width, height] in the region-map's own pixels. */
  bbox: [number, number, number, number];
  /** Region centre, for ordering machines within a stacked column. */
  centre: [number, number];
  pixels: number;
}

const MAX_DIST = 120; // reject a region colour further than this from every legend entry
const MIN_AREA_FRAC = 0.0008; // ignore specks below this share of the image

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** One box per legend entry, or `[]` if the map / legend is missing. */
export async function loadMaskRegions(
  maskPath: string,
  legend: Record<string, string>,
): Promise<MaskRegion[]> {
  if (!existsSync(maskPath) || Object.keys(legend).length === 0) return [];

  const entries = Object.entries(legend).map(([hex, id]) => ({ id, rgb: parseHex(hex) }));
  const { data, info } = await sharp(readFileSync(maskPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  type Acc = { x0: number; y0: number; x1: number; y1: number; sx: number; sy: number; n: number };
  const acc = new Map<string, Acc>();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      if (a < 128) continue;
      if (r < 24 && g < 24 && b < 24) continue; // black background

      let bestId = "";
      let bestD = Infinity;
      for (const e of entries) {
        const d = (r - e.rgb[0]) ** 2 + (g - e.rgb[1]) ** 2 + (b - e.rgb[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          bestId = e.id;
        }
      }
      if (bestD > MAX_DIST * MAX_DIST) continue;

      let o = acc.get(bestId);
      if (!o) {
        o = { x0: W, y0: H, x1: -1, y1: -1, sx: 0, sy: 0, n: 0 };
        acc.set(bestId, o);
      }
      if (x < o.x0) o.x0 = x;
      if (x > o.x1) o.x1 = x;
      if (y < o.y0) o.y0 = y;
      if (y > o.y1) o.y1 = y;
      o.sx += x;
      o.sy += y;
      o.n++;
    }
  }

  const minA = W * H * MIN_AREA_FRAC;
  const out: MaskRegion[] = [];
  for (const [machineId, o] of acc) {
    if (o.n < minA) continue;
    out.push({
      machineId,
      bbox: [o.x0, o.y0, o.x1 - o.x0 + 1, o.y1 - o.y0 + 1],
      centre: [o.sx / o.n, o.sy / o.n],
      pixels: o.n,
    });
  }
  return out;
}

export interface RoiGroup {
  /** Regions in this group, ordered top→bottom for a stack. */
  regions: MaskRegion[];
  /** true when the members share one control panel (a stacked column) — crop them together. */
  stacked: boolean;
}

/**
 * Group regions for cropping. A pair counts as a **stack** (one shared control panel, so
 * crop them as one) only when their x-bboxes overlap heavily AND they are arranged
 * vertically (centre-y gap clearly larger than centre-x gap). A perspective-compressed
 * side-by-side row (x-overlap but roughly diagonal spacing) is NOT a stack — each machine is
 * its own group.
 */
export function groupRegions(regions: MaskRegion[]): RoiGroup[] {
  const xOverlap = (a: MaskRegion, b: MaskRegion): number => {
    const [ax, , aw] = a.bbox;
    const [bx, , bw] = b.bbox;
    return Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) / Math.min(aw, bw);
  };
  const isStackPair = (a: MaskRegion, b: MaskRegion): boolean => {
    if (xOverlap(a, b) < 0.45) return false;
    const dx = Math.abs(a.centre[0] - b.centre[0]);
    const dy = Math.abs(a.centre[1] - b.centre[1]);
    return dy > 1.6 * dx;
  };

  const groups: MaskRegion[][] = [];
  for (const r of regions) {
    const g = groups.find((grp) => grp.some((m) => isStackPair(m, r)));
    if (g) g.push(r);
    else groups.push([r]);
  }
  return groups.map((grp) => ({
    regions: [...grp].sort((a, b) => a.centre[1] - b.centre[1]),
    stacked: grp.length > 1,
  }));
}
