"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Consistent raised panel (Lumina Wash surface-container-high). `collapsible` adds a
 * chevron toggle (closed by default unless `defaultOpen`).
 */
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
    <section className="border-outline-variant bg-surface-container-high mb-6 rounded-lg border p-4 md:p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-left text-base font-semibold"
        >
          <ChevronRight
            size={18}
            className={`text-on-surface-variant shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          {title}
        </button>
      ) : (
        <h2 className="text-base font-semibold">{title}</h2>
      )}
      {(!collapsible || open) && body}
    </section>
  );
}
