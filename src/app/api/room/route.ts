/**
 * Current room status (D-0015 portal — "refresh recognition").
 *
 *   GET /api/room  ->  RoomStatus
 *
 * Re-reads the committed eval report and re-fuses it with `data/corrections/`. In P0 (frozen
 * dataset) this is a cheap re-fusion — it picks up any correction change without an API call.
 * In the D-0016 container this route is where a real re-capture + re-classify would hang.
 *
 * Node runtime (reads files under the repo). Not needed by the static `/` route.
 */
import { NextResponse } from "next/server";

import { buildRoomStatus } from "@/portal/room-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, room: buildRoomStatus() });
}
