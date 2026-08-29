import { RoomView } from "@/components/room-view";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Tenant room view. Reads the committed report + corrections at build/request time — no API
// call — so it prerenders. `npm run dev` re-renders per request; the D-0016 container
// revalidates on each fusion cycle.
export default function TenantPage() {
  const room = buildRoomStatus();
  return (
    <StoreProvider initialData={{ room }}>
      <RoomView />
    </StoreProvider>
  );
}
