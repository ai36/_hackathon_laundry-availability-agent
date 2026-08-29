"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** Consistent bordered panel. `collapsible` adds a chevron toggle (open by default = false). */
export function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const body = <div className="mt-3">{children}</div>;

  return (
    <section className="mb-6 rounded-lg border border-zinc-200/70 p-4 dark:border-zinc-800">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 text-left text-sm font-semibold"
        >
          <ChevronRight
            size={16}
            className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          {title}
        </button>
      ) : (
        <h2 className="text-sm font-semibold">{title}</h2>
      )}
      {(!collapsible || open) && body}
    </section>
  );
}
