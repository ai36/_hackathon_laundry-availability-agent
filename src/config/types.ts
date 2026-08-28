/**
 * laundry3 deployment configuration.
 *
 * These are the human-editable knobs for adapting the system to a real site. They are
 * separate from the per-site *calibration* config (`paths.siteConfig`), which is generated
 * by the calibration agent (per-machine ROIs, reference crops, thresholds) and is not
 * meant to be hand-edited.
 *
 * Edit values in `laundry3.config.ts` (repo root) or in a git-ignored
 * `laundry3.config.local.ts`. Every field has a default in `src/config/defaults.ts`;
 * anything you omit falls back to that default. The merged result is validated on load.
 */
export interface Laundry3Config {
  site: {
    /** Human-readable label for this deployment, shown in logs and on the portal. */
    name: string;
    /** IANA time zone for timestamps shown to tenants, e.g. "America/Los_Angeles". */
    timezone: string;
    /**
     * Declared machine roster by type. The authoritative roster (ids, exact types,
     * positions) comes from the calibration site-config; these counts are a sanity check —
     * load warns if the totals disagree. At least one machine total must be > 0.
     */
    machines: {
      washers: number;
      dryers: number;
    };
  };

  reservation: {
    /** Master switch for the reservation feature (P2). When false, the portal is read-only. */
    enabled: boolean;
    /** Minutes a reservation holds a free machine before it auto-expires. */
    holdMinutes: number;
    /** How many reservations one tenant may hold at the same time. */
    maxActivePerUser: number;
    /**
     * Upper bound on how much of the currently-free capacity may be reserved at once,
     * as a fraction 0..1. Prevents one or a few users reserving every free machine.
     */
    maxReservedFractionOfFree: number;
    /** When a hold ends, re-derive the machine's real state from the camera before releasing. */
    reconcileOnExpiry: boolean;
  };

  agent: {
    /** Claude vision model id used for frame/ROI analysis. */
    visionModel: string;
    /** Hard cap on vision API calls per processed frame (cost guard). */
    maxVisionCallsPerFrame: number;
    /** When the evidence is insufficient, emit `unknown` instead of guessing a state. */
    abstainWhenUncertain: boolean;
    verification: {
      /** Run a second-pass check on low-confidence machines before publishing. */
      enabled: boolean;
      /** Confidence 0..1 below which the verification pass is triggered. */
      confidenceThreshold: number;
    };
    changeDetection: {
      /** P1: skip re-analysing a machine ROI that has not visibly changed since last frame. */
      enabled: boolean;
      /** Minimum changed fraction 0..1 of an ROI to count as "changed". */
      minChangedFraction: number;
    };
  };

  runtime: {
    /** How often (seconds) the runtime re-derives machine state from new frames. */
    stateRefreshSeconds: number;
    /** Portal marks a machine's status "stale" once it is older than this (seconds). */
    staleAfterSeconds: number;
  };

  cycles: {
    /** P1: fallback wash-cycle length (minutes) for "free in ~X min" when unknown. */
    defaultWashMinutes: number;
    /** P1: fallback dry-cycle length (minutes). */
    defaultDryMinutes: number;
  };

  portal: {
    /** Show a per-machine confidence indicator to tenants. */
    showConfidence: boolean;
    /** Show a "confirm on arrival" caveat next to free/unknown machines. */
    confirmOnArrivalNotice: boolean;
  };

  paths: {
    /** Calibration output: per-machine ROIs, reference crops, thresholds. */
    siteConfig: string;
    /** Dataset root (frames + labels + splits). */
    dataset: string;
    /** Cached model responses + agent trajectories, used by `--replay`. */
    cache: string;
  };
}

/** Recursive partial — the shape accepted from `laundry3.config.ts`. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
