import { resolvePortalConfig } from "@/config";
import { RoomView } from "@/components/room-view";
import { activeReservations } from "@/portal/reservations";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Tenant room view. Server-rendered per request so it reflects live corrections and
// reservations (which expire on a timer). No model call.
export const dynamic = "force-dynamic";

export default function TenantPage() {
  const room = buildRoomStatus(undefined, undefined, undefined, activeReservations());
  const { enabled, maxActivePerUser } = resolvePortalConfig().reservation;
  return (
    <StoreProvider
      initialData={{
        room,
        reservationEnabled: enabled,
        reservationLimit: maxActivePerUser,
      }}
    >
      <RoomView />
    </StoreProvider>
  );
}
