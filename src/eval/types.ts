/** Shared types for the laundry3 dataset, predictions, and scoring. Mirrors the label
 * schema in docs/PROBLEM.md. */

export type MachineType = "washer" | "dryer";

/**
 * Per machine, per frame.
 * - `free` / `occupied` — normal states.
 * - `out_of_order` — visibly broken / taped off / hard-error on the display; a user cannot
 *   use it even though it is not "occupied".
 * - `unknown` — not determinable from this evidence (blocked indicator, darkness, glare).
 */
export type MachineState = "free" | "occupied" | "unknown" | "out_of_order";

/** Frame-wide transient conditions. Extensible; see docs/PROBLEM.md. */
export type FrameCondition =
  | "low_light"
  | "lights_off_no_motion"
  | "glare"
  | "backlit"
  | "motion_blur"
  | "person_in_frame"
  | "partial_view";

/** Per-machine transient conditions. Extensible. */
export type ObservationNote =
  | "indicator_occluded_by_person"
  | "indicator_occluded_by_object"
  | "indicator_partial"
  | "glare_on_door"
  | "door_open"
  | "ambiguous";

/** [x, y, width, height] in pixels of the source frame. */
export type BBox = [number, number, number, number];

export interface MachineLabel {
  machineId: string;
  type: MachineType;
  bbox?: BBox;
  /** Ground-truth state decided by the human labeller. */
  state: MachineState;
  /** false only when even a human cannot tell from the available evidence. */
  gtDeterminate: boolean;
  observationNotes?: ObservationNote[];
}

export interface FrameLabel {
  frameId: string;
  timestamp?: string;
  camera?: string;
  frameConditions?: FrameCondition[];
  machines: MachineLabel[];
}

export interface MachinePrediction {
  machineId: string;
  state: MachineState;
  /** 0..1 self-reported confidence. */
  confidence: number;
  /** Short human-readable justification (shown in trajectories, not scored). */
  rationale?: string;
}

export interface FramePrediction {
  frameId: string;
  machines: MachinePrediction[];
  /** How the prediction was produced, for the trajectory record. */
  meta?: {
    mode: "baseline" | "agent";
    visionCalls: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    /** agent only: machine ids the verification pass would re-check. */
    needsVerification?: string[];
  };
}
