"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { SlidersHorizontal } from "lucide-react";

import { MachineGrid } from "@/components/machine-grid";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { useStore } from "@/stores";

/** Tenant portal: current per-machine availability, nothing else. */
export const RoomView = observer(function RoomView() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <PageShell
      title="Laundry room"
      nav={
        <Link href="/integrator">
          <Button variant="ghost">
            <SlidersHorizontal size={14} /> integrator
          </Button>
        </Link>
      }
      subtitle={
        <>
          <p>
            {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown}{" "}
            unknown
          </p>
          {machines.freeIds.length > 0 && (
            <p className="mt-2 break-words text-zinc-700 dark:text-zinc-300">
              Available now: <span className="font-mono">{machines.freeIds.join(", ")}</span>
            </p>
          )}
        </>
      }
      footer="Snapshot of current machine availability. Confirm on arrival."
    >
      <MachineGrid title="Washers" list={machines.washers} />
      <MachineGrid title="Dryers" list={machines.dryers} />
    </PageShell>
  );
});
