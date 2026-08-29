import { MachineCard } from "@/components/machine-card";
import type { MachineView } from "@/portal/room-status";

/** Responsive machine grid: 1 col on phones, 2 from ~560px, 3 on large screens. */
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
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <MachineCard key={m.machineId} m={m} integrator={integrator} />
        ))}
      </div>
    </section>
  );
}
