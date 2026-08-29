import type { MachineState } from "@/eval/types";

const ITEMS = [
  { key: "free", label: "free", dot: "dot-free" },
  { key: "occupied", label: "in use", dot: "dot-occupied" },
  { key: "out_of_order", label: "out of order", dot: "dot-out_of_order" },
  { key: "unknown", label: "unknown", dot: "dot-unknown" },
] as const;

/**
 * The shared status line: one coloured dot + count + label per state, plus an optional
 * corrections tally. Used on both Live status and the Integrator view.
 */
export function CountRow({
  counts,
  corrections,
}: {
  counts: Record<MachineState, number>;
  corrections?: number;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums">
      {ITEMS.map((d) => (
        <span key={d.key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} aria-hidden="true" />
          <span className="font-semibold">{counts[d.key]}</span>
          <span className="text-on-surface-variant">{d.label}</span>
        </span>
      ))}
      {corrections !== undefined && (
        <span className="flex items-center gap-2">
          <span className="bg-primary-container/60 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          <span className="font-semibold">{corrections}</span>
          <span className="text-on-surface-variant">correction{corrections === 1 ? "" : "s"}</span>
        </span>
      )}
    </div>
  );
}
