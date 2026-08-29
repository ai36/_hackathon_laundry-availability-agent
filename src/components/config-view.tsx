"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Select, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { Laundry3Config } from "@/config";

type Cfg = Laundry3Config;
type Payload = { config?: Cfg; defaults?: Cfg; overridden?: string[]; locked?: string[] };
type Leaf = string | number | boolean;

const GROUPS: { key: keyof Cfg; title: string }[] = [
  { key: "site", title: "Site" },
  { key: "agent", title: "Agent" },
  { key: "frames", title: "Frames" },
  { key: "runtime", title: "Runtime" },
  { key: "cycles", title: "Cycles" },
  { key: "reservation", title: "Reservation" },
  { key: "portal", title: "Portal" },
  { key: "paths", title: "Paths" },
];

const VISION_EFFORT = ["none", "low", "medium", "high"];
const VISION_MODELS = ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5", "claude-fable-5"];
const PX_PRESETS = [1024, 1280, 1440, 1600, 1920, 2560, 3840];
const UTC_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12); // -12 .. +14

/** Current whole-hour UTC offset of an IANA zone, or null if it can't be read. */
function ianaOffsetHours(tz: string): number | null {
  try {
    const name =
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    if (name === "GMT" || name === "UTC") return 0;
    const m = /GMT([+-]\d{1,2})/.exec(name);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

const offsetToIana = (h: number) =>
  h === 0 ? "Etc/UTC" : h > 0 ? `Etc/GMT-${h}` : `Etc/GMT+${-h}`;
const fmtOffset = (h: number) =>
  `UTC${h < 0 ? "−" : "+"}${String(Math.abs(h)).padStart(2, "0")}:00`;

function leaves(obj: unknown, prefix = ""): [string, Leaf][] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leaves(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [[prefix, obj as Leaf]];
}

function getPath(obj: unknown, path: string): Leaf {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj) as Leaf;
}

/** Immutable set of `obj` at `path` to `value`. */
function setPath<T>(obj: T, path: string, value: Leaf): T {
  const keys = path.split(".");
  const clone: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] as Record<string, unknown>) };
    cur = cur[keys[i]] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

/** Coerce an edited value back to the type of the same leaf in `defaults`. */
function coerce(v: Leaf, refType: Leaf): Leaf {
  if (typeof refType === "number") return v === "" ? NaN : Number(v);
  if (typeof refType === "boolean") return Boolean(v);
  return String(v);
}

function Field({
  path,
  value,
  refValue,
  dirty,
  onEdit,
}: {
  path: string;
  value: Leaf;
  refValue: Leaf;
  dirty: boolean;
  onEdit: (path: string, v: Leaf) => void;
}) {
  const amber = dirty ? "border-secondary-container" : "";

  if (typeof refValue === "boolean") {
    return (
      <Switch label={path} checked={Boolean(value)} onCheckedChange={(v) => onEdit(path, v)} />
    );
  }

  if (path === "site.timezone") {
    const cur = ianaOffsetHours(String(value));
    return (
      <Select
        value={cur === null ? "" : String(cur)}
        onChange={(e) => onEdit(path, offsetToIana(Number(e.target.value)))}
        className={`w-32 ${amber}`}
      >
        {cur === null && <option value="">{String(value)}</option>}
        {UTC_OFFSETS.map((h) => (
          <option key={h} value={h}>
            {fmtOffset(h)}
          </option>
        ))}
      </Select>
    );
  }

  if (path === "agent.visionModel" || path === "agent.visionEffort") {
    const opts =
      path === "agent.visionEffort"
        ? VISION_EFFORT
        : [...new Set([String(value), ...VISION_MODELS])];
    return (
      <Select
        value={String(value)}
        onChange={(e) => onEdit(path, e.target.value)}
        className={`w-44 ${amber}`}
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }

  if (path === "frames.maxStillPx" || path === "frames.maxVideoPx") {
    const opts = [...new Set([Number(value), ...PX_PRESETS])].sort((a, b) => a - b);
    return (
      <Select
        value={String(value)}
        onChange={(e) => onEdit(path, Number(e.target.value))}
        className={`w-28 ${amber}`}
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <TextInput
      type={typeof refValue === "number" ? "number" : "text"}
      inputMode={typeof refValue === "number" ? "decimal" : undefined}
      step="any"
      value={String(value)}
      onChange={(e) => onEdit(path, e.target.value)}
      spellCheck={false}
      autoComplete="off"
      className={`w-40 text-right font-mono ${amber}`}
    />
  );
}

/**
 * Editable view of the deployment config. `save` persists the non-`paths` / non-machine-count
 * fields to `data/config-overrides.json` (git-ignored, portal-runtime only — the offline
 * eval is not affected). A dirty field is highlighted amber; a `•` marks values that differ
 * from the built-in default.
 */
export function ConfigView() {
  const [loaded, setLoaded] = useState<Cfg | null>(null);
  const [draft, setDraft] = useState<Cfg | null>(null);
  const [defaults, setDefaults] = useState<Cfg | null>(null);
  const [overridden, setOverridden] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<string[]>(["paths.", "site.machines."]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function apply(d: Payload) {
    if (d.config) {
      setLoaded(d.config);
      setDraft(structuredClone(d.config));
    }
    if (d.defaults) setDefaults(d.defaults);
    setOverridden(new Set(d.overridden ?? []));
    if (d.locked) setLocked(d.locked);
  }

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Payload) => apply(d))
      .catch(() => setErr("could not load config"));
  }, []);

  const isLocked = (p: string) => locked.some((prefix) => p.startsWith(prefix));
  const dirtyPaths =
    loaded && draft
      ? leaves(draft)
          .filter(([p]) => getPath(draft, p) !== getPath(loaded, p))
          .map(([p]) => p)
      : [];
  const anyDirty = dirtyPaths.length > 0;

  function edit(path: string, value: Leaf) {
    setDraft((d) => (d ? setPath(d, path, value) : d));
  }

  async function save() {
    if (!draft || !defaults) return;
    setBusy(true);
    setErr(null);
    let patch: Cfg = structuredClone(draft);
    for (const [p, v] of leaves(draft)) {
      if (isLocked(p)) continue;
      patch = setPath(patch, p, coerce(v, getPath(defaults, p)));
    }
    for (const [p] of leaves(patch)) {
      if (isLocked(p)) patch = setPath(patch, p, getPath(defaults, p));
    }
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = (await res.json()) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
      apply(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    if (loaded) setDraft(structuredClone(loaded));
    setErr(null);
  }

  return (
    <Section title="Configuration">
      <p className="text-on-surface-variant mb-4 text-xs">
        Deployment knobs, validated on load. Edits are saved to{" "}
        <span className="font-mono">data/config-overrides.json</span> and apply to the portal
        runtime — the offline eval always uses <span className="font-mono">laundry3.config.ts</span>
        . A <span className="text-primary-container">•</span> marks a value overridden from the
        built-in default; an amber field is an unsaved edit.{" "}
        <span className="font-mono">paths.*</span> and{" "}
        <span className="font-mono">site.machines.*</span> are read-only — the roster is managed in
        the Machines section above.
      </p>

      {!draft ? (
        <p className="text-on-surface-variant text-xs">loading…</p>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {GROUPS.map((g) => (
              <div key={g.key}>
                <div className="text-2xs text-on-surface-variant mb-2 font-semibold tracking-[0.1em] uppercase">
                  {g.title}
                </div>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                  {leaves(draft[g.key], String(g.key)).map(([path, value]) => {
                    const short = path.slice(String(g.key).length + 1);
                    const dirty = getPath(draft, path) !== getPath(loaded, path);
                    const refValue = defaults ? getPath(defaults, path) : value;
                    return (
                      <div
                        key={path}
                        className={`border-outline-variant/40 flex min-w-0 items-center justify-between gap-3 rounded border-b py-1 pr-1 ${
                          dirty ? "bg-secondary-container/[0.06]" : ""
                        }`}
                      >
                        <dt className="text-on-surface-variant min-w-0 truncate font-mono text-xs">
                          {overridden.has(path) && (
                            <span className="text-primary-container mr-1" aria-hidden="true">
                              •
                            </span>
                          )}
                          {short}
                        </dt>
                        <dd className="shrink-0">
                          {isLocked(path) ? (
                            <span className="text-outline font-mono text-xs">{String(value)}</span>
                          ) : (
                            <Field
                              path={path}
                              value={value}
                              refValue={refValue}
                              dirty={dirty}
                              onEdit={edit}
                            />
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>

          {err && (
            <p role="alert" className="text-error mt-4 text-xs break-words">
              {err}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="default" disabled={busy || !anyDirty} onClick={save}>
              save
            </Button>
            <Button variant="ghost" disabled={busy || !anyDirty} onClick={cancel}>
              cancel
            </Button>
            {anyDirty && (
              <span className="text-on-surface-variant text-xs">
                {dirtyPaths.length} unsaved change{dirtyPaths.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  );
}
