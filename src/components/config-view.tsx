"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Select, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { Laundry3Config } from "@/config";

type Cfg = Laundry3Config;
type Payload = { config?: Cfg; defaults?: Cfg; overridden?: string[]; locked?: string[] };

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

type Leaf = string | number | boolean;

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
function coerce(v: Leaf, ref: Leaf): Leaf {
  if (typeof ref === "number") return v === "" ? NaN : Number(v);
  if (typeof ref === "boolean") return Boolean(v);
  return String(v);
}

/**
 * Editable view of the deployment config. `save` persists the non-`paths` fields to
 * `data/config-overrides.json` (git-ignored, portal-runtime only — the offline eval is not
 * affected). A dirty field is highlighted amber; a `•` marks values that differ from the
 * built-in default.
 */
export function ConfigView() {
  const [loaded, setLoaded] = useState<Cfg | null>(null);
  const [draft, setDraft] = useState<Cfg | null>(null);
  const [defaults, setDefaults] = useState<Cfg | null>(null);
  const [overridden, setOverridden] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<string[]>(["paths."]);
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
    // Rebuild a patch with every non-locked leaf coerced to its default's type.
    let patch: Cfg = structuredClone(draft);
    for (const [p, v] of leaves(draft)) {
      if (isLocked(p)) continue;
      patch = setPath(patch, p, coerce(v, getPath(defaults, p)));
    }
    // Drop the locked group so `paths` always comes from source.
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
        <span className="font-mono">paths.*</span> is read-only;{" "}
        <span className="font-mono">site.machines.*</span> is a declared sanity-check, not the live
        roster (that comes from the cameras above).
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
                    const ref = defaults ? getPath(defaults, path) : value;
                    const locked = isLocked(path);
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
                          {locked ? (
                            <span className="text-outline font-mono text-xs">{String(value)}</span>
                          ) : typeof ref === "boolean" ? (
                            <Switch
                              label={short}
                              checked={Boolean(value)}
                              onCheckedChange={(v) => edit(path, v)}
                            />
                          ) : path === "agent.visionEffort" ? (
                            <Select
                              value={String(value)}
                              onChange={(e) => edit(path, e.target.value)}
                              className={`w-28 ${dirty ? "border-secondary-container" : ""}`}
                            >
                              {VISION_EFFORT.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <TextInput
                              type={typeof ref === "number" ? "number" : "text"}
                              inputMode={typeof ref === "number" ? "decimal" : undefined}
                              step="any"
                              value={String(value)}
                              onChange={(e) => edit(path, e.target.value)}
                              spellCheck={false}
                              autoComplete="off"
                              className={`w-40 text-right font-mono ${
                                dirty ? "border-secondary-container" : ""
                              }`}
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
