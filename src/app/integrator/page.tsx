import { IntegratorView } from "@/components/integrator-view";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Integrator console. Server-rendered per request so it reflects the live data/corrections/
// and data/machines.json — not statically prerendered.
export const dynamic = "force-dynamic";

export default function IntegratorPage() {
  const room = buildRoomStatus();
  return (
    <StoreProvider initialData={{ room }}>
      <IntegratorView />
    </StoreProvider>
  );
}
