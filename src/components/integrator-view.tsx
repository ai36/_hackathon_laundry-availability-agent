"use client";

import { observer } from "mobx-react-lite";
import { SlidersHorizontal } from "lucide-react";

import { MachineGrid } from "@/components/machine-grid";
import { RefreshControl } from "@/components/refresh-control";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/ui/page-shell";
import { useStore } from "@/stores";

const DOTS = [
  { key: "free", label: "free", dot: "dot-free" },
  { key: "occupied", label: "in use", dot: "dot-occupied" },
  { key: "out_of_order", label: "out of order", dot: "dot-out_of_order" },
  { key: "unknown", label: "unknown", dot: "dot-unknown" },
] as const;

export const IntegratorView = observer(function IntegratorView() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <PageShell
      title={
        <>
          Integrator <span className="text-on-surface-variant">view</span>
        </>
      }
      nav={
        <LinkButton href="/integrator/settings" variant="outline">
          <SlidersHorizontal size={16} aria-hidden="true" /> settings
        </LinkButton>
      }
      footer={
        <>
          Status from <span className="font-mono">{machines.model}</span> — offline snapshot from{" "}
          <span className="font-mono">{machines.reportPath}</span>, plus {machines.correctedCount}{" "}
          integrator correction{machines.correctedCount === 1 ? "" : "s"}. Reservations (P2) and a
          live camera feed are not wired in this build.
        </>
      }
    >
      <div className="border-outline-variant bg-surface-container-high rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums">
            {DOTS.map((d) => (
              <span key={d.key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} aria-hidden="true" />
                <span className="font-semibold">{c[d.key]}</span>
                <span className="text-on-surface-variant">{d.label}</span>
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span
                className="bg-primary-container/60 h-2.5 w-2.5 rounded-full"
                aria-hidden="true"
              />
              <span className="font-semibold">{machines.correctedCount}</span>
              <span className="text-on-surface-variant">
                correction{machines.correctedCount === 1 ? "" : "s"}
              </span>
            </span>
          </div>
          <RefreshControl />
        </div>
        <p className="border-primary-container/30 bg-primary-container/10 text-primary mt-4 rounded border px-3 py-2 text-sm">
          “Mark wrong” on any card overrides the agent. A <em>durable</em> correction carries to
          every view and every future capture of that machine (D-0014). Cameras &amp; machines are
          in <span className="font-mono">settings</span>.
        </p>
      </div>

      <MachineGrid title="Washers" list={machines.washers} integrator collapsible />
      <MachineGrid title="Dryers" list={machines.dryers} integrator collapsible />
    </PageShell>
  );
});
