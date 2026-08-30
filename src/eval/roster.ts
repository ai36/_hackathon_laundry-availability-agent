/**
 * Machine roster (`data/machines.json`) — read/write helpers shared by the portal, the
 * `/api/machines` route, and `buildRoomStatus`. Per D-0015 a machine may carry an optional
 * `promptFragment` (a hint the agent gets when it classifies that machine) and optional
 * `referenceShots` (paths to per-state example images under `data/site-config/`).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";
import type { MachineType } from "./types";

export interface ReferenceShot {
  state: "free" | "occupied" | "out_of_order" | "unknown";
  path: string;
}

export interface RosterMachine {
  machineId: string;
  type: MachineType;
  /** Free-text hint appended to the agent's prompt for this machine (D-0015). */
  promptFragment?: string;
  /**
   * Where `promptFragment` came from (D-0014 feedback loop): `integrator` = hand-written,
   * `synthesis` = generated from a correction by `npm run synthesize`, `merged` = a synthesis
   * pass revised a pre-existing fragment. Provenance only; not read by the agent.
   */
  fragmentSource?: "integrator" | "synthesis" | "merged";
  /** Per-state example images (paths under data/site-config/), few-shot context (D-0015). */
  referenceShots?: ReferenceShot[];
}

export interface Roster {
  site?: string;
  note?: string;
  machines: RosterMachine[];
}

export const MACHINE_ID_RE = /^[A-Za-z0-9_-]+$/;

function rosterPath(): string {
  return join(config.paths.dataset, "machines.json");
}

export function loadRoster(path = rosterPath()): Roster {
  if (!existsSync(path)) return { machines: [] };
  const raw = JSON.parse(readFileSync(path, "utf8")) as Roster;
  return {
    site: raw.site,
    note: raw.note,
    machines: Array.isArray(raw.machines) ? raw.machines : [],
  };
}

/** Sort by id (washers then dryers, natural-ish), validate, write pretty JSON. */
export function writeRoster(roster: Roster, path = rosterPath()): Roster {
  const seen = new Set<string>();
  for (const m of roster.machines) {
    if (!MACHINE_ID_RE.test(m.machineId)) {
      throw new Error(`roster: machineId "${m.machineId}" must match ${MACHINE_ID_RE}`);
    }
    if (m.type !== "washer" && m.type !== "dryer") {
      throw new Error(`roster: ${m.machineId} type must be "washer" or "dryer"`);
    }
    if (seen.has(m.machineId)) throw new Error(`roster: duplicate machineId "${m.machineId}"`);
    seen.add(m.machineId);
  }
  const machines = [...roster.machines].sort((a, b) => {
    if (a.type !== b.type) return a.type === "washer" ? -1 : 1;
    return a.machineId.localeCompare(b.machineId, undefined, { numeric: true });
  });
  const out: Roster = { ...roster, machines };
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  return out;
}

export function upsertMachine(
  roster: Roster,
  patch: Partial<RosterMachine> & { machineId: string; targetId?: string },
): Roster {
  const targetId = patch.targetId ?? patch.machineId;
  const idx = roster.machines.findIndex((m) => m.machineId === targetId);
  const machines = [...roster.machines];
  if (idx === -1) {
    machines.push({
      machineId: patch.machineId,
      type: patch.type ?? "washer",
      promptFragment: patch.promptFragment?.trim() || undefined,
      fragmentSource: patch.fragmentSource,
      referenceShots: patch.referenceShots,
    });
  } else {
    const cur = machines[idx];
    const nextFragment =
      patch.promptFragment === undefined
        ? cur.promptFragment
        : patch.promptFragment.trim() || undefined;
    machines[idx] = {
      ...cur,
      machineId: patch.machineId,
      type: patch.type ?? cur.type,
      promptFragment: nextFragment,
      fragmentSource:
        patch.fragmentSource ??
        (nextFragment === cur.promptFragment ? cur.fragmentSource : undefined),
      referenceShots: patch.referenceShots ?? cur.referenceShots,
    };
  }
  return { ...roster, machines };
}

export function removeMachine(roster: Roster, machineId: string): Roster {
  return { ...roster, machines: roster.machines.filter((m) => m.machineId !== machineId) };
}
