export type { Laundry3Config, DeepPartial } from "./types";
export { DEFAULT_CONFIG } from "./defaults";
export { defineConfig } from "./define";
export { loadConfig, validateConfig, ConfigError } from "./load";
export { config } from "./resolved";
export {
  resolvePortalConfig,
  readOverrides,
  writeOverrides,
  overriddenPaths,
  OVERRIDES_FILE,
  LOCKED_PREFIXES,
} from "./overrides";
