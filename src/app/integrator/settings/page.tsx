import { IntegratorSettings } from "@/components/integrator-settings";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Integrator settings: machines + cameras CRUD. Server-rendered per request.
export const dynamic = "force-dynamic";

export default function IntegratorSettingsPage() {
  const room = buildRoomStatus();
  return (
    <StoreProvider initialData={{ room }}>
      <IntegratorSettings />
    </StoreProvider>
  );
}
