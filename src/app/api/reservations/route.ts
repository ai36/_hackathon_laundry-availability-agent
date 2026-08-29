/**
 * Tenant reservations (Live status).
 *
 *   GET    /api/reservations                    -> { ok, reservations }
 *   POST   /api/reservations  { machineId, by } -> { ok, room }   | 403 / 409 / 400
 *   DELETE /api/reservations  { machineId, by } -> { ok, room }
 *
 * A hold on a currently-free machine, auto-expiring after `reservation.holdMinutes`. Guards:
 * the feature must be enabled in the config, the machine must be `free` (not corrected, not
 * already held), and per-`by` / global fraction caps apply. `by` is an anonymous per-browser
 * id, not an authenticated user.
 *
 * TRUST BOUNDARY: no authentication; local / on-prem service (D-0016). `data/reservations.json`
 * is git-ignored. Do not expose this route on a shared or public host without a gate.
 */
import { NextResponse } from "next/server";

import { resolvePortalConfig } from "@/config";
import { buildRoomStatus } from "@/portal/room-status";
import { activeReservations, release, reserve } from "@/portal/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]+$/;

function room() {
  return buildRoomStatus(undefined, undefined, undefined, activeReservations());
}

export function GET() {
  return NextResponse.json({ ok: true, reservations: activeReservations() });
}

export async function POST(req: Request) {
  const cfg = resolvePortalConfig().reservation;
  if (!cfg.enabled) {
    return NextResponse.json({ error: "reservations are turned off" }, { status: 403 });
  }
  let b: { machineId?: string; by?: string };
  try {
    b = (await req.json()) as { machineId?: string; by?: string };
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const { machineId = "", by = "" } = b;
  if (!ID_RE.test(machineId) || !ID_RE.test(by)) {
    return NextResponse.json({ error: "bad machineId or client id" }, { status: 400 });
  }

  const before = buildRoomStatus(undefined, undefined, undefined, activeReservations());
  const target = before.machines.find((m) => m.machineId === machineId);
  if (!target || target.state !== "free" || target.corrected) {
    return NextResponse.json({ error: `${machineId} is not free` }, { status: 409 });
  }
  if (target.reserved) {
    return NextResponse.json({ error: `${machineId} is already reserved` }, { status: 409 });
  }

  const active = activeReservations();
  if (active.filter((r) => r.by === by).length >= cfg.maxActivePerUser) {
    return NextResponse.json(
      { error: `you can hold at most ${cfg.maxActivePerUser} machine(s) at a time` },
      { status: 409 },
    );
  }
  const freeCount = before.machines.filter((m) => m.state === "free").length;
  const cap = Math.max(1, Math.floor(freeCount * cfg.maxReservedFractionOfFree));
  if (active.length >= cap) {
    return NextResponse.json(
      { error: "too many machines are reserved right now — try again shortly" },
      { status: 409 },
    );
  }

  reserve(machineId, by, cfg.holdMinutes);
  return NextResponse.json({ ok: true, room: room() });
}

export async function DELETE(req: Request) {
  let b: { machineId?: string; by?: string };
  try {
    b = (await req.json()) as { machineId?: string; by?: string };
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const { machineId = "", by = "" } = b;
  if (!ID_RE.test(machineId) || !ID_RE.test(by)) {
    return NextResponse.json({ error: "bad machineId or client id" }, { status: 400 });
  }
  release(machineId, by);
  return NextResponse.json({ ok: true, room: room() });
}
