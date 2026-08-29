"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Consistent raised panel (Lumina Wash surface-container-high). `collapsible` adds a
 * disclosure toggle (closed by default unless `defaultOpen`) wired with `aria-expanded` +
 * `aria-controls`.
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
  const bodyId = useId();

  return (
    <section className="border-outline-variant bg-surface-container-high rounded-lg border p-4">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-10 w-full items-center gap-2 text-left text-base font-semibold"
        >
          <ChevronRight
            size={18}
            aria-hidden="true"
            className={`text-on-surface-variant shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          {title}
        </button>
      ) : (
        <h2 className="text-base font-semibold">{title}</h2>
      )}
      <div id={bodyId} hidden={collapsible && !open} className="mt-4">
        {children}
      </div>
    </section>
  );
}
