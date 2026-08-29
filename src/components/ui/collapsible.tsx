"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * The one collapsible-list heading used everywhere (Live status / Integrator machine
 * grids, Settings sections): an uppercase label with a rotating chevron that toggles its
 * body. Wire the body with `id={controls}` + `hidden={!open}`.
 */
export function DisclosureButton({
  open,
  onToggle,
  controls,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="text-on-surface-variant mb-3 flex min-h-10 items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase"
    >
      <ChevronRight
        size={14}
        aria-hidden="true"
        className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      />
      {children}
    </button>
  );
}
