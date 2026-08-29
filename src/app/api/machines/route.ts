/**
 * Machine roster CRUD (D-0015 integrator console).
 *
 *   GET    /api/machines                      -> { ok, machines }
 *   POST   /api/machines  { machineId, type, promptFragment? }        add
 *   PATCH  /api/machines  { machineId, targetId?, type?, promptFragment? }   edit (targetId = old id when renaming)
 *   DELETE /api/machines  { machineId }                               remove
 *
 * Writes data/machines.json (a fixed path — never a machineId-derived path). Node runtime;
 * works under `npm run dev` / any self-hosted Node/Docker host, not a read-only serverless FS.
 *
 * TRUST BOUNDARY: this route has **no authentication** and writes into the repo. It is for
 * the integrator on a local / on-prem service only (D-0016), where the operator is trusted.
 * `machineId` is restricted to `[A-Za-z0-9_-]+`, but do not expose this route on a shared or
 * public host without a gate.
 */
import { NextResponse } from "next/server";

import {
  loadRoster,
  removeMachine,
  upsertMachine,
  writeRoster,
  MACHINE_ID_RE,
  type RosterMachine,
} from "@/eval/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = Partial<RosterMachine> & { machineId?: string; targetId?: string };

async function readBody(req: Request): Promise<Body> {
  try {
    return (await req.json()) as Body;
  } catch {
    throw new Error("body must be JSON");
  }
}

export function GET() {
  return NextResponse.json({ ok: true, machines: loadRoster().machines });
}

export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    if (!MACHINE_ID_RE.test(b.machineId ?? ""))
      throw new Error("machineId must match [A-Za-z0-9_-]+");
    const roster = loadRoster();
    if (roster.machines.some((m) => m.machineId === b.machineId)) {
      return NextResponse.json({ error: `${b.machineId} already exists` }, { status: 409 });
    }
    const next = writeRoster(
      upsertMachine(roster, {
        machineId: b.machineId!,
        type: b.type ?? "washer",
        promptFragment: b.promptFragment,
      }),
    );
    return NextResponse.json({ ok: true, machines: next.machines });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await readBody(req);
    if (!MACHINE_ID_RE.test(b.machineId ?? ""))
      throw new Error("machineId must match [A-Za-z0-9_-]+");
    const roster = loadRoster();
    const targetId = b.targetId ?? b.machineId!;
    if (!roster.machines.some((m) => m.machineId === targetId)) {
      return NextResponse.json({ error: `${targetId} not found` }, { status: 404 });
    }
    if (b.machineId !== targetId && roster.machines.some((m) => m.machineId === b.machineId)) {
      return NextResponse.json({ error: `${b.machineId} already exists` }, { status: 409 });
    }
    const next = writeRoster(
      upsertMachine(roster, {
        machineId: b.machineId!,
        targetId,
        type: b.type,
        promptFragment: b.promptFragment,
      }),
    );
    return NextResponse.json({ ok: true, machines: next.machines });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await readBody(req);
    const roster = loadRoster();
    if (!roster.machines.some((m) => m.machineId === b.machineId)) {
      return NextResponse.json({ error: `${b.machineId} not found` }, { status: 404 });
    }
    const next = writeRoster(removeMachine(roster, b.machineId!));
    return NextResponse.json({ ok: true, machines: next.machines });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 400 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "request failed";
}
