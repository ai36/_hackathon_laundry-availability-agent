"use client";

import { useEffect, useState } from "react";

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
    <tr className="border-t border-zinc-200/60 align-top dark:border-zinc-800">
      <td className="py-1 pr-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-24 min-w-0 rounded border border-zinc-300 px-1 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
      </td>
      <td className="py-1 pr-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MachineType)}
          className="rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1 pr-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="agent hint: how to read this machine's indicator"
          className="w-full min-w-0 rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        {err && <div className="text-xs break-words text-red-500">{err}</div>}
      </td>
      <td className="py-1 whitespace-nowrap">
        <button
          type="button"
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
          className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          save
        </button>{" "}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Remove ${m.machineId} from the roster?`))
              void run(() => call("DELETE", { machineId: m.machineId }));
          }}
          className="rounded border border-red-500/50 px-1.5 py-0.5 text-xs text-red-500 disabled:opacity-40"
        >
          delete
        </button>
      </td>
    </tr>
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
    <details className="mb-8 rounded-lg border border-zinc-200/60 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm font-semibold">Machines ({list.length})</summary>
      <p className="mt-2 mb-3 text-xs text-zinc-500">
        id · type · an optional <span className="font-mono">promptFragment</span> the agent gets
        when it reads this machine (D-0015). Writes{" "}
        <span className="font-mono">data/machines.json</span>.
      </p>
      {!loaded ? (
        <p className="text-xs text-zinc-500">loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="pr-2 pb-1 font-semibold">id</th>
                <th className="pr-2 pb-1 font-semibold">type</th>
                <th className="pr-2 pb-1 font-semibold">prompt fragment</th>
                <th className="pb-1 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <MachineRow key={m.machineId} m={m} onList={setList} onRoster={refreshRoom} />
              ))}
              <tr className="border-t border-zinc-200/60 dark:border-zinc-800">
                <td className="py-2 pr-2">
                  <input
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="W-17"
                    className="w-24 min-w-0 rounded border border-zinc-300 px-1 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MachineType)}
                    className="rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2 text-xs text-zinc-400">
                  add after creating
                  {addErr && <div className="break-words text-red-500">{addErr}</div>}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    disabled={!newId.trim()}
                    onClick={add}
                    className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs text-white disabled:opacity-40"
                  >
                    add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
