"use client";

import { useEffect, useState } from "react";

import { Section } from "@/components/ui/section";
import type { Laundry3Config } from "@/config";

type Payload = { config?: Laundry3Config; overridden?: string[] };

const GROUPS: { key: keyof Laundry3Config; title: string }[] = [
  { key: "site", title: "Site" },
  { key: "agent", title: "Agent" },
  { key: "frames", title: "Frames" },
  { key: "runtime", title: "Runtime" },
  { key: "cycles", title: "Cycles" },
  { key: "reservation", title: "Reservation" },
  { key: "portal", title: "Portal" },
  { key: "paths", title: "Paths" },
];

/** Flatten a nested object into `[dotted key, printable value]` rows. */
function rows(obj: unknown, prefix = ""): [string, string][] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      rows(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [[prefix, typeof obj === "string" ? obj : JSON.stringify(obj)]];
}

/**
 * Read-only view of the deployment config (`laundry3.config.ts` → `src/config/defaults.ts`).
 * Editing lives in that file — the same values feed the offline eval, so they stay in one
 * place. A dot marks a value overridden from the built-in default.
 */
export function ConfigView() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Payload) => setData(d))
      .catch(() => setData({}));
  }, []);

  const cfg = data?.config;
  const overridden = new Set(data?.overridden ?? []);

  return (
    <Section title="Configuration">
      <p className="text-on-surface-variant mb-4 text-xs">
        Deployment knobs, resolved from <span className="font-mono">laundry3.config.ts</span> and
        validated on load. Read-only here — the same values drive the offline eval, so they are
        edited in one place. A <span className="text-primary-container">•</span> marks a value
        overridden from the built-in default. <span className="font-mono">site.machines.*</span> is
        a declared sanity-check, not the live roster (that comes from the cameras above).
      </p>
      {!cfg ? (
        <p className="text-on-surface-variant text-xs">loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {GROUPS.map((g) => (
            <div key={g.key}>
              <div className="text-2xs text-on-surface-variant mb-2 font-semibold tracking-[0.1em] uppercase">
                {g.title}
              </div>
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {rows(cfg[g.key], g.key).map(([k, v]) => {
                  const short = k.slice(g.key.length + 1);
                  return (
                    <div
                      key={k}
                      className="border-outline-variant/40 flex min-w-0 items-baseline justify-between gap-3 border-b py-1"
                    >
                      <dt className="text-on-surface-variant min-w-0 truncate font-mono text-xs">
                        {overridden.has(k) && (
                          <span className="text-primary-container mr-1" aria-hidden="true">
                            •
                          </span>
                        )}
                        {short}
                      </dt>
                      <dd className="shrink-0 font-mono text-xs tabular-nums">{v}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
