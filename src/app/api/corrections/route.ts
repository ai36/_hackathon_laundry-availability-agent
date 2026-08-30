/**
 * Integrator correction write endpoint (D-0014 / D-0015 portal).
 *
 *   POST /api/corrections
 *     body: { frameId, machineId, correctState, scope?, note? }
 *     -> writes data/corrections/<frameId>.json and returns the fresh RoomStatus.
 *        When scope="machine" AND ANTHROPIC_API_KEY is set, it also runs the D-0014
 *        FEEDBACK LOOP: one vision call turns the correction + the model's own wrong
 *        rationale (from the committed baseline report) into a per-machine reading-rule,
 *        stored as that machine's `promptFragment` in data/machines.json. The next
 *        `/api/refresh` then classifies that machine (and its stack neighbours) with the
 *        rule — no override needed. Key-free, this step is skipped and the response says so.
 *        The learned rule is advisory (corrections stay authoritative) and revertible:
 *        `git checkout -- data/machines.json`, or edit / clear it in the Machines editor.
 *
 *   GET /api/corrections   -> { count, machineScope: [...] }
 *
 * Node runtime (writes files). Works under `npm run dev` and any self-hosted Node/Docker
 * host; not on a read-only serverless FS — see D-0016. The static build does not include a
 * live route, so the tenant-only Vercel mirror simply never calls it.
 *
 * TRUST BOUNDARY: this route has **no authentication** and writes into the repo. It is for
 * the integrator on a local / on-prem service only (D-0016), where the operator is trusted.
 * `writeCorrection` restricts `frameId` / `machineId` to `[A-Za-z0-9_-]+` so a body can't
 * path-traverse, but do not expose this route on a shared or public host without a gate.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { AnthropicVisionClient, CachedVisionClient } from "@/agent/vision";
import { loadCorrections, writeCorrection, type CorrectionInput } from "@/eval/corrections";
import { frameImagePath } from "@/eval/dataset";
import { synthesizeForCorrection, type BaselineReport } from "@/eval/prompt-synthesis";
import { loadRoster, upsertMachine, writeRoster } from "@/eval/roster";
import { buildRoomStatus } from "@/portal/room-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASELINE_REPORT = join("docs", "artifacts", "eval-baseline-2026-08-29.json");

export async function GET() {
  const c = loadCorrections();
  return NextResponse.json({
    count: c.count,
    machineScope: [...c.byMachine.values()].map((x) => ({
      machineId: x.machineId,
      correctState: x.correctState,
      note: x.note,
    })),
  });
}

/**
 * D-0014 feedback loop for a durable correction. Returns a small status object for the
 * response; never throws (a synthesis failure must not fail the correction write).
 */
async function runFeedbackLoop(
  frameId: string,
  machineId: string,
  correctState: CorrectionInput["correctState"],
  note?: string,
): Promise<Record<string, unknown>> {
  if (!process.env.ANTHROPIC_API_KEY) return { skipped: "no ANTHROPIC_API_KEY (offline)" };
  if (!existsSync(BASELINE_REPORT)) return { skipped: "baseline report not found" };
  try {
    const report = JSON.parse(readFileSync(BASELINE_REPORT, "utf8")) as BaselineReport;
    const roster = loadRoster();
    const machine = roster.machines.find((m) => m.machineId === machineId);
    const type = machine?.type ?? (machineId.startsWith("D") ? "dryer" : "washer");
    // Merge into a human-written rule only; a prior synthesis output is regenerated.
    const src = machine?.fragmentSource;
    const currentFragment =
      src === "synthesis" || src === "merged" ? undefined : machine?.promptFragment;

    const out = await synthesizeForCorrection({
      frameId,
      machineId,
      machineType: type,
      correctState,
      note,
      currentFragment,
      report,
      vision: new CachedVisionClient(new AnthropicVisionClient(), "data/cache/synthesis", false),
      imagePath: frameImagePath(frameId),
    });

    if (!out || !out.fragment) return { skipped: out?.reason ?? "no rule produced" };
    writeRoster(
      upsertMachine(roster, {
        machineId,
        type,
        promptFragment: out.fragment,
        fragmentSource: out.source,
      }),
    );
    return { machineId, fragment: out.fragment, source: out.source };
  } catch (err) {
    return { skipped: err instanceof Error ? err.message : "synthesis failed" };
  }
}

export async function POST(req: Request) {
  let body: Partial<CorrectionInput>;
  try {
    body = (await req.json()) as Partial<CorrectionInput>;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  let entry;
  try {
    entry = writeCorrection({
      frameId: String(body.frameId ?? ""),
      machineId: String(body.machineId ?? ""),
      correctState: body.correctState as CorrectionInput["correctState"],
      scope: body.scope,
      note: body.note,
      by: "integrator (portal)",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "write failed" },
      { status: 400 },
    );
  }

  // Durable corrections feed the D-0014 synthesis loop (key-gated; failures are non-fatal).
  // The loop's source frame is the request's frameId (the card the integrator was on).
  const synthesized =
    entry.scope === "machine"
      ? await runFeedbackLoop(
          String(body.frameId ?? ""),
          entry.machineId,
          entry.correctState,
          entry.note,
        )
      : undefined;

  return NextResponse.json({
    ok: true,
    correction: entry,
    room: buildRoomStatus(),
    ...(synthesized ? { synthesized } : {}),
  });
}
