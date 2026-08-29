"use client";

import { Switch as RadixSwitch } from "radix-ui";

/** Small on/off toggle (Radix). */
export function Switch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative h-5 w-9 shrink-0 rounded-full bg-zinc-300 transition-colors outline-none data-[state=checked]:bg-emerald-600 dark:bg-zinc-700"
    >
      <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[1.125rem]" />
    </RadixSwitch.Root>
  );
}
