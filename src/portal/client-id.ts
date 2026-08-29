"use client";

import { useSyncExternalStore } from "react";

const KEY = "laundry3.clientId";
const make = () => `c-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

function readOrCreate(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = make();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

const noop = () => () => {};

/**
 * A stable anonymous id for this browser (localStorage). Used as the `by` of a reservation —
 * there is no login in this build. `useSyncExternalStore` keeps SSR (`""`) and the client
 * value hydration-safe.
 */
export function useClientId(): string {
  return useSyncExternalStore(noop, readOrCreate, () => "");
}
