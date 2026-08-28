import type { BBox, MachineState, MachineType } from "@/eval/types";

/** One machine as known from calibration (produced by the calibration step, human-confirmed). */
export interface SiteMachine {
  machineId: string;
  type: MachineType;
  /** Region of the camera frame that matters for this machine's state. */
  roi: BBox;
  /** Free-text cues the calibration step learned, e.g. "green LED top-right = running". */
  referenceNotes?: string;
}

/** Per-site calibration config. Machine-generated; not hand-edited. Path: config.paths.siteConfig. */
export interface SiteConfig {
  camera: string;
  createdAt: string;
  machines: SiteMachine[];
}

export interface VisionRequest {
  /** Stable key for caching / replay — same key must mean the same request. */
  cacheKey: string;
  /** Path to the image on disk. */
  imagePath: string;
  /** Optional crop applied before sending, in source-frame pixels. */
  crop?: BBox;
  prompt: string;
}

export interface VisionResponse {
  text: string;
  /** Model that produced this response (persisted in the cache so --replay reports it). */
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  /** true when served from cache (replay). */
  cached?: boolean;
}

export interface VisionClient {
  analyze(req: VisionRequest): Promise<VisionResponse>;
}

/** One machine's assessment, before assembly into a FramePrediction. */
export interface MachineAssessment {
  machineId: string;
  state: MachineState;
  confidence: number;
  rationale: string;
}
