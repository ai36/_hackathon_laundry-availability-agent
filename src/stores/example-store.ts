import { makeAutoObservable } from "mobx";

import type { RootStore } from "./root-store";

/**
 * Placeholder domain store to demonstrate the MobX wiring.
 * Replace with real laundry3 domain stores (orders, machines, schedule, ...).
 */
export class ExampleStore {
  count = 0;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false }, { autoBind: true });
  }

  increment() {
    this.count += 1;
  }

  reset() {
    this.count = 0;
  }

  get isPristine() {
    return this.count === 0;
  }
}
