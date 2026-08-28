import userConfig from "../../laundry3.config";

import { loadConfig } from "./load";

/**
 * The resolved, validated deployment config: defaults with `laundry3.config.ts` merged on
 * top. Import this everywhere (`import { config } from "@/config"`), never the raw defaults.
 */
export const config = loadConfig(userConfig);
