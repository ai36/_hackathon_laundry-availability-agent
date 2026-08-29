"use client";

import { Switch as RadixSwitch } from "radix-ui";

/**
 * Slim on/off toggle (Radix). The 24px visual track sits inside a 36px-tall transparent
 * hit area (WCAG 2.5.8 with headroom). `label` is required — the Radix root is a
 * `<button role="switch">`, so a wrapping `<label>` does NOT name it.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      aria-label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="group inline-flex h-9 w-11 shrink-0 items-center outline-none"
    >
      <span className="bg-surface-variant group-data-[state=checked]:bg-primary-container pointer-events-none relative block h-6 w-11 rounded-full transition-colors">
        <RadixSwitch.Thumb className="bg-on-surface absolute top-0.5 left-0.5 block h-5 w-5 rounded-full transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[#00251a]" />
      </span>
    </RadixSwitch.Root>
  );
}
