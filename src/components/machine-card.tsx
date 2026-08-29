"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label, TextInput } from "@/components/ui/field";
import { useStore } from "@/stores";
import type { MachineState } from "@/eval/types";
import type { MachineView } from "@/portal/room-status";

/**
 * Per-state visuals. `dot`/`card`/`glow` are helper classes from globals.css; `text` is a
 * Lumina token colour for the status word.
 */
export const STATE_STYLE: Record<
  MachineState,
  { label: string; dot: string; card: string; glow: string; text: string }
> = {
  free: {
    label: "Free",
    dot: "dot-free",
    card: "card-free",
    glow: "glow-free",
    text: "text-primary-container",
  },
  occupied: {
    label: "In use",
    dot: "dot-occupied",
    card: "card-occupied",
    glow: "",
    text: "text-secondary-container",
  },
  out_of_order: {
    label: "Out of order",
    dot: "dot-out_of_order",
    card: "card-out_of_order",
    glow: "glow-out_of_order",
    text: "text-error",
  },
  unknown: {
    label: "Unknown",
    dot: "dot-unknown",
    card: "card-unknown",
    glow: "",
    text: "text-on-surface-variant",
  },
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
      <Button variant="outline" onClick={() => setOpen(true)} className="mt-2 self-start">
        <X size={13} /> mark wrong
      </Button>
    );
  }

  return (
    <div className="border-outline-variant bg-surface-container mt-3 flex flex-col gap-2 rounded border p-2.5">
      <Label>Correct state for {m.machineId}:</Label>
      <div className="flex flex-wrap gap-1.5">
        {STATES.filter((s) => s !== m.state).map((s) => (
          <Button key={s} variant="default" disabled={busy} onClick={() => submit(s)}>
            {STATE_STYLE[s].label}
          </Button>
        ))}
      </div>
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (e.g. bare E = error)"
        className="w-full"
      />
      <label className="text-on-surface-variant flex items-center gap-1.5 text-[13px]">
        <input type="checkbox" checked={durable} onChange={(e) => setDurable(e.target.checked)} />
        applies to this machine in every view (durable)
      </label>
      {err && <span className="text-error text-[13px] break-words">{err}</span>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-outline self-start text-[13px] underline"
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
    <div
      className={`bg-surface-container-high hover:bg-surface-container-highest flex min-w-0 flex-col gap-1.5 rounded-lg border p-4 transition-colors ${s.card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-lg font-bold">{m.machineId}</span>
        <span className={`h-3 w-3 shrink-0 rounded-full ${s.dot} ${s.glow}`} aria-hidden />
      </div>
      <span className={`text-xl font-semibold ${s.text}`}>{s.label}</span>
      {m.corrected && (
        <span className="bg-primary-container/15 text-primary-container w-fit rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
          {m.correction?.scope === "machine" ? "integrator · durable" : "integrator"}
        </span>
      )}
      {(m.state === "free" || m.state === "unknown") && !m.corrected && (
        <span className="text-on-surface-variant text-[13px] opacity-80">confirm on arrival</span>
      )}
      {integrator && (
        <>
          <span className="text-outline mt-1 text-[12px] break-words">
            {m.corrected ? "set by integrator" : `agent · conf ${m.confidence.toFixed(2)}`} ·{" "}
            {m.seenIn} view{m.seenIn === 1 ? "" : "s"} · {m.source}
          </span>
          {m.correction?.note && (
            <span className="text-outline text-[12px] break-words">“{m.correction.note}”</span>
          )}
          <MarkWrong m={m} />
        </>
      )}
    </div>
  );
});
