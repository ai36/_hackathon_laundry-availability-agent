import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";

import type { FrameLabel } from "./types";

const LABELS_DIR = join(config.paths.dataset, "labels");
const SPLITS_DIR = join(config.paths.dataset, "splits");
const FRAMES_DIR = join(config.paths.dataset, "public", "frames");

/** Absolute-ish path to a frame image. */
export function frameImagePath(frameId: string): string {
  return join(FRAMES_DIR, `${frameId}.jpg`);
}

function assertFrameLabel(x: unknown, file: string): FrameLabel {
  if (typeof x !== "object" || x === null) throw new Error(`${file}: not an object`);
  const o = x as Record<string, unknown>;
  if (typeof o.frameId !== "string") throw new Error(`${file}: missing frameId`);
  if (!Array.isArray(o.machines)) throw new Error(`${file}: missing machines[]`);
  for (const m of o.machines as Record<string, unknown>[]) {
    if (typeof m.machineId !== "string") throw new Error(`${file}: machine without machineId`);
    if (m.type !== "washer" && m.type !== "dryer") throw new Error(`${file}: bad machine.type`);
    if (!["free", "occupied", "unknown", "out_of_order"].includes(m.state as string)) {
      throw new Error(`${file}: bad machine.state "${String(m.state)}"`);
    }
    if (typeof m.gtDeterminate !== "boolean")
      throw new Error(`${file}: machine.gtDeterminate must be boolean`);
  }
  return x as FrameLabel;
}

/** Load every `data/labels/*.json` (skips `*.example.json` and files starting with `_`). */
export function loadFrameLabels(): Map<string, FrameLabel> {
  const out = new Map<string, FrameLabel>();
  if (!existsSync(LABELS_DIR)) return out;
  for (const file of readdirSync(LABELS_DIR)) {
    if (!file.endsWith(".json") || file.endsWith(".example.json") || file.startsWith("_")) continue;
    const parsed = assertFrameLabel(JSON.parse(readFileSync(join(LABELS_DIR, file), "utf8")), file);
    out.set(parsed.frameId, parsed);
  }
  return out;
}

/** Read `data/splits/<name>.txt` — one frameId per line, `#` comments allowed. */
export function loadSplit(name: string): string[] {
  const path = join(SPLITS_DIR, `${name}.txt`);
  if (!existsSync(path)) throw new Error(`split not found: ${path}`);
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);
}
