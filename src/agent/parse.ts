import type { MachineState } from "@/eval/types";

import type { MachineAssessment } from "./types";

/**
 * Pull a machine-state list out of a vision model's reply. Tolerant of prose around a JSON
 * block. Expected JSON shape:
 *   { "machines": [ { "machineId": "W-03", "state": "occupied", "confidence": 0.9,
 *                     "rationale": "door closed, drum light on" } ] }
 * Unknown / missing fields degrade to a safe default (state "unknown", confidence 0).
 */
export function parseAssessments(text: string): MachineAssessment[] {
  const json = extractJsonObject(text);
  if (!json || !Array.isArray((json as { machines?: unknown }).machines)) return [];
  const rows = (json as { machines: unknown[] }).machines;
  const out: MachineAssessment[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.machineId !== "string") continue;
    out.push({
      machineId: r.machineId,
      state: coerceState(r.state),
      confidence: coerceConfidence(r.confidence),
      rationale: typeof r.rationale === "string" ? r.rationale : "",
    });
  }
  return out;
}

function coerceState(v: unknown): MachineState {
  return v === "free" || v === "occupied" ? v : "unknown";
}

function coerceConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** First balanced `{...}` block that parses as JSON, else null. */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return null;
  for (let end = text.lastIndexOf("}"); end > start; end = text.lastIndexOf("}", end - 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // keep shrinking
    }
  }
  return null;
}
