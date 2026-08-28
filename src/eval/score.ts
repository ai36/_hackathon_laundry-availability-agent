import type { FrameLabel, FramePrediction, MachineState } from "./types";

export interface Scores {
  /** (machine, frame) pairs with determinate ground truth. */
  nDeterminate: number;
  /** Excluded from accuracy; reported separately. */
  nIndeterminable: number;
  /** correct / nDeterminate. An agent `unknown` on a determinate GT is incorrect. */
  accuracy: number;
  /**
   * Predictions that would send a user to a machine they cannot use, / nDeterminate:
   * predicted `free` while the ground truth is `occupied` or `out_of_order`. Abstaining
   * (`unknown`) is never a harmful error.
   */
  harmfulErrorRate: number;
  /** actionable predictions (not `unknown`) / nDeterminate. */
  coverage: number;
  /** correct / actionable predictions. */
  accuracyOnCovered: number;
  /** rows: ground truth, cols: prediction. */
  confusion: Record<MachineState, Record<MachineState, number>>;
  missingPredictions: number;
}

const STATES: MachineState[] = ["free", "occupied", "unknown", "out_of_order"];

function emptyRow(): Record<MachineState, number> {
  return { free: 0, occupied: 0, unknown: 0, out_of_order: 0 };
}
function emptyConfusion(): Scores["confusion"] {
  return { free: emptyRow(), occupied: emptyRow(), unknown: emptyRow(), out_of_order: emptyRow() };
}

/** A wrong "free" that costs the user a trip. */
function isHarmful(predicted: MachineState, truth: MachineState): boolean {
  return predicted === "free" && (truth === "occupied" || truth === "out_of_order");
}

/**
 * Score predictions against labels for the given frame ids. A prediction missing for a
 * labelled machine is treated as `unknown` (no answer given) and counted in
 * `missingPredictions`.
 */
export function scoreAll(
  predictions: Map<string, FramePrediction>,
  labels: Map<string, FrameLabel>,
  frameIds: string[],
): Scores {
  const confusion = emptyConfusion();
  let nDeterminate = 0;
  let nIndeterminable = 0;
  let correct = 0;
  let harmful = 0;
  let covered = 0;
  let coveredCorrect = 0;
  let missingPredictions = 0;

  for (const frameId of frameIds) {
    const label = labels.get(frameId);
    if (!label) continue;
    const pred = predictions.get(frameId);
    const predByMachine = new Map((pred?.machines ?? []).map((m) => [m.machineId, m]));

    for (const gt of label.machines) {
      const p = predByMachine.get(gt.machineId);
      const predState: MachineState = p?.state ?? "unknown";
      if (!p) missingPredictions++;

      if (!gt.gtDeterminate) {
        nIndeterminable++;
        continue;
      }
      nDeterminate++;
      confusion[gt.state][predState]++;

      const isCorrect = predState === gt.state;
      if (isCorrect) correct++;
      if (isHarmful(predState, gt.state)) harmful++;

      if (predState !== "unknown") {
        covered++;
        if (isCorrect) coveredCorrect++;
      }
    }
  }

  return {
    nDeterminate,
    nIndeterminable,
    accuracy: nDeterminate ? correct / nDeterminate : 0,
    harmfulErrorRate: nDeterminate ? harmful / nDeterminate : 0,
    coverage: nDeterminate ? covered / nDeterminate : 0,
    accuracyOnCovered: covered ? coveredCorrect / covered : 0,
    confusion,
    missingPredictions,
  };
}

export function formatScores(s: Scores): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    `determinate observations : ${s.nDeterminate}  (indeterminable: ${s.nIndeterminable})`,
    `accuracy                 : ${pct(s.accuracy)}`,
    `harmful-error rate       : ${pct(s.harmfulErrorRate)}`,
    `coverage                 : ${pct(s.coverage)}`,
    `accuracy on covered      : ${pct(s.accuracyOnCovered)}`,
    `missing predictions      : ${s.missingPredictions}`,
    ...STATES.map(
      (gt) =>
        `  gt ${gt.padEnd(12)} -> ` + STATES.map((p) => `${p}:${s.confusion[gt][p]}`).join("  "),
    ),
  ].join("\n");
}
