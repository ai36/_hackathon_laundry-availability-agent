import { defineConfig } from "./src/config/define";

/**
 * laundry3 deployment configuration — the knobs for adapting the system to a real site.
 *
 * Override only what differs from the defaults; see `src/config/defaults.ts` for every
 * default value and `docs/CONFIGURATION.md` for what each setting does. The merged config
 * is validated on load (`src/config/load.ts`).
 *
 * For private, per-machine overrides that should not be committed, create
 * `laundry3.config.local.ts` (git-ignored) with the same shape and import it here.
 */
export default defineConfig({
  site: {
    name: "laundry3 dev site",
    timezone: "America/Los_Angeles",
    machines: {
      washers: 16,
      dryers: 16,
    },
  },
  agent: {
    // claude-haiku-4-5 ($1/$5 per MTok). The naive baseline holds up well on it; the judge's
    // reproduction path is --replay (cache only, no key, no cost), so the model choice only
    // bills a fresh --live run.
    visionModel: "claude-haiku-4-5",
  },
  reservation: {
    enabled: true, // tenants can hold a free machine on the Live view (P2, D-0007)
    holdMinutes: 5, // a hold auto-lapses after this; there is no cancel
    maxActivePerUser: 2, // simultaneous holds per tenant; UI + API both enforce this
    maxReservedFractionOfFree: 0.5,
  },
});
