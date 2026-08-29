"use client";

import { observer } from "mobx-react-lite";

import { MachineGrid } from "@/components/machine-grid";
import { PageShell } from "@/components/ui/page-shell";
import { useStore } from "@/stores";

const DOTS = [
  { key: "free", label: "free", dot: "dot-free" },
  { key: "occupied", label: "in use", dot: "dot-occupied" },
  { key: "out_of_order", label: "out of order", dot: "dot-out_of_order" },
  { key: "unknown", label: "unknown", dot: "dot-unknown" },
] as const;

/** Tenant portal: current per-machine availability, nothing else. */
export const RoomView = observer(function RoomView() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <PageShell
      title="Live status"
      footer="Snapshot of current machine availability. Confirm on arrival."
    >
      <div className="border-outline-variant bg-surface-container-high mb-8 rounded-lg border p-4 md:p-5">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {DOTS.map((d) => (
            <span key={d.key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} aria-hidden />
              <span className="font-semibold">{c[d.key]}</span>
              <span className="text-on-surface-variant">{d.label}</span>
            </span>
          ))}
        </div>
        {machines.freeIds.length > 0 && (
          <p className="border-outline-variant bg-surface text-primary mt-4 rounded border p-3 font-mono text-[13px] break-words">
            Available now: {machines.freeIds.join(", ")}
          </p>
        )}
      </div>

      <MachineGrid title="Washers" list={machines.washers} />
      <MachineGrid title="Dryers" list={machines.dryers} />
    </PageShell>
  );
});
