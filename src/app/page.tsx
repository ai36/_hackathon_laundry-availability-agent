import { RoomStatus } from "@/components/room-status";
import { buildRoomStatus } from "@/portal/room-status";
import { StoreProvider } from "@/stores";

// Server Component: read the committed eval report at request time (no API call) and
// hydrate the MobX store with the fused per-machine status.
export default function Home() {
  const room = buildRoomStatus();
  return (
    <StoreProvider initialData={{ room }}>
      <RoomStatus />
    </StoreProvider>
  );
}
