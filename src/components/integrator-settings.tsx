"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";

import { CamerasEditor } from "@/components/cameras-editor";
import { MachinesEditor } from "@/components/machines-editor";
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
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Laundry room <span className="text-zinc-400">· settings</span>
        </h1>
        <Link
          href="/integrator"
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← integrator
        </Link>
      </header>

      <MachinesEditor />
      <CamerasEditor />

      <section className="mb-8 rounded-lg border border-zinc-200/60 p-4 text-xs dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Site overview</h2>
        <div className="flex flex-col gap-3">
          <div>
            <div className="font-semibold text-zinc-500">Roster ({machines.machines.length})</div>
            <div className="break-words text-zinc-500">
              {machines.washers.length} washers · {machines.dryers.length} dryers ·{" "}
              {observed.length} covered by a mock camera
              {unobserved.length > 0 && (
                <>
                  {" "}
                  · <span className="text-zinc-400">not covered:</span>{" "}
                  <span className="font-mono">{unobserved.join(", ")}</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="font-semibold text-zinc-500">
              Mock cameras ({cameras.size}) — frame → machines whose state it currently sets
            </div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {[...cameras.entries()].sort().map(([frame, ids]) => (
                <li key={frame} className="break-words text-zinc-500">
                  <span className="font-mono">{frame}</span> → {ids.sort().join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
});
