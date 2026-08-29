/**
 * GET /api/config  ->  { ok, config, overridden }
 *
 * Read-only view of the resolved deployment config — `src/config/defaults.ts` with
 * `laundry3.config.ts` merged on top and validated on load. Surfaced in the Settings page.
 *
 * Not writable from the portal on purpose: these knobs also drive the offline eval
 * (`src/agent/*`, `src/eval/*`), so they stay in one hand-edited place. `overridden` lists
 * the dotted paths whose value differs from the built-in default.
 *
 * TRUST BOUNDARY: no authentication; integrator-only local / on-prem service (D-0016).
 * Read-only — GET only, no params, no filesystem access, no write path. It returns nothing
 * not already in committed source (`src/config/defaults.ts` + `laundry3.config.ts`); no
 * secrets are in `Laundry3Config`. Do not expose this route on a shared or public host
 * without a gate.
 */
import { NextResponse } from "next/server";

import { config, DEFAULT_CONFIG, type Laundry3Config } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function diffPaths(a: unknown, b: unknown, prefix = ""): string[] {
  if (a && b && typeof a === "object" && !Array.isArray(a)) {
    return Object.keys(a as Record<string, unknown>).flatMap((k) =>
      diffPaths(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        prefix ? `${prefix}.${k}` : k,
      ),
    );
  }
  return a === b ? [] : [prefix];
}

export function GET() {
  return NextResponse.json({
    ok: true,
    config: config as Laundry3Config,
    overridden: diffPaths(config, DEFAULT_CONFIG),
  });
}
