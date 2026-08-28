import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";
import type { MachineState, MachineType } from "@/eval/types";

/** One machine as the portal shows it, fused across every camera angle that sees it. */
export interface MachineView {
  machineId: string;
  type: MachineType;
  state: MachineState;
  /** 0..1 confidence of the observation this state came from. */
  confidence: number;
  /** frameId the shown state came from, and how many frames saw this machine. */
  source: string;
  seenIn: number;
}

export interface RoomStatus {
  machines: MachineView[];
  /** Model + run the statuses came from. */
  provenance: { model: string; mode: string; report: string };
  counts: Record<MachineState, number>;
}

type Report = {
  model?: string;
  mode?: string;
  predictions: Record<
    string,
    { machines: { machineId: string; state: MachineState; confidence: number }[] }
  >;
};
type Roster = { machines: { machineId: string; type: MachineType }[] };

const ACTIONABLE: MachineState[] = ["free", "occupied", "out_of_order"];

/**
 * Build the room view from a committed eval report — no API calls. For each machine in the
 * roster, pick the most confident *actionable* observation across all frames; fall back to
 * the most confident `unknown` if that's all there is.
 */
export function buildRoomStatus(
  reportPath = join("docs", "artifacts", "eval-agent-2026-08-28.json"),
  rosterPath = join(config.paths.dataset, "machines.json"),
): RoomStatus {
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
  const roster = JSON.parse(readFileSync(rosterPath, "utf8")) as Roster;
  const typeOf = new Map(roster.machines.map((m) => [m.machineId, m.type]));

  const obs = new Map<string, { frameId: string; state: MachineState; confidence: number }[]>();
  for (const [frameId, pred] of Object.entries(report.predictions)) {
    for (const m of pred.machines) {
      const list = obs.get(m.machineId) ?? [];
      list.push({ frameId, state: m.state, confidence: m.confidence });
      obs.set(m.machineId, list);
    }
  }

  const machines: MachineView[] = [];
  for (const [machineId, list] of obs) {
    const pick =
      [...list]
        .filter((o) => ACTIONABLE.includes(o.state))
        .sort((a, b) => b.confidence - a.confidence)[0] ??
      [...list].sort((a, b) => b.confidence - a.confidence)[0];
    machines.push({
      machineId,
      type: typeOf.get(machineId) ?? (machineId.startsWith("W-") ? "washer" : "dryer"),
      state: pick.state,
      confidence: pick.confidence,
      source: pick.frameId,
      seenIn: list.length,
    });
  }
  machines.sort((a, b) => a.machineId.localeCompare(b.machineId));

  const counts: Record<MachineState, number> = {
    free: 0,
    occupied: 0,
    unknown: 0,
    out_of_order: 0,
  };
  for (const m of machines) counts[m.state]++;

  return {
    machines,
    counts,
    provenance: {
      model: report.model ?? "unknown",
      mode: report.mode ?? "agent",
      report: reportPath.replace(/\\/g, "/"),
    },
  };
}
