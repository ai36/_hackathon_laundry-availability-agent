import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

const base =
  "min-w-0 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="text-xs text-zinc-500">
      {children}
      {hint && <span className="ml-1 text-zinc-400">{hint}</span>}
    </span>
  );
}
