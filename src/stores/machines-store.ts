import { makeAutoObservable } from "mobx";

import type { MachineState } from "@/eval/types";
import type { MachineView, RoomStatus } from "@/portal/room-status";

import type { RootStore } from "./root-store";

/** Portal-side machine state, hydrated from a committed eval report (see room-status.ts). */
export class MachinesStore {
  machines: MachineView[] = [];
  model = "";
  reportPath = "";

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false }, { autoBind: true });
  }

  hydrate(room: RoomStatus) {
    this.machines = room.machines;
    this.model = room.provenance.model;
    this.reportPath = room.provenance.report;
  }

  get washers() {
    return this.machines.filter((m) => m.type === "washer");
  }
  get dryers() {
    return this.machines.filter((m) => m.type === "dryer");
  }
  get counts(): Record<MachineState, number> {
    const c: Record<MachineState, number> = { free: 0, occupied: 0, unknown: 0, out_of_order: 0 };
    for (const m of this.machines) c[m.state]++;
    return c;
  }
  get freeIds() {
    return this.machines.filter((m) => m.state === "free").map((m) => m.machineId);
  }
}
