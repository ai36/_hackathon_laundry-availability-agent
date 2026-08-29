import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import { config } from "@/config";

import type { VisionClient, VisionRequest, VisionResponse } from "./types";

/**
 * Stable hash of the request's *semantic* content, used as the on-disk cache filename.
 * Deliberately does NOT read the image bytes: `--replay` must resolve from a clean checkout
 * where `data/public/frames/` is absent (held out pending redaction). `cacheKey` already
 * encodes the frame id + machine list, so a re-run with the same inputs hits the same file.
 */
export function requestHash(req: VisionRequest): string {
  const h = createHash("sha256");
  h.update(req.cacheKey);
  h.update("\0");
  h.update(req.prompt);
  h.update("\0");
  h.update(req.crop ? req.crop.join(",") : "full");
  // Only extend the hash when there ARE extra reference images, so requests that don't use
  // them (every eval request) keep the exact filename their cache was written under.
  if (req.extraImagePaths?.length) {
    h.update("\0refs\0");
    h.update(req.extraImagePaths.join(","));
  }
  return h.digest("hex").slice(0, 32);
}

/** Anthropic image media type from a file extension; defaults to JPEG. */
function imageMediaType(path: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  const ext = path.toLowerCase().slice(path.lastIndexOf("."));
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
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
    return { text, model: "fake", inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
}

/**
 * $ per 1M tokens (input, output) — first-party Anthropic API rates as of 2026-08-28
 * (source: the `claude-api` skill's model table). Keep current; `costUsd` is `undefined`
 * for a model not listed here.
 */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-fable-5": { input: 10, output: 50 },
};

/**
 * Real Claude vision call. Sends the frame (JPEG, base64) plus the prompt and returns the
 * raw reply text. Credentials come from the environment (`ANTHROPIC_API_KEY` in `.env`, or
 * an `ant auth` profile). Model + call cap come from `laundry3.config.ts`; a
 * `LAUNDRY3_VISION_MODEL` env var overrides the model for one run.
 */
export class AnthropicVisionClient implements VisionClient {
  private readonly client = new Anthropic();
  private readonly model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.LAUNDRY3_VISION_MODEL ?? config.agent.visionModel;
  }

  async analyze(req: VisionRequest): Promise<VisionResponse> {
    if (!existsSync(req.imagePath)) {
      throw new Error(`vision: image not found: ${req.imagePath}`);
    }
    // req.crop is honoured by the caller (it passes a pre-cropped path) — not here yet.
    const data = readFileSync(req.imagePath).toString("base64");

    // Extra reference images (annotated spatial key, analysis mask) — skip any missing file
    // so a partially-calibrated camera still classifies.
    const refBlocks = (req.extraImagePaths ?? [])
      .filter((p) => existsSync(p))
      .map((p) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: imageMediaType(p),
          data: readFileSync(p).toString("base64"),
        },
      }));

    const res = await this.client.messages.create({
      model: this.model,
      // Enough headroom for ~12 machines with a sentence of rationale each — 1500 truncated
      // sonnet mid-JSON on the larger camera banks, losing the whole frame to a parse error.
      max_tokens: 4000,
      ...(config.agent.visionEffort !== "none"
        ? { output_config: { effort: config.agent.visionEffort } }
        : {}),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            ...refBlocks,
            { type: "text", text: req.prompt },
          ],
        },
      ],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const inputTokens =
      res.usage.input_tokens +
      (res.usage.cache_read_input_tokens ?? 0) +
      (res.usage.cache_creation_input_tokens ?? 0);
    const outputTokens = res.usage.output_tokens;
    const price = PRICE_PER_MTOK[this.model];
    const costUsd = price
      ? (inputTokens * price.input + outputTokens * price.output) / 1_000_000
      : undefined;

    return { text, model: this.model, inputTokens, outputTokens, costUsd };
  }
}
