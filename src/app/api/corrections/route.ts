/**
 * Integrator correction write endpoint (D-0014 / D-0015 portal).
 *
 *   POST /api/corrections
 *     body: { frameId, machineId, correctState, scope?, note? }
 *     -> writes data/corrections/<frameId>.json and returns the fresh RoomStatus
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
import { NextResponse } from "next/server";

import { loadCorrections, writeCorrection, type CorrectionInput } from "@/eval/corrections";
import { buildRoomStatus } from "@/portal/room-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  let body: Partial<CorrectionInput>;
  try {
    body = (await req.json()) as Partial<CorrectionInput>;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  try {
    const entry = writeCorrection({
      frameId: String(body.frameId ?? ""),
      machineId: String(body.machineId ?? ""),
      correctState: body.correctState as CorrectionInput["correctState"],
      scope: body.scope,
      note: body.note,
      by: "integrator (portal)",
    });
    return NextResponse.json({ ok: true, correction: entry, room: buildRoomStatus() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "write failed" },
      { status: 400 },
    );
  }
}
