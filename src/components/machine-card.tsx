"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label, TextInput } from "@/components/ui/field";
import { useClientId } from "@/portal/client-id";
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
  const [choice, setChoice] = useState<MachineState | null>(null);
  const [note, setNote] = useState("");
  const [durable, setDurable] = useState(m.state === "out_of_order");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setChoice(null);
    setNote("");
    setErr(null);
  }

  async function save() {
    if (!choice) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          frameId: m.seenIn === 0 ? "_roster" : m.source,
          machineId: m.machineId,
          correctState: choice,
          scope: durable || m.seenIn === 0 ? "machine" : "observation",
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: unknown };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      machines.applyRoom(data.room as Parameters<typeof machines.applyRoom>[0]);
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="mt-2 self-start">
        <X size={16} aria-hidden="true" /> mark wrong
      </Button>
    );
  }

  return (
    <div className="border-outline-variant bg-surface-container mt-3 flex flex-col gap-3 rounded border p-3">
      <Label>Correct state for {m.machineId}:</Label>
      <div className="flex flex-wrap gap-2">
        {STATES.filter((s) => s !== m.state).map((s) => (
          <Button
            key={s}
            variant={choice === s ? "default" : "outline"}
            aria-pressed={choice === s}
            disabled={busy}
            onClick={() => setChoice(s)}
          >
            {STATE_STYLE[s].label}
          </Button>
        ))}
      </div>
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note, e.g. bare E = error…"
        spellCheck={false}
        autoComplete="off"
        className="w-full"
      />
      <label className="text-on-surface-variant flex min-h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={durable}
          onChange={(e) => setDurable(e.target.checked)}
          className="accent-primary-container h-4 w-4"
        />
        applies to this machine in every view (durable)
      </label>
      {err && (
        <span role="alert" className="text-error text-sm break-words">
          {err}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" disabled={busy || !choice} onClick={save}>
          save
        </Button>
        <Button variant="ghost" disabled={busy} onClick={close}>
          <X size={16} aria-hidden="true" /> cancel
        </Button>
      </div>
    </div>
  );
}

/** One machine tile. `integrator` adds provenance + the mark-wrong control; on the tenant
 *  view a free machine can be reserved via a confirm dialog (no cancel — a hold only lapses). */
export const MachineCard = observer(function MachineCard({
  m,
  integrator = false,
}: {
  m: MachineView;
  integrator?: boolean;
}) {
  const s = STATE_STYLE[m.state];
  const { machines } = useStore();
  const clientId = useClientId();
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mine = Boolean(m.reserved && clientId && m.reservedBy === clientId);
  // While you hold any machine you cannot reserve another — wait for it to lapse.
  const iHaveAHold =
    Boolean(clientId) && machines.machines.some((x) => x.reserved && x.reservedBy === clientId);
  const canReserve =
    !integrator &&
    m.state === "free" &&
    !m.corrected &&
    !m.reserved &&
    machines.reservationEnabled &&
    Boolean(clientId) &&
    !iHaveAHold;

  async function reserveNow() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ machineId: m.machineId, by: clientId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: unknown };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      machines.applyRoom(data.room as Parameters<typeof machines.applyRoom>[0]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
      setDialog(false);
    }
  }

  const until =
    mine && m.reservedUntil
      ? new Date(m.reservedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;

  const cls = `flex min-w-0 flex-col gap-3 rounded-lg border bg-surface-container-high p-4 transition-colors ${s.card} ${
    canReserve ? "cursor-pointer text-left" : ""
  } hover:bg-surface-container-highest`;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-lg font-bold">{m.machineId}</span>
        <span className={`h-3 w-3 shrink-0 rounded-full ${s.dot} ${s.glow}`} aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <span className={`text-xl font-semibold ${s.text}`}>{s.label}</span>
        {m.corrected && (
          <span className="bg-primary-container/15 text-2xs text-primary-container w-fit rounded px-1.5 py-0.5 font-bold tracking-wide uppercase">
            {m.correction?.scope === "machine" ? "integrator · durable" : "integrator"}
          </span>
        )}
        {mine && (
          <span className="bg-secondary-container/20 text-2xs text-secondary-container w-fit rounded px-1.5 py-0.5 font-bold tracking-wide uppercase">
            your reservation{until ? ` · until ${until}` : ""}
          </span>
        )}
        {m.state === "free" && !m.corrected && (
          <span className="text-on-surface-variant text-sm opacity-80">
            {canReserve ? "tap to reserve · confirm on arrival" : "confirm on arrival"}
          </span>
        )}
        {m.state === "unknown" && !m.corrected && (
          <span className="text-on-surface-variant text-sm opacity-80">confirm on arrival</span>
        )}
      </div>
      {integrator && (
        <div className="flex flex-col gap-1">
          <span className="text-outline text-xs break-words">
            {m.corrected ? "set by integrator" : `agent · conf ${m.confidence.toFixed(2)}`} ·{" "}
            {m.seenIn} view{m.seenIn === 1 ? "" : "s"} · {m.source}
          </span>
          {m.correction?.note && (
            <span className="text-outline text-xs break-words">“{m.correction.note}”</span>
          )}
          <MarkWrong m={m} />
        </div>
      )}
      {err && (
        <span role="alert" className="text-error text-xs break-words">
          {err}
        </span>
      )}
    </>
  );

  return (
    <>
      {canReserve ? (
        <button type="button" className={cls} onClick={() => setDialog(true)}>
          {inner}
        </button>
      ) : (
        <div className={cls}>{inner}</div>
      )}

      <ConfirmDialog
        open={dialog}
        onOpenChange={setDialog}
        title={`Reserve ${m.machineId}?`}
        description="It's held for you for a short window and released automatically if you don't start it. You can't cancel it or move it to another machine."
        confirmLabel="reserve"
        busy={busy}
        onConfirm={reserveNow}
      />
    </>
  );
});
