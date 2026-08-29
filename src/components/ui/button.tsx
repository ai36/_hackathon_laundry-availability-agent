"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "outline" | "ghost" | "danger" | "accent";

const VARIANT: Record<Variant, string> = {
  default:
    "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
  accent: "bg-emerald-600 text-white hover:bg-emerald-500",
  outline:
    "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ghost: "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
  danger: "border border-red-500/50 text-red-500 hover:bg-red-500/10",
};

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
