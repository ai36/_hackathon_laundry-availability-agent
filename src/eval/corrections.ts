/**
 * Integrator corrections (D-0014).
 *
 * During onboarding — and any time after — an integrator who sees the agent call a machine's
 * state wrong records the right answer. Corrections are stored as ground truth supplied by a
 * human and applied as an **authoritative override** on top of the agent's prediction.
 *
 * Two scopes:
 * - `observation` — fixes this one `(frameId, machineId)` pair. Use for `free` / `occupied`,
 *   which change over time.
 * - `machine` — a durable property of the physical machine (`out_of_order`, or a permanently
 *   removed unit). Applies to that `machineId` in **every** frame until revoked. This is the
 *   scope that lets one correction fix a broken machine the vision model keeps misreading.
 *
 * Storage: one file per frame, `data/corrections/<frameId>.json`, committed (small, and it
 * is human-authored ground truth). A `machine`-scope entry is stored in whichever frame file
 * the integrator was looking at when they made it; `loadCorrections` promotes it to all
 * frames on read.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { FramePrediction, MachineState } from "./types";

export type CorrectionScope = "observation" | "machine";

export interface Correction {
  machineId: string;
  correctState: MachineState;
  /** `observation` (this frame only) or `machine` (this machine in every frame). */
  scope: CorrectionScope;
  /** Why the integrator overrode the agent — provenance, not scored. */
  note?: string;
  /** Who recorded it (e.g. "integrator"). */
  by: string;
  /** ISO-8601 timestamp. */
  at: string;
}

export interface FrameCorrections {
  frameId: string;
  corrections: Correction[];
}

const DEFAULT_DIR = "data/corrections";

function isState(v: unknown): v is MachineState {
  return v === "free" || v === "occupied" || v === "unknown" || v === "out_of_order";
}

/** Validate one raw record from disk; throws with the offending frame/field named. */
function parseCorrection(raw: unknown, frameId: string): Correction {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`corrections/${frameId}.json: each correction must be an object`);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.machineId !== "string" || r.machineId.trim() === "") {
    throw new Error(`corrections/${frameId}.json: correction.machineId must be a non-empty string`);
  }
  if (!isState(r.correctState)) {
    throw new Error(
      `corrections/${frameId}.json: correction.correctState for ${r.machineId} must be a MachineState`,
    );
  }
  const scope = r.scope ?? "observation";
  if (scope !== "observation" && scope !== "machine") {
    throw new Error(
      `corrections/${frameId}.json: correction.scope for ${r.machineId} must be "observation" or "machine"`,
    );
  }
  return {
    machineId: r.machineId,
    correctState: r.correctState,
    scope,
    note: typeof r.note === "string" ? r.note : undefined,
    by: typeof r.by === "string" && r.by.trim() !== "" ? r.by : "integrator",
    at: typeof r.at === "string" ? r.at : "",
  };
}

export function loadFrameCorrections(frameId: string, dir = DEFAULT_DIR): Correction[] {
  const p = join(dir, `${frameId}.json`);
  if (!existsSync(p)) return [];
  const parsed = JSON.parse(readFileSync(p, "utf8")) as unknown;
  const list = (parsed as { corrections?: unknown }).corrections;
  if (!Array.isArray(list)) {
    throw new Error(`corrections/${frameId}.json: expected { "frameId", "corrections": [...] }`);
  }
  return list.map((c) => parseCorrection(c, frameId));
}

/**
 * All corrections in `dir`, indexed for lookup:
 * - `byFrame.get(frameId)` — `observation`-scope corrections for that frame.
 * - `byMachine.get(machineId)` — `machine`-scope corrections (apply to every frame).
 *
 * If the same machine has both, the `observation`-scope one wins for that frame.
 */
export function loadCorrections(dir = DEFAULT_DIR): {
  byFrame: Map<string, Correction[]>;
  byMachine: Map<string, Correction>;
  count: number;
} {
  const byFrame = new Map<string, Correction[]>();
  const byMachine = new Map<string, Correction>();
  let count = 0;

  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  for (const file of files) {
    const frameId = file.replace(/\.json$/, "");
    for (const c of loadFrameCorrections(frameId, dir)) {
      count++;
      if (c.scope === "machine") {
        byMachine.set(c.machineId, c);
      } else {
        const arr = byFrame.get(frameId) ?? [];
        arr.push(c);
        byFrame.set(frameId, arr);
      }
    }
  }
  return { byFrame, byMachine, count };
}

/**
 * Overlay corrections on one frame's prediction. A corrected machine's state is replaced,
 * `confidence` set to 1, and `rationale` marked as integrator-sourced. Machines with no
 * correction pass through untouched. Returns a new prediction; the input is not mutated.
 */
export function applyCorrections(
  prediction: FramePrediction,
  corrections: ReturnType<typeof loadCorrections>,
): { prediction: FramePrediction; applied: number } {
  const observation = corrections.byFrame.get(prediction.frameId) ?? [];
  const forThisMachine = (machineId: string): Correction | undefined =>
    observation.find((c) => c.machineId === machineId) ?? corrections.byMachine.get(machineId);

  let applied = 0;
  const machines = prediction.machines.map((m) => {
    const c = forThisMachine(m.machineId);
    if (!c) return m;
    applied++;
    return {
      ...m,
      state: c.correctState,
      confidence: 1,
      rationale: `integrator correction (${c.scope})${c.note ? `: ${c.note}` : ""}`,
    };
  });

  return { prediction: { ...prediction, machines }, applied };
}

/**
 * The correction that applies to `machineId` in the context of `frameId`, if any —
 * an `observation`-scope entry for that exact frame wins, else a `machine`-scope entry.
 */
export function correctionFor(
  corrections: ReturnType<typeof loadCorrections>,
  frameId: string,
  machineId: string,
): Correction | undefined {
  const obs = (corrections.byFrame.get(frameId) ?? []).find((c) => c.machineId === machineId);
  return obs ?? corrections.byMachine.get(machineId);
}

export interface CorrectionInput {
  frameId: string;
  machineId: string;
  correctState: MachineState;
  scope?: CorrectionScope;
  note?: string;
  by?: string;
}

/** Frame / machine ids that are safe to use as a path segment. */
const ID_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Append or replace one correction in `data/corrections/<frameId>.json` (read-modify-write).
 * Shared by the `npm run correct` CLI and the portal's `/api/corrections` route. Throws on
 * an invalid state / scope / id. `frameId` and `machineId` are restricted to
 * `[A-Za-z0-9_-]+` so a request body can never write outside `dir` (path traversal).
 * Returns the written entry.
 */
export function writeCorrection(input: CorrectionInput, dir = DEFAULT_DIR): Correction {
  if (!ID_RE.test(input.frameId ?? "")) {
    throw new Error(
      `writeCorrection: frameId must match ${ID_RE} (got "${String(input.frameId)}")`,
    );
  }
  if (!ID_RE.test(input.machineId ?? "")) {
    throw new Error(
      `writeCorrection: machineId must match ${ID_RE} (got "${String(input.machineId)}")`,
    );
  }
  if (!isState(input.correctState)) {
    throw new Error(
      `writeCorrection: correctState "${String(input.correctState)}" is not a MachineState`,
    );
  }
  const scope = input.scope ?? "observation";
  if (scope !== "observation" && scope !== "machine") {
    throw new Error(`writeCorrection: scope "${scope}" must be "observation" or "machine"`);
  }

  const entry: Correction = {
    machineId: input.machineId,
    correctState: input.correctState,
    scope,
    note: input.note?.trim() ? input.note.trim() : undefined,
    by: input.by?.trim() ? input.by.trim() : "integrator",
    at: new Date().toISOString(),
  };

  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${input.frameId}.json`);
  const file: FrameCorrections = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as FrameCorrections)
    : { frameId: input.frameId, corrections: [] };
  file.corrections = file.corrections.filter((c) => c.machineId !== input.machineId);
  file.corrections.push(entry);
  file.corrections.sort((a, b) => a.machineId.localeCompare(b.machineId));
  writeFileSync(path, JSON.stringify(file, null, 2) + "\n");
  return entry;
}
