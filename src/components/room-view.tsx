"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";

import { MachineCard } from "@/components/machine-card";
import { useStore } from "@/stores";

/** Tenant portal: current per-machine availability, nothing else. */
export const RoomView = observer(function RoomView() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Laundry room</h1>
          <Link
            href="/integrator"
            className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs whitespace-nowrap text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            integrator →
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown} unknown
        </p>
        {machines.freeIds.length > 0 && (
          <p className="mt-2 text-sm break-words">
            Available now: <span className="font-mono">{machines.freeIds.join(", ")}</span>
          </p>
        )}
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Washers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {machines.washers.map((m) => (
            <MachineCard key={m.machineId} m={m} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Dryers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {machines.dryers.map((m) => (
            <MachineCard key={m.machineId} m={m} />
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200/60 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
        Snapshot of current machine availability. Confirm on arrival.
      </footer>
    </main>
  );
});
