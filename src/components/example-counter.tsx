"use client";

import { observer } from "mobx-react-lite";

import { useStore } from "@/stores";

/**
 * Scaffolding component: proves the MobX observer <-> store wiring works.
 * Safe to delete once real laundry3 features land.
 */
export const ExampleCounter = observer(function ExampleCounter() {
  const { example } = useStore();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]">
      <span className="font-mono tabular-nums">count: {example.count}</span>
      <button
        type="button"
        onClick={() => example.increment()}
        className="bg-foreground text-background rounded-md px-3 py-1 transition-colors hover:opacity-80"
      >
        increment
      </button>
      <button
        type="button"
        onClick={() => example.reset()}
        disabled={example.isPristine}
        className="rounded-md border border-black/[.08] px-3 py-1 transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-white/[.06]"
      >
        reset
      </button>
    </div>
  );
});
