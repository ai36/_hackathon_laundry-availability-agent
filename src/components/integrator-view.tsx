"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { ArrowLeft, Settings } from "lucide-react";

import { MachineGrid } from "@/components/machine-grid";
import { RefreshControl } from "@/components/refresh-control";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { useStore } from "@/stores";

export const IntegratorView = observer(function IntegratorView() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <PageShell
      title={
        <>
          Laundry room <span className="text-zinc-400">· integrator</span>
        </>
      }
      nav={
        <>
          <Link href="/integrator/settings">
            <Button variant="ghost">
              <Settings size={14} /> settings
            </Button>
          </Link>
          <Link href="/tenant">
            <Button variant="ghost">
              <ArrowLeft size={14} /> tenant
            </Button>
          </Link>
        </>
      }
      subtitle={
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p>
              {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown}{" "}
              unknown · {machines.correctedCount} correction
              {machines.correctedCount === 1 ? "" : "s"}
            </p>
            <RefreshControl />
          </div>
          <p className="mt-2 rounded-md bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
            “Mark wrong” on any card overrides the agent. A <em>durable</em> correction carries to
            every view and every future capture of that machine (D-0014). Cameras &amp; machines are
            in <span className="font-mono">settings</span>.
          </p>
        </>
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
      <MachineGrid title="Washers" list={machines.washers} integrator />
      <MachineGrid title="Dryers" list={machines.dryers} integrator />
    </PageShell>
  );
});
