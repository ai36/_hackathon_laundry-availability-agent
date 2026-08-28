"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { enableStaticRendering } from "mobx-react-lite";

import { initRootStore, type RootStore, type RootStoreHydration } from "./root-store";

// Disables observer tracking during SSR so server renders don't leak subscriptions.
enableStaticRendering(typeof window === "undefined");

const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: RootStoreHydration;
}) {
  // Lazy initializer runs once; the instance is stable for the life of the provider.
  const [store] = useState(() => initRootStore(initialData));
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): RootStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within a <StoreProvider>");
  }
  return store;
}
