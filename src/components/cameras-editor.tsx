"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label, TextInput } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
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
    <div className="flex flex-col gap-0.5 text-xs">
      <Label>{label}</Label>
      <span className={`break-all ${current ? "text-outline font-mono" : "text-outline"}`}>
        {current ?? "none"}
      </span>
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
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="self-start"
      >
        <Upload size={11} /> {busy ? "uploading…" : current ? "replace" : "upload"}
      </Button>
      {err && <span className="text-error break-words">{err}</span>}
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
    <div className="border-outline-variant bg-surface-container flex flex-col gap-2 rounded border p-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col gap-0.5">
          <Label>camera id</Label>
          <TextInput
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="w-28 font-mono"
          />
        </label>
        <div className="ml-auto flex gap-1.5">
          <Button variant="default" disabled={busy || !dirty} onClick={() => patch({})}>
            save
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (confirm(`Remove camera ${cam.id}?`))
                void run(() => call("DELETE", { id: cam.id }));
            }}
            aria-label={`delete ${cam.id}`}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
      <label className="flex flex-col gap-0.5">
        <Label>machine ids this camera sees (free text)</Label>
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="W-01, W-02, W-03"
          className="w-full font-mono"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
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
      {err && <span className="text-error text-xs break-words">{err}</span>}
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
    <Section title={`Cameras (${list.length})`} collapsible>
      <p className="text-on-surface-variant mb-3 text-xs">
        Each camera: an id, the machine ids it observes (free text), and — optionally — a{" "}
        <em>stub image</em> for its feed and an <em>annotated shot</em>. Writes{" "}
        <span className="font-mono">data/site-config.json</span> +{" "}
        <span className="font-mono">data/site-config/&lt;id&gt;/</span>. Not yet read by the eval
        runtime (D-0015/D-0016).
      </p>
      {!loaded ? (
        <p className="text-on-surface-variant text-xs">loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.length === 0 && <p className="text-outline text-xs">no cameras yet</p>}
          {list.map((cam) => (
            <CameraRow key={cam.id} cam={cam} onList={setList} />
          ))}
          <div className="border-outline-variant flex flex-wrap items-end gap-2 rounded border border-dashed p-2.5">
            <label className="flex flex-col gap-0.5">
              <Label>new camera id</Label>
              <TextInput
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="cam-1"
                className="w-28 font-mono"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
              <Label>machine ids</Label>
              <TextInput
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="W-01, W-02"
                className="font-mono"
              />
            </label>
            <Button variant="accent" disabled={!newId.trim()} onClick={add}>
              <Plus size={12} /> add camera
            </Button>
            {addErr && <span className="text-error w-full text-xs break-words">{addErr}</span>}
          </div>
        </div>
      )}
    </Section>
  );
}
