"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label, Select, TextInput } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
import type { MachineType } from "@/eval/types";
import type { RosterMachine } from "@/eval/roster";
import { useStore } from "@/stores";

const TYPES: MachineType[] = ["washer", "dryer"];

async function call(method: string, body: unknown): Promise<RosterMachine[]> {
  const res = await fetch("/api/machines", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; machines?: RosterMachine[] };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.machines ?? [];
}

function MachineRow({
  m,
  onList,
  onRoster,
}: {
  m: RosterMachine;
  onList: (l: RosterMachine[]) => void;
  onRoster: () => void;
}) {
  const [id, setId] = useState(m.machineId);
  const [type, setType] = useState<MachineType>(m.type);
  const [prompt, setPrompt] = useState(m.promptFragment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = id !== m.machineId || type !== m.type || prompt !== (m.promptFragment ?? "");

  async function run(fn: () => Promise<RosterMachine[]>) {
    setBusy(true);
    setErr(null);
    try {
      onList(await fn());
      onRoster();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-outline-variant bg-surface-container flex flex-col gap-3 rounded border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <Label>id</Label>
          <TextInput
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-24 font-mono"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <Label>type</Label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as MachineType)}
            className="w-24"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </label>
        <div className="ml-auto flex gap-2">
          <Button
            variant="default"
            disabled={busy || !dirty}
            onClick={() =>
              run(() =>
                call("PATCH", {
                  targetId: m.machineId,
                  machineId: id.trim(),
                  type,
                  promptFragment: prompt,
                }),
              )
            }
          >
            save
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (confirm(`Remove ${m.machineId} from the roster?`))
                void run(() => call("DELETE", { machineId: m.machineId }));
            }}
            aria-label={`delete ${m.machineId}`}
            className="w-9 px-0"
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <Label>
          prompt fragment{" "}
          <span className="text-outline">&mdash; how to read this machine&rsquo;s indicator</span>
        </Label>
        <TextInput
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. left digits = minutes left; solid E = out of order…"
          className="w-full"
        />
      </label>
      {err && (
        <span role="alert" className="text-error text-xs break-words">
          {err}
        </span>
      )}
    </div>
  );
}

export function MachinesEditor() {
  const { machines: store } = useStore();
  const [list, setList] = useState<RosterMachine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newId, setNewId] = useState("");
  const [newType, setNewType] = useState<MachineType>("washer");
  const [addErr, setAddErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/machines", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { machines?: RosterMachine[] }) => setList(d.machines ?? []))
      .catch(() => setList([]))
      .finally(() => setLoaded(true));
  }, []);

  async function refreshRoom() {
    try {
      const r = await fetch("/api/room", { cache: "no-store" });
      const d = (await r.json()) as { room?: unknown };
      if (d.room) store.applyRoom(d.room as Parameters<typeof store.applyRoom>[0]);
    } catch {
      /* room refresh is best-effort */
    }
  }

  async function add() {
    setAddErr(null);
    try {
      setList(await call("POST", { machineId: newId.trim(), type: newType }));
      setNewId("");
      await refreshRoom();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "failed");
    }
  }

  return (
    <Section title={`Machines (${list.length})`} collapsible>
      <p className="text-on-surface-variant mb-4 text-xs">
        id · type · an optional <span className="font-mono">promptFragment</span> the agent gets
        when it reads this machine (D-0015). Writes{" "}
        <span className="font-mono">data/machines.json</span>.
      </p>
      {!loaded ? (
        <p className="text-on-surface-variant text-xs">loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <MachineRow key={m.machineId} m={m} onList={setList} onRoster={refreshRoom} />
          ))}
          <div className="border-outline-variant flex flex-wrap items-end gap-2 rounded border border-dashed p-3">
            <label className="flex flex-col gap-1">
              <Label>new id</Label>
              <TextInput
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="W-17…"
                autoComplete="off"
                spellCheck={false}
                className="w-24 font-mono"
              />
            </label>
            <label className="flex flex-col gap-1">
              <Label>type</Label>
              <Select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MachineType)}
                className="w-24"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            <Button variant="accent" disabled={!newId.trim()} onClick={add} className="ml-auto">
              <Plus size={14} aria-hidden="true" /> add
            </Button>
            {addErr && (
              <span role="alert" className="text-error w-full text-xs break-words">
                {addErr}
              </span>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
