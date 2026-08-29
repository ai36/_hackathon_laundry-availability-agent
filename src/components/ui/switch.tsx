"use client";

import { Switch as RadixSwitch } from "radix-ui";

/** Slim on/off toggle (Radix). Track takes the primary colour when on. */
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
      className="bg-surface-variant data-[state=checked]:bg-primary-container relative h-5 w-9 shrink-0 rounded-full transition-colors outline-none"
    >
      <RadixSwitch.Thumb className="bg-on-surface block h-4 w-4 translate-x-0.5 rounded-full transition-transform data-[state=checked]:translate-x-[1.125rem] data-[state=checked]:bg-[#00251a]" />
    </RadixSwitch.Root>
  );
}
