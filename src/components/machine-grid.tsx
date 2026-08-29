"use client";

import { useId, useState } from "react";

import { MachineCard } from "@/components/machine-card";
import { DisclosureButton } from "@/components/ui/collapsible";
import type { MachineView } from "@/portal/room-status";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const HEADING = "mb-3 text-xs font-semibold tracking-[0.15em] text-on-surface-variant uppercase";

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
        <DisclosureButton open={open} onToggle={() => setOpen((o) => !o)} controls={bodyId}>
          {heading}
        </DisclosureButton>
      ) : (
        <h2 className={HEADING}>{heading}</h2>
      )}
      <div id={bodyId} className={collapsible && !open ? "hidden" : GRID}>
        {list.map((m) => (
          <MachineCard key={m.machineId} m={m} integrator={integrator} />
        ))}
      </div>
    </section>
  );
}
