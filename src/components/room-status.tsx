"use client";

import { useEffect, useState } from "react";
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

const STATES: MachineState[] = ["free", "occupied", "out_of_order", "unknown"];

function MarkWrong({ m }: { m: MachineView }) {
  const { machines } = useStore();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [durable, setDurable] = useState(m.state === "out_of_order");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(correctState: MachineState) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          frameId: m.source,
          machineId: m.machineId,
          correctState,
          scope: durable ? "machine" : "observation",
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: unknown };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      machines.applyRoom(data.room as Parameters<typeof machines.applyRoom>[0]);
      setOpen(false);
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 self-start rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        ✕ mark wrong
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded border border-zinc-300 p-2 dark:border-zinc-700">
      <span className="text-[11px] text-zinc-500">Correct state for {m.machineId}:</span>
      <div className="flex flex-wrap gap-1">
        {STATES.filter((s) => s !== m.state).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => submit(s)}
            className="rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {STATE_STYLE[s].label}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (e.g. bare E = error)"
        className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
      />
      <label className="flex items-center gap-1 text-[11px] text-zinc-500">
        <input type="checkbox" checked={durable} onChange={(e) => setDurable(e.target.checked)} />
        applies to this machine in every view (durable)
      </label>
      {err && <span className="text-[11px] text-red-500">{err}</span>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-[11px] text-zinc-400 underline"
      >
        cancel
      </button>
    </div>
  );
}

const MachineCard = observer(function MachineCard({ m }: { m: MachineView }) {
  const { machines } = useStore();
  const s = STATE_STYLE[m.state];
  const integrator = machines.role === "integrator";
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-3 ${s.card}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold">{m.machineId}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden />
      </div>
      <span className="text-sm">
        {s.label}
        {m.corrected && (
          <span className="ml-1 rounded bg-sky-500/15 px-1 text-[10px] text-sky-600 dark:text-sky-400">
            {m.correction?.scope === "machine" ? "integrator ·  durable" : "integrator"}
          </span>
        )}
      </span>
      {(m.state === "free" || m.state === "unknown") && !m.corrected && (
        <span className="text-xs text-zinc-500">confirm on arrival</span>
      )}
      {integrator && (
        <>
          <span className="mt-1 text-[11px] text-zinc-400">
            {m.corrected ? "set by integrator" : `agent · conf ${m.confidence.toFixed(2)}`} ·{" "}
            {m.seenIn} view{m.seenIn === 1 ? "" : "s"} · {m.source}
          </span>
          {m.correction?.note && (
            <span className="text-[11px] text-zinc-400">“{m.correction.note}”</span>
          )}
          <MarkWrong m={m} />
        </>
      )}
    </div>
  );
});

export const RoomStatus = observer(function RoomStatus() {
  const { machines } = useStore();
  const c = machines.counts;
  const integrator = machines.role === "integrator";

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get("role");
    machines.setRole(role === "integrator" ? "integrator" : "tenant");
  }, [machines]);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Laundry room</h1>
          <a
            href={integrator ? "?" : "?role=integrator"}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {integrator ? "tenant view" : "integrator view"}
          </a>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {c.free} free · {c.occupied} in use · {c.out_of_order} out of order · {c.unknown} unknown
        </p>
        {machines.freeIds.length > 0 && (
          <p className="mt-2 text-sm">
            Available now: <span className="font-mono">{machines.freeIds.join(", ")}</span>
          </p>
        )}
        {integrator && (
          <p className="mt-2 rounded bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
            Integrator view — {machines.correctedCount} correction
            {machines.correctedCount === 1 ? "" : "s"} applied. Use “mark wrong” on any card to
            override the agent; a <em>durable</em> correction carries to every view and every future
            capture of that machine (D-0014).
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
        {integrator ? (
          <>
            Status from <span className="font-mono">{machines.model}</span> — offline snapshot from{" "}
            <span className="font-mono">{machines.reportPath}</span>, plus {machines.correctedCount}{" "}
            integrator correction
            {machines.correctedCount === 1 ? "" : "s"}. Reservations (P2) and a live camera feed are
            not wired in this build.
          </>
        ) : (
          <>Snapshot of current machine availability. Confirm on arrival.</>
        )}
      </footer>
    </main>
  );
});
