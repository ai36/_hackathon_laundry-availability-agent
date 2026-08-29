import { MachineCard } from "@/components/machine-card";
import type { MachineView } from "@/portal/room-status";

/** Fluid-to-fixed grid (Lumina Wash): 1 col on phones → 2 on tablet → 3 → 4 on wide. */
export function MachineGrid({
  title,
  list,
  integrator = false,
}: {
  title: string;
  list: MachineView[];
  integrator?: boolean;
}) {
  return (
    <section>
      <h2 className="text-on-surface-variant mb-3 text-xs font-semibold tracking-[0.15em] uppercase">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((m) => (
          <MachineCard key={m.machineId} m={m} integrator={integrator} />
        ))}
      </div>
    </section>
  );
}
