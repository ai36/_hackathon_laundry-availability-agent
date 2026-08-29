"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";

import { Button, ICON_BUTTON } from "@/components/ui/button";
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

/** `/api/asset` URL for previewing a repo-relative image path. */
const assetUrl = (path: string) => `/api/asset?path=${encodeURIComponent(path)}`;

function ImageField({
  label,
  kind,
  ownerId,
  current,
  onChange,
}: {
  label: string;
  kind: string;
  ownerId: string;
  current?: string;
  /** A path sets the field; `null` clears it. */
  onChange: (path: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <Label>{label}</Label>
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
            onChange(await upload(f, kind, ownerId));
          } catch (x) {
            setErr(x instanceof Error ? x.message : "upload failed");
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      {current ? (
        <div className="flex items-start gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(current)}
            alt=""
            width={64}
            height={64}
            className="border-outline-variant bg-surface h-16 w-16 shrink-0 rounded border object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-outline font-mono break-all">{current}</span>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
                <Upload size={16} aria-hidden="true" /> {busy ? "uploading…" : "replace"}
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => onChange(null)}
                aria-label={`remove ${label}`}
                className={ICON_BUTTON}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <span className="text-outline">none</span>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => ref.current?.click()}
            className="self-start"
          >
            <Upload size={16} aria-hidden="true" /> {busy ? "uploading…" : "upload"}
          </Button>
        </>
      )}
      {err && (
        <span role="alert" className="text-error break-words">
          {err}
        </span>
      )}
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

  const patch = (extra: Record<string, unknown>) =>
    run(() => call("PATCH", { targetId: cam.id, id: id.trim(), machineIdsText: text, ...extra }));

  return (
    <div className="border-outline-variant bg-surface-container flex flex-col gap-3 rounded border p-3">
      <label className="flex min-w-0 flex-col gap-1">
        <Label>camera id</Label>
        <TextInput
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="C-01…"
          autoComplete="off"
          spellCheck={false}
          className="w-28 font-mono"
        />
      </label>
      <label className="flex flex-col gap-1">
        <Label>machine ids this camera sees (free text)</Label>
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="W-01, W-02, W-03…"
          autoComplete="off"
          spellCheck={false}
          className="w-full font-mono"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageField
          label="stub image — stands in as this camera's feed"
          kind="camera-stub"
          ownerId={cam.id}
          current={cam.stubImage}
          onChange={(p) => patch({ stubImage: p })}
        />
        <ImageField
          label="region map — each machine's panel painted one colour (see maskLegend)"
          kind="camera-mask"
          ownerId={cam.id}
          current={cam.mask}
          onChange={(p) => patch({ mask: p })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default" disabled={busy || !dirty} onClick={() => patch({})}>
          save
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (confirm(`Remove camera ${cam.id}?`)) void run(() => call("DELETE", { id: cam.id }));
          }}
          aria-label={`remove camera ${cam.id}`}
        >
          <Trash2 size={16} aria-hidden="true" /> remove
        </Button>
        {err && (
          <span role="alert" className="text-error text-xs break-words">
            {err}
          </span>
        )}
      </div>
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
    <Section title={`Cameras (${list.length})`}>
      <p className="text-on-surface-variant mb-4 text-xs">
        Each camera: an id (convention <span className="font-mono">C-01</span>,{" "}
        <span className="font-mono">C-02</span>… to match <span className="font-mono">W-</span>/
        <span className="font-mono">D-</span> machines), the machine ids it observes (free text),
        and — optionally — a <em>stub image</em> for its feed and a <em>region map</em> (each
        machine&apos;s panel painted one colour; the <span className="font-mono">maskLegend</span>{" "}
        in <span className="font-mono">site-config.json</span> maps colour → id). The stub image is
        what <span className="font-mono">refresh</span> analyses (one whole-frame call per camera);
        the region map feeds the offline <span className="font-mono">--mode=roi</span> eval.
      </p>
      {!loaded ? (
        <p className="text-on-surface-variant text-xs">loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.length === 0 && <p className="text-outline text-xs">no cameras yet</p>}
          {list.map((cam) => (
            <CameraRow key={cam.id} cam={cam} onList={setList} />
          ))}
          <div className="border-outline-variant flex flex-wrap items-end gap-3 rounded border border-dashed p-3">
            <label className="flex flex-col gap-1">
              <Label>new camera id</Label>
              <TextInput
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="C-01…"
                autoComplete="off"
                spellCheck={false}
                className="w-28 font-mono"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
              <Label>machine ids</Label>
              <TextInput
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="W-01, W-02…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </label>
            <Button variant="accent" disabled={!newId.trim()} onClick={add}>
              <Plus size={16} aria-hidden="true" /> add camera
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
