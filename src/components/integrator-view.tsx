"use client";

import { useState } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";

import { MachineCard } from "@/components/machine-card";
import { useStore } from "@/stores";

export const IntegratorView = observer(function IntegratorView() {
  const { machines } = useStore();
  const c = machines.counts;

  const [refreshing, setRefreshing] = useState(false);
  const [refreshErr, setRefreshErr] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setRefreshErr(null);
    try {
      const res = await fetch("/api/room", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: unknown };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      machines.applyRoom(data.room as Parameters<typeof machines.applyRoom>[0]);
    } catch (e) {
      setRefreshErr(e instanceof Error ? e.message : "failed");
    } finally {
      setRefreshing(false);
    }
  }

  const observed = machines.machines.filter((m) => m.seenIn > 0);
  const unobserved = machines.machines.filter((m) => m.seenIn === 0).map((m) => m.machineId);
  const cameras = new Map<string, string[]>();
  for (const m of observed) {
    cameras.set(m.source, [...(cameras.get(m.source) ?? []), m.machineId]);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Laundry room <span className="text-zinc-400">· integrator</span>
          </h1>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="rounded border border-sky-500/40 px-2 py-1 text-xs whitespace-nowrap hover:bg-sky-500/10 disabled:opacity-50"
            >
              {refreshing ? "refreshing…" : "↻ refresh recognition"}
            </button>
            <Link
              href="/"
              className="rounded border border-zinc-300 px-2 py-1 text-xs whitespace-nowrap text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← tenant view
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown} unknown
          · {machines.correctedCount} correction{machines.correctedCount === 1 ? "" : "s"}
        </p>
        {refreshErr && (
          <p className="mt-1 text-xs break-words text-red-500">refresh failed: {refreshErr}</p>
        )}
        <p className="mt-2 rounded bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
          Use “mark wrong” on any card to override the agent. A <em>durable</em> correction carries
          to every view and every future capture of that machine (D-0014). Editing cameras and
          machines is below.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Washers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {machines.washers.map((m) => (
            <MachineCard key={m.machineId} m={m} integrator />
          ))}
        </div>
        <h2 className="mt-6 mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Dryers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {machines.dryers.map((m) => (
            <MachineCard key={m.machineId} m={m} integrator />
          ))}
        </div>
      </section>

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

      <footer className="border-t border-zinc-200/60 pt-4 text-xs break-words text-zinc-400 dark:border-zinc-800">
        Status from <span className="font-mono">{machines.model}</span> — offline snapshot from{" "}
        <span className="font-mono">{machines.reportPath}</span>, plus {machines.correctedCount}{" "}
        integrator correction{machines.correctedCount === 1 ? "" : "s"}. Reservations (P2) and a
        live camera feed are not wired in this build.
      </footer>
    </main>
  );
});
