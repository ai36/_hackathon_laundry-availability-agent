import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

/**
 * Lumina Wash inputs: dark fill, 1px outline, primary border on focus. `min-h-9` matches
 * the button height for a consistent control rhythm. `focus-visible:outline-none` (not
 * `focus:`) so the border shift is the mouse affordance and the global ring still shows on
 * keyboard focus. Labels render separately via <Label> so they stay visible while typing.
 */
const base =
  "min-h-9 min-w-0 rounded border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface placeholder:text-outline focus:border-primary-container focus-visible:outline-none";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="text-on-surface-variant text-xs font-semibold tracking-[0.03em]">
      {children}
      {hint && <span className="text-outline ml-1 font-normal">{hint}</span>}
    </span>
  );
}
