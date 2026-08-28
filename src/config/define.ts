import type { DeepPartial, Laundry3Config } from "./types";

/**
 * Identity helper that gives `laundry3.config.ts` full type-checking and editor hints
 * without pulling in the loader (keeps that file dependency-light and cycle-free).
 */
export function defineConfig(config: DeepPartial<Laundry3Config>): DeepPartial<Laundry3Config> {
  return config;
}
