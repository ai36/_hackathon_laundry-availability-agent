"use client";

import { observer } from "mobx-react-lite";

import { MachineGrid } from "@/components/machine-grid";
import { CountRow } from "@/components/ui/count-row";
import { PageShell } from "@/components/ui/page-shell";
import { useStore } from "@/stores";
import type { MachineView } from "@/portal/room-status";

/** Available = physically free and not held by a reservation. */
const freeCount = (list: MachineView[]) =>
  list.filter((m) => m.state === "free" && !m.reserved).length;

/** Tenant portal: current per-machine availability, nothing else. */
export const RoomView = observer(function RoomView() {
  const { machines } = useStore();

  return (
    <PageShell
      title="Live status"
      footer="Snapshot of current machine availability. Confirm on arrival."
    >
      <div className="border-outline-variant bg-surface-container-high rounded-lg border p-4">
        {/* What a tenant wants first: how many of each kind are free right now. */}
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {(
            [
              {
                label: "Washers free",
                free: freeCount(machines.washers),
                total: machines.washers.length,
              },
              {
                label: "Dryers free",
                free: freeCount(machines.dryers),
                total: machines.dryers.length,
              },
            ] as const
          ).map((k) => (
            <div key={k.label}>
              <div className="text-on-surface-variant text-xs font-semibold tracking-[0.1em] uppercase">
                {k.label}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-[32px] leading-none font-bold tabular-nums ${
                    k.free > 0 ? "text-primary-container" : "text-on-surface-variant"
                  }`}
                >
                  {k.free}
                </span>
                <span className="text-on-surface-variant text-sm tabular-nums">/ {k.total}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <CountRow counts={machines.counts} corrections={machines.correctedCount} />
        </div>
      </div>

      <MachineGrid title="Washers" list={machines.washers} collapsible />
      <MachineGrid title="Dryers" list={machines.dryers} collapsible />
    </PageShell>
  );
});
