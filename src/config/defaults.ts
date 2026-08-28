import type { Laundry3Config } from "./types";

/**
 * Default deployment configuration. `laundry3.config.ts` overrides only what it needs;
 * everything else comes from here. Keep these values sane for a mid-size shared laundry
 * room (roughly 20–40 machines).
 */
export const DEFAULT_CONFIG: Laundry3Config = {
  site: {
    name: "laundry3 dev site",
    timezone: "America/Los_Angeles",
    machines: {
      washers: 12,
      dryers: 12,
    },
  },
  reservation: {
    // Off until the reservation simulation is built (P2); default reflects product intent.
    enabled: false,
    holdMinutes: 5,
    maxActivePerUser: 1,
    maxReservedFractionOfFree: 0.5,
    reconcileOnExpiry: true,
  },
  agent: {
    visionModel: "claude-haiku-4-5",
    maxVisionCallsPerFrame: 8,
    abstainWhenUncertain: true,
    verification: {
      enabled: true,
      confidenceThreshold: 0.7,
    },
    changeDetection: {
      enabled: false,
      minChangedFraction: 0.02,
    },
  },
  runtime: {
    stateRefreshSeconds: 30,
    staleAfterSeconds: 120,
  },
  cycles: {
    defaultWashMinutes: 35,
    defaultDryMinutes: 50,
  },
  portal: {
    showConfidence: true,
    confirmOnArrivalNotice: true,
  },
  paths: {
    siteConfig: "data/site-config.json",
    dataset: "data",
    cache: "data/cache",
  },
};
