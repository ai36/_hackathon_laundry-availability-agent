"use client";

import { observer } from "mobx-react-lite";

import { useStore } from "@/stores";
import type { MachineState } from "@/eval/types";
import type { MachineView } from "@/portal/room-status";

const STATE_STYLE: Record<MachineState, { label: string; dot: string; card: string }> = {
  free: { label: "Free", dot: "bg-emerald-500", card: "border-emerald-500/40 bg-emerald-500/5" },
  occupied: { label: "In use", dot: "bg-amber-500", card: "border-amber-500/40 bg-amber-500/5" },
  out_of_order: {
    label: "Out of order",
    dot: "bg-red-500",
    card: "border-red-500/40 bg-red-500/5",
  },
  unknown: { label: "Unknown", dot: "bg-zinc-400", card: "border-zinc-400/40 bg-zinc-400/5" },
};

function MachineCard({ m }: { m: MachineView }) {
  const s = STATE_STYLE[m.state];
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-3 ${s.card}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold">{m.machineId}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
      </div>
      <span className="text-sm">{s.label}</span>
      {(m.state === "free" || m.state === "unknown") && (
        <span className="text-xs text-zinc-500">confirm on arrival</span>
      )}
      <span className="mt-1 text-[11px] text-zinc-400">
        conf {m.confidence.toFixed(2)} · {m.seenIn} view{m.seenIn === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export const RoomStatus = observer(function RoomStatus() {
  const { machines } = useStore();
  const c = machines.counts;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Laundry room</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown} unknown
        </p>
        {machines.freeIds.length > 0 && (
          <p className="mt-2 text-sm">
            Available now: <span className="font-mono">{machines.freeIds.join(", ")}</span>
          </p>
        )}
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Washers
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {machines.washers.map((m) => (
            <MachineCard key={m.machineId} m={m} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Dryers
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {machines.dryers.map((m) => (
            <MachineCard key={m.machineId} m={m} />
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200/60 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
        Status from <span className="font-mono">{machines.model}</span> — offline snapshot from{" "}
        <span className="font-mono">{machines.reportPath}</span>. Reservations (P2) and a live
        camera feed are not wired in this build.
      </footer>
    </main>
  );
});
