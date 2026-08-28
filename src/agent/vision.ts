import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { VisionClient, VisionRequest, VisionResponse } from "./types";

/** Stable hash of the request's semantic content, used as the on-disk cache filename. */
export function requestHash(req: VisionRequest): string {
  const h = createHash("sha256");
  h.update(req.cacheKey);
  h.update("\0");
  h.update(req.prompt);
  h.update("\0");
  h.update(req.crop ? req.crop.join(",") : "full");
  h.update("\0");
  // include image bytes so a re-shot frame invalidates the entry
  if (existsSync(req.imagePath)) h.update(readFileSync(req.imagePath));
  return h.digest("hex").slice(0, 32);
}

/**
 * Wraps another client with a JSON file cache. In `replay` mode it never calls the inner
 * client — a cache miss throws, so a scored run reproduces with no API key and no cost.
 */
export class CachedVisionClient implements VisionClient {
  constructor(
    private readonly inner: VisionClient | null,
    private readonly cacheDir: string,
    private readonly replay = false,
  ) {
    mkdirSync(this.cacheDir, { recursive: true });
  }

  async analyze(req: VisionRequest): Promise<VisionResponse> {
    const path = join(this.cacheDir, `${requestHash(req)}.json`);
    if (existsSync(path)) {
      return { ...(JSON.parse(readFileSync(path, "utf8")) as VisionResponse), cached: true };
    }
    if (this.replay || !this.inner) {
      throw new Error(
        `vision cache miss in replay mode for "${req.cacheKey}" (${path}). ` +
          `Run without --replay once (with ANTHROPIC_API_KEY) to populate the cache.`,
      );
    }
    const res = await this.inner.analyze(req);
    writeFileSync(path, JSON.stringify(res, null, 2) + "\n");
    return res;
  }
}

/**
 * Deterministic offline client for wiring / tests. Returns a fixed response, or a
 * per-cacheKey override from the map. Never touches the network.
 */
export class FakeVisionClient implements VisionClient {
  constructor(private readonly responses: Map<string, string> = new Map()) {}

  async analyze(req: VisionRequest): Promise<VisionResponse> {
    const text =
      this.responses.get(req.cacheKey) ??
      JSON.stringify({ machines: [], note: "FakeVisionClient: no response configured" });
    return { text, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
}

// AnthropicVisionClient (real Claude vision call) is added when the baseline is wired for
// real — it needs @anthropic-ai/sdk and ANTHROPIC_API_KEY.
