/**
 * Tenant reservations — a hold placed on a currently-free machine from Live status.
 *
 * Stored in `data/reservations.json` (git-ignored, runtime state). A reservation auto-expires
 * `holdMinutes` after it was placed; `activeReservations()` filters expired ones out on
 * read. `by` is an anonymous per-browser id (localStorage), not an authenticated user.
 *
 * `reserve()` / `release()` do an unlocked read-modify-write. That is acceptable here:
 * laundry-room request rates make a lost update or a slight fraction-cap overshoot rare and
 * self-correcting (holds expire), and reservations are advisory anyway (D-0007). A real
 * deployment would put this behind a single-writer store.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { config } from "@/config";

const ID_RE = /^[A-Za-z0-9_-]+$/;

export interface Reservation {
  machineId: string;
  by: string;
  at: string;
  expiresAt: string;
}

function file(): string {
  return join(config.paths.dataset, "reservations.json");
}

function readAll(path = file()): Reservation[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { reservations?: Reservation[] };
    return Array.isArray(raw.reservations) ? raw.reservations : [];
  } catch {
    return [];
  }
}

function writeAll(list: Reservation[], path = file()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ reservations: list }, null, 2) + "\n");
}

/** Reservations that have not yet expired. */
export function activeReservations(now = Date.now(), path = file()): Reservation[] {
  return readAll(path).filter((r) => Date.parse(r.expiresAt) > now);
}

/**
 * Place a hold. Caller has already checked the machine is `free` and the config allows it;
 * this enforces the id shape and the `expiresAt` window, and prunes expired rows.
 */
export function reserve(
  machineId: string,
  by: string,
  holdMinutes = config.reservation.holdMinutes,
  path = file(),
): Reservation {
  if (!ID_RE.test(machineId)) throw new Error("bad machineId");
  if (!ID_RE.test(by)) throw new Error("bad client id");
  const now = Date.now();
  const list = readAll(path).filter(
    (r) => Date.parse(r.expiresAt) > now && r.machineId !== machineId,
  );
  const res: Reservation = {
    machineId,
    by,
    at: new Date(now).toISOString(),
    expiresAt: new Date(now + holdMinutes * 60_000).toISOString(),
  };
  writeAll([...list, res], path);
  return res;
}

/**
 * Drop the hold on `machineId` if it belongs to `by`. Returns true if one was removed.
 * No route exposes this — deliberate: tenants cannot cancel a hold (D-0007). It stays as a
 * tested primitive for a future admin / expiry-sweep tool.
 */
export function release(machineId: string, by: string, path = file()): boolean {
  const list = readAll(path);
  const next = list.filter((r) => !(r.machineId === machineId && r.by === by));
  if (next.length === list.length) return false;
  writeAll(next, path);
  return true;
}
