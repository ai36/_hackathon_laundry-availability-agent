import { configure } from "mobx";

import { ExampleStore } from "./example-store";

// Fail loudly if state is mutated outside an action.
configure({ enforceActions: "always", computedRequiresReaction: false });

/**
 * Composition root for all MobX domain stores.
 * One instance per request on the server, one long-lived instance in the browser.
 */
export class RootStore {
  example: ExampleStore;

  constructor() {
    this.example = new ExampleStore(this);
  }
}

export type RootStoreHydration = Partial<{
  example: Partial<Pick<ExampleStore, "count">>;
}>;

let browserStore: RootStore | undefined;

export function createRootStore(initialData?: RootStoreHydration): RootStore {
  const store = new RootStore();
  if (initialData?.example?.count != null) {
    store.example.count = initialData.example.count;
  }
  return store;
}

/**
 * Returns a fresh store on the server (per render) and a memoized store in the browser.
 */
export function initRootStore(initialData?: RootStoreHydration): RootStore {
  if (typeof window === "undefined") {
    return createRootStore(initialData);
  }
  if (!browserStore) {
    browserStore = createRootStore(initialData);
  }
  return browserStore;
}
