import { DEFAULT_CONFIG } from "./defaults";
import type { DeepPartial, Laundry3Config } from "./types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge `override` onto `base`, returning a new object. Arrays are replaced, not merged. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = deepMerge((base as Record<string, unknown>)[key], value);
  }
  return out as T;
}

class ConfigError extends Error {
  constructor(message: string) {
    super(`laundry3 config: ${message}`);
    this.name = "ConfigError";
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new ConfigError(message);
}

function isFraction(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** Throws ConfigError on the first invalid field. */
export function validateConfig(c: Laundry3Config): void {
  assert(c.site.name.trim().length > 0, "site.name must not be empty");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: c.site.timezone });
  } catch {
    throw new ConfigError(`site.timezone is not a valid IANA zone: "${c.site.timezone}"`);
  }
  const { washers, dryers } = c.site.machines;
  assert(
    Number.isInteger(washers) && washers >= 0 && Number.isInteger(dryers) && dryers >= 0,
    "site.machines.washers and site.machines.dryers must be non-negative integers",
  );
  assert(washers + dryers > 0, "site.machines must total at least 1 machine");

  assert(isPositive(c.reservation.holdMinutes), "reservation.holdMinutes must be > 0");
  assert(
    Number.isInteger(c.reservation.maxActivePerUser) && c.reservation.maxActivePerUser >= 1,
    "reservation.maxActivePerUser must be an integer >= 1",
  );
  assert(
    isFraction(c.reservation.maxReservedFractionOfFree),
    "reservation.maxReservedFractionOfFree must be between 0 and 1",
  );

  assert(c.agent.visionModel.trim().length > 0, "agent.visionModel must not be empty");
  assert(
    Number.isInteger(c.agent.maxVisionCallsPerFrame) && c.agent.maxVisionCallsPerFrame >= 1,
    "agent.maxVisionCallsPerFrame must be an integer >= 1",
  );
  assert(
    isFraction(c.agent.verification.confidenceThreshold),
    "agent.verification.confidenceThreshold must be between 0 and 1",
  );
  assert(
    isFraction(c.agent.changeDetection.minChangedFraction),
    "agent.changeDetection.minChangedFraction must be between 0 and 1",
  );

  assert(
    Number.isInteger(c.frames.maxStillPx) && c.frames.maxStillPx >= 64,
    "frames.maxStillPx must be an integer >= 64",
  );
  assert(
    Number.isInteger(c.frames.maxVideoPx) && c.frames.maxVideoPx >= 64,
    "frames.maxVideoPx must be an integer >= 64",
  );
  assert(isPositive(c.frames.videoFps), "frames.videoFps must be > 0");

  assert(isPositive(c.runtime.stateRefreshSeconds), "runtime.stateRefreshSeconds must be > 0");
  assert(isPositive(c.runtime.staleAfterSeconds), "runtime.staleAfterSeconds must be > 0");
  assert(
    c.runtime.staleAfterSeconds >= c.runtime.stateRefreshSeconds,
    "runtime.staleAfterSeconds should be >= runtime.stateRefreshSeconds",
  );

  assert(isPositive(c.cycles.defaultWashMinutes), "cycles.defaultWashMinutes must be > 0");
  assert(isPositive(c.cycles.defaultDryMinutes), "cycles.defaultDryMinutes must be > 0");

  for (const key of ["siteConfig", "dataset", "cache"] as const) {
    assert(c.paths[key].trim().length > 0, `paths.${key} must not be empty`);
  }
}

/** Merge user overrides onto the defaults and validate. Throws ConfigError if invalid. */
export function loadConfig(overrides: DeepPartial<Laundry3Config> = {}): Laundry3Config {
  const merged = deepMerge(DEFAULT_CONFIG, overrides);
  validateConfig(merged);
  return merged;
}

export { ConfigError };
