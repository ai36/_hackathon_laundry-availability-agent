import { resolvePortalConfig } from "@/config";
import { IntegratorView } from "@/components/integrator-view";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Integrator console. Server-rendered per request so it reflects the live data/corrections/,
// data/machines.json, and data/config-overrides.json — not statically prerendered.
export const dynamic = "force-dynamic";

export default function IntegratorPage() {
  const room = buildRoomStatus();
  const refreshSeconds = resolvePortalConfig().runtime.stateRefreshSeconds;
  return (
    <StoreProvider initialData={{ room, refreshSeconds }}>
      <IntegratorView />
    </StoreProvider>
  );
}
