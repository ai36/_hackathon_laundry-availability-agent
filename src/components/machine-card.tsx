"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/stores";
import type { MachineState } from "@/eval/types";
import type { MachineView } from "@/portal/room-status";

export const STATE_STYLE: Record<MachineState, { label: string; dot: string; card: string }> = {
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
          // a machine no mock camera covers has no source frame — file it under "_roster"
          frameId: m.seenIn === 0 ? "_roster" : m.source,
          machineId: m.machineId,
          correctState,
          scope: durable || m.seenIn === 0 ? "machine" : "observation",
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
        className="mt-1 self-start rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        ✕ mark wrong
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded border border-zinc-300 p-2 dark:border-zinc-700">
      <span className="text-xs text-zinc-500">Correct state for {m.machineId}:</span>
      <div className="flex flex-wrap gap-1">
        {STATES.filter((s) => s !== m.state).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => submit(s)}
            className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {STATE_STYLE[s].label}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (e.g. bare E = error)"
        className="min-w-0 rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <label className="flex items-center gap-1 text-xs text-zinc-500">
        <input type="checkbox" checked={durable} onChange={(e) => setDurable(e.target.checked)} />
        applies to this machine in every view (durable)
      </label>
      {err && <span className="text-xs break-words text-red-500">{err}</span>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-xs text-zinc-400 underline"
      >
        cancel
      </button>
    </div>
  );
}

/** One machine tile. `integrator` adds provenance + the mark-wrong control. */
export const MachineCard = observer(function MachineCard({
  m,
  integrator = false,
}: {
  m: MachineView;
  integrator?: boolean;
}) {
  const s = STATE_STYLE[m.state];
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-lg border p-3 ${s.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{m.machineId}</span>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      </div>
      <span className="text-sm">
        {s.label}
        {m.corrected && (
          <span className="ml-1 rounded bg-sky-500/15 px-1 text-xs text-sky-600 dark:text-sky-400">
            {m.correction?.scope === "machine" ? "integrator · durable" : "integrator"}
          </span>
        )}
      </span>
      {(m.state === "free" || m.state === "unknown") && !m.corrected && (
        <span className="text-xs text-zinc-500">confirm on arrival</span>
      )}
      {integrator && (
        <>
          <span className="mt-1 text-xs break-words text-zinc-400">
            {m.corrected ? "set by integrator" : `agent · conf ${m.confidence.toFixed(2)}`} ·{" "}
            {m.seenIn} view{m.seenIn === 1 ? "" : "s"} · {m.source}
          </span>
          {m.correction?.note && (
            <span className="text-xs break-words text-zinc-400">“{m.correction.note}”</span>
          )}
          <MarkWrong m={m} />
        </>
      )}
    </div>
  );
});
