import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";
import { correctionFor, loadCorrections } from "@/eval/corrections";
import { loadRoster } from "@/eval/roster";
import type { MachineState, MachineType } from "@/eval/types";
import type { Reservation } from "@/portal/reservations";

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
  /** true when an integrator correction (D-0014) set this state, not the model. */
  corrected?: boolean;
  /** the correction's scope + note, when `corrected`. */
  correction?: { scope: "observation" | "machine"; note?: string };
  /** a tenant has this free machine on hold — `reservedUntil` ISO, `reservedBy` client id. */
  reserved?: boolean;
  reservedUntil?: string;
  reservedBy?: string;
}

export interface RoomStatus {
  machines: MachineView[];
  /** Model + run the statuses came from. */
  provenance: { model: string; mode: string; report: string; corrections: number };
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

const ACTIONABLE: MachineState[] = ["free", "occupied", "out_of_order"];

/**
 * Build the room view from a committed eval report — no API calls. Every machine in the
 * **roster** gets a card; for those a camera sees, pick the most confident *actionable*
 * observation across all frames (falling back to the most confident `unknown`); a machine
 * no camera covers stays `unknown` with `seenIn: 0`. Then overlay integrator corrections
 * (D-0014): a `machine`-scope correction wins outright; an `observation`-scope one wins when
 * it targets the frame the shown state came from.
 */
export function buildRoomStatus(
  reportPath = join("docs", "artifacts", "eval-baseline-2026-08-29.json"),
  rosterPath = join(config.paths.dataset, "machines.json"),
  correctionsDir = join(config.paths.dataset, "corrections"),
  reservations: Reservation[] = [],
): RoomStatus {
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Report;
  const roster = loadRoster(rosterPath);
  const corrections = loadCorrections(correctionsDir);

  const obs = new Map<string, { frameId: string; state: MachineState; confidence: number }[]>();
  for (const [frameId, pred] of Object.entries(report.predictions)) {
    for (const m of pred.machines) {
      const list = obs.get(m.machineId) ?? [];
      list.push({ frameId, state: m.state, confidence: m.confidence });
      obs.set(m.machineId, list);
    }
  }

  // One card per roster machine — including ones no mock camera happens to cover.
  const machines: MachineView[] = roster.machines.map(({ machineId, type }) => {
    const list = obs.get(machineId) ?? [];
    const pick =
      [...list]
        .filter((o) => ACTIONABLE.includes(o.state))
        .sort((a, b) => b.confidence - a.confidence)[0] ??
      [...list].sort((a, b) => b.confidence - a.confidence)[0];

    const view: MachineView = pick
      ? {
          machineId,
          type,
          state: pick.state,
          confidence: pick.confidence,
          source: pick.frameId,
          seenIn: list.length,
        }
      : { machineId, type, state: "unknown", confidence: 0, source: "—", seenIn: 0 };

    const c = correctionFor(corrections, view.source, machineId);
    if (c) {
      view.state = c.correctState;
      view.confidence = 1;
      view.corrected = true;
      view.correction = { scope: c.scope, note: c.note };
    }

    // A hold only applies to a machine the room still shows as free — and it then reads as
    // `occupied` to everyone (D-0007). `reservedBy` lets the owner's client show a badge.
    if (!view.corrected && view.state === "free") {
      const held = reservations.find((r) => r.machineId === machineId);
      if (held) {
        view.state = "occupied";
        view.reserved = true;
        view.reservedUntil = held.expiresAt;
        view.reservedBy = held.by;
      }
    }
    return view;
  });
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
      corrections: machines.filter((m) => m.corrected).length,
    },
  };
}
