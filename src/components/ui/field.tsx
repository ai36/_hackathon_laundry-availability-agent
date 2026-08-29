import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

/**
 * Lumina Wash inputs: dark fill, 1px outline, primary border on focus. Labels are rendered
 * separately (outside the field) via <Label> so they stay visible while typing.
 */
const base =
  "min-w-0 rounded border border-outline-variant bg-surface-container px-2.5 py-1.5 text-sm text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="text-on-surface-variant text-[12px] font-semibold tracking-[0.03em]">
      {children}
      {hint && <span className="text-outline ml-1 font-normal">{hint}</span>}
    </span>
  );
}
