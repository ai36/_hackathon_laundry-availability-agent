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
      washers: 12,
      dryers: 12,
    },
  },
  reservation: {
    enabled: false, // flip on once the reservation simulation (P2) is built
    holdMinutes: 5,
    maxActivePerUser: 1,
    maxReservedFractionOfFree: 0.5,
  },
});
