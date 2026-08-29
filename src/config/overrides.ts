/**
 * Portal-editable config layer.
 *
 * The integrator edits deployment knobs from `/integrator/settings`; the portal PATCHes the
 * full non-`paths` config, which is validated and written to `data/config-overrides.json` —
 * **git-ignored**, a local runtime layer.
 *
 * IMPORTANT: this file is NOT read by the offline eval. `src/agent/*` and `src/eval/*`
 * import the static `config` singleton (`resolved.ts` = defaults + `laundry3.config.ts`),
 * which the overrides file never touches. The submitted eval config stays hand-edited in
 * `laundry3.config.ts`. `resolvePortalConfig()` is only for portal-runtime consumers.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import userConfig from "../../laundry3.config";

import { DEFAULT_CONFIG } from "./defaults";
import { deepMerge, loadConfig } from "./load";
import type { DeepPartial, Laundry3Config } from "./types";

export const OVERRIDES_FILE = join(process.cwd(), "data", "config-overrides.json");

/**
 * Read-only in the portal (indicative display only). `paths.*` is structural; the machine
 * roster is managed in the Machines editor, so `site.machines.*` here is just a sanity-check
 * count. The `PATCH` route strips these before persisting.
 */
export const LOCKED_PREFIXES = ["paths.", "site.machines."];

export function readOverrides(file = OVERRIDES_FILE): DeepPartial<Laundry3Config> {
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as DeepPartial<Laundry3Config>)
      : {};
  } catch {
    return {};
  }
}

/** defaults + `laundry3.config.ts` + `data/config-overrides.json`, merged and validated. */
export function resolvePortalConfig(): Laundry3Config {
  return loadConfig(deepMerge(userConfig as DeepPartial<Laundry3Config>, readOverrides()));
}

/** Drop every `LOCKED_PREFIXES` key from `patch` (e.g. `paths.`, `site.machines.`). */
function stripLocked(patch: DeepPartial<Laundry3Config>): DeepPartial<Laundry3Config> {
  const out = structuredClone(patch) as Record<string, unknown>;
  for (const prefix of LOCKED_PREFIXES) {
    const keys = prefix.replace(/\.$/, "").split(".");
    let cur: Record<string, unknown> | undefined = out;
    for (let i = 0; i < keys.length - 1 && cur; i++) {
      cur = cur[keys[i]] as Record<string, unknown> | undefined;
    }
    if (cur) delete cur[keys[keys.length - 1]];
  }
  return out as DeepPartial<Laundry3Config>;
}

/**
 * Strip `paths.*` (server-enforced, not just UI), validate the resulting merge, then persist
 * the patch as the overrides file. The portal PATCHes the full non-`paths` config; storing
 * it whole (rather than a diff) keeps the merge deterministic. Throws `ConfigError` if the
 * merged result is invalid — nothing is written in that case.
 */
export function writeOverrides(
  patch: DeepPartial<Laundry3Config>,
  file = OVERRIDES_FILE,
): Laundry3Config {
  const safe = stripLocked(patch);
  const resolved = loadConfig(deepMerge(userConfig as DeepPartial<Laundry3Config>, safe));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(safe, null, 2) + "\n");
  return resolved;
}

/** Dotted paths whose value in `cfg` differs from `DEFAULT_CONFIG`. */
export function overriddenPaths(cfg: Laundry3Config): string[] {
  const walk = (a: unknown, b: unknown, prefix = ""): string[] => {
    if (a && b && typeof a === "object" && !Array.isArray(a)) {
      return Object.keys(a as Record<string, unknown>).flatMap((k) =>
        walk(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
          prefix ? `${prefix}.${k}` : k,
        ),
      );
    }
    return a === b ? [] : [prefix];
  };
  return walk(cfg, DEFAULT_CONFIG);
}
