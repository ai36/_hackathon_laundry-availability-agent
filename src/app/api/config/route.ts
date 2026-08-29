/**
 * Deployment config for the integrator console.
 *
 *   GET   /api/config              -> { ok, config, defaults, base, overridden, fromFile, locked }
 *   PATCH /api/config  <patch>     -> { ok, config, overridden, fromFile }   (400 on bad merge)
 *
 * `overridden` = paths differing from the built-in `DEFAULT_CONFIG`. `fromFile` = paths the
 * portal has changed *from `laundry3.config.ts`* — i.e. what lives only in the git-ignored
 * `data/config-overrides.json`, not the committed source.
 *
 * `config` is `src/config/defaults.ts` + `laundry3.config.ts` + `data/config-overrides.json`
 * (the last written by PATCH), merged and validated on every request. `patch` is a nested
 * `DeepPartial<Laundry3Config>` — the portal sends the full non-`paths` config; the route
 * strips `paths.*`, validates the merge, and stores the rest verbatim as the overrides file.
 *
 * SCOPE: this only affects the **portal runtime**. The offline eval (`src/agent/*`,
 * `src/eval/*`) imports the static `config` singleton and never reads the overrides file —
 * the submitted eval config stays hand-edited in `laundry3.config.ts`.
 *
 * TRUST BOUNDARY: no authentication; integrator-only local / on-prem service (D-0016). The
 * overrides file is git-ignored. `Laundry3Config` has no credential fields. Do not expose
 * this route on a shared or public host without a gate.
 */
import { NextResponse } from "next/server";

import {
  DEFAULT_CONFIG,
  LOCKED_PREFIXES,
  baseConfig,
  overriddenPaths,
  overrideFilePaths,
  resolvePortalConfig,
  writeOverrides,
  type DeepPartial,
  type Laundry3Config,
} from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const config = resolvePortalConfig();
  return NextResponse.json({
    ok: true,
    config,
    defaults: DEFAULT_CONFIG,
    base: baseConfig(),
    overridden: overriddenPaths(config),
    fromFile: overrideFilePaths(),
    locked: LOCKED_PREFIXES,
  });
}

export async function PATCH(req: Request) {
  let patch: DeepPartial<Laundry3Config>;
  try {
    patch = (await req.json()) as DeepPartial<Laundry3Config>;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  try {
    const config = writeOverrides(patch);
    return NextResponse.json({
      ok: true,
      config,
      overridden: overriddenPaths(config),
      fromFile: overrideFilePaths(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid config" },
      { status: 400 },
    );
  }
}
