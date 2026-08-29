"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";

import { MachineCard } from "@/components/machine-card";
import type { MachineView } from "@/portal/room-status";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const HEADING = "text-xs font-semibold tracking-[0.15em] text-on-surface-variant uppercase";

/**
 * Fluid-to-fixed grid (Lumina Wash): 1 col on phones → 2 → 3 → 4 on wide. The heading
 * always carries the item count; `collapsible` makes it a disclosure toggle.
 */
export function MachineGrid({
  title,
  list,
  integrator = false,
  collapsible = false,
}: {
  title: string;
  list: MachineView[];
  integrator?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const heading = `${title} (${list.length})`;

  return (
    <section>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className={`mb-3 flex min-h-10 items-center gap-2 ${HEADING}`}
        >
          <ChevronRight
            size={14}
            aria-hidden="true"
            className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          {heading}
        </button>
      ) : (
        <h2 className={`mb-3 ${HEADING}`}>{heading}</h2>
      )}
      <div id={bodyId} className={collapsible && !open ? "hidden" : GRID}>
        {list.map((m) => (
          <MachineCard key={m.machineId} m={m} integrator={integrator} />
        ))}
      </div>
    </section>
  );
}
