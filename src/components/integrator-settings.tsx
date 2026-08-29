"use client";

import { observer } from "mobx-react-lite";
import { ArrowLeft } from "lucide-react";

import { CamerasEditor } from "@/components/cameras-editor";
import { MachinesEditor } from "@/components/machines-editor";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/ui/page-shell";
import { Section } from "@/components/ui/section";
import { useStore } from "@/stores";

export const IntegratorSettings = observer(function IntegratorSettings() {
  const { machines } = useStore();

  const observed = machines.machines.filter((m) => m.seenIn > 0);
  const unobserved = machines.machines.filter((m) => m.seenIn === 0).map((m) => m.machineId);
  const cameras = new Map<string, string[]>();
  for (const m of observed) {
    cameras.set(m.source, [...(cameras.get(m.source) ?? []), m.machineId]);
  }

  return (
    <PageShell
      title="System settings"
      nav={
        <LinkButton href="/integrator" variant="outline">
          <ArrowLeft size={16} aria-hidden="true" /> integrator
        </LinkButton>
      }
    >
      <MachinesEditor />
      <CamerasEditor />

      <Section title="Site overview" collapsible>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <div className="text-on-surface-variant font-semibold">
              Roster ({machines.machines.length})
            </div>
            <div className="text-on-surface-variant break-words">
              {machines.washers.length} washers · {machines.dryers.length} dryers ·{" "}
              {observed.length} covered by a mock camera
              {unobserved.length > 0 && (
                <>
                  {" "}
                  · <span className="text-outline">not covered:</span>{" "}
                  <span className="font-mono">{unobserved.join(", ")}</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-on-surface-variant font-semibold">
              Mock cameras ({cameras.size}) — frame → machines whose state it currently sets
            </div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {[...cameras.entries()].sort().map(([frame, ids]) => (
                <li key={frame} className="text-on-surface-variant break-words">
                  <span className="font-mono">{frame}</span> → {ids.sort().join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </PageShell>
  );
});
