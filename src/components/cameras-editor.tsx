"use client";

import { useEffect, useRef, useState } from "react";

import type { Camera } from "@/eval/site-config";

async function call(method: string, body: unknown): Promise<Camera[]> {
  const res = await fetch("/api/cameras", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; cameras?: Camera[] };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.cameras ?? [];
}

async function upload(file: File, kind: string, ownerId: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  fd.set("ownerId", ownerId);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; error?: string; path?: string };
  if (!res.ok || !data.ok || !data.path) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.path;
}

function ImageField({
  label,
  kind,
  ownerId,
  current,
  onPath,
}: {
  label: string;
  kind: string;
  ownerId: string;
  current?: string;
  onPath: (p: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-zinc-500">{label}</span>
      {current ? (
        <span className="font-mono break-all text-zinc-400">{current}</span>
      ) : (
        <span className="text-zinc-400">none</span>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setErr(null);
          try {
            onPath(await upload(f, kind, ownerId));
          } catch (x) {
            setErr(x instanceof Error ? x.message : "upload failed");
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="self-start rounded border border-zinc-300 px-1.5 py-0.5 text-zinc-500 disabled:opacity-40 dark:border-zinc-700"
      >
        {busy ? "uploading…" : current ? "replace" : "upload"}
      </button>
      {err && <span className="break-words text-red-500">{err}</span>}
    </div>
  );
}

function CameraRow({ cam, onList }: { cam: Camera; onList: (l: Camera[]) => void }) {
  const [id, setId] = useState(cam.id);
  const [text, setText] = useState(cam.machineIds.join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = id !== cam.id || text !== cam.machineIds.join(", ");

  async function run(fn: () => Promise<Camera[]>) {
    setBusy(true);
    setErr(null);
    try {
      onList(await fn());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const patch = (extra: Partial<Camera>) =>
    run(() => call("PATCH", { targetId: cam.id, id: id.trim(), machineIdsText: text, ...extra }));

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200/60 py-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-28 min-w-0 rounded border border-zinc-300 px-1 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => patch({})}
          className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Remove camera ${cam.id}?`)) void run(() => call("DELETE", { id: cam.id }));
          }}
          className="rounded border border-red-500/50 px-1.5 py-0.5 text-xs text-red-500 disabled:opacity-40"
        >
          delete
        </button>
      </div>
      <label className="flex flex-col gap-0.5 text-xs">
        <span className="text-zinc-500">machine ids this camera sees (free text)</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="W-01, W-02, W-03"
          className="w-full min-w-0 rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <ImageField
          label="stub image (test feed — D-0016 StaticImageFrameSource)"
          kind="camera-stub"
          ownerId={cam.id}
          current={cam.stubImage}
          onPath={(p) => patch({ stubImage: p })}
        />
        <ImageField
          label="annotated shot (ids drawn on it — spatial key, D-0015)"
          kind="camera-annotated"
          ownerId={cam.id}
          current={cam.annotatedShot}
          onPath={(p) => patch({ annotatedShot: p })}
        />
      </div>
      {err && <span className="text-xs break-words text-red-500">{err}</span>}
    </div>
  );
}

export function CamerasEditor() {
  const [list, setList] = useState<Camera[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newId, setNewId] = useState("");
  const [newText, setNewText] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cameras", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { cameras?: Camera[] }) => setList(d.cameras ?? []))
      .catch(() => setList([]))
      .finally(() => setLoaded(true));
  }, []);

  async function add() {
    setAddErr(null);
    try {
      setList(await call("POST", { id: newId.trim(), machineIdsText: newText }));
      setNewId("");
      setNewText("");
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "failed");
    }
  }

  return (
    <details className="mb-8 rounded-lg border border-zinc-200/60 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm font-semibold">Cameras ({list.length})</summary>
      <p className="mt-2 mb-3 text-xs text-zinc-500">
        Each camera: an id, the machine ids it observes (free text), and — optionally — a{" "}
        <em>stub image</em> to use as its feed for testing and an <em>annotated shot</em> with ids
        drawn on it. Writes <span className="font-mono">data/site-config.json</span> +{" "}
        <span className="font-mono">data/site-config/&lt;id&gt;/</span>. Not yet wired into the eval
        runtime (D-0015/D-0016).
      </p>
      {!loaded ? (
        <p className="text-xs text-zinc-500">loading…</p>
      ) : (
        <>
          {list.length === 0 && <p className="text-xs text-zinc-400">no cameras yet</p>}
          {list.map((cam) => (
            <CameraRow key={cam.id} cam={cam} onList={setList} />
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/60 pt-3 text-xs dark:border-zinc-800">
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="cam-1"
              className="w-28 min-w-0 rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="W-01, W-02"
              className="min-w-0 flex-1 rounded border border-zinc-300 px-1 py-0.5 font-mono dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              disabled={!newId.trim()}
              onClick={add}
              className="rounded bg-emerald-600 px-1.5 py-0.5 text-white disabled:opacity-40"
            >
              add camera
            </button>
            {addErr && <span className="w-full break-words text-red-500">{addErr}</span>}
          </div>
        </>
      )}
    </details>
  );
}
