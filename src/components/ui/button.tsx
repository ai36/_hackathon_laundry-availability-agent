"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "outline" | "ghost" | "danger" | "accent";

/**
 * Lumina Wash buttons. Primary (`default`/`accent`) = mint fill + near-black text for max
 * contrast; `outline`/`ghost` = no fill; `danger` = red, reserved for delete / report-error.
 */
const VARIANT: Record<Variant, string> = {
  default: "bg-primary-container text-[#00251a] hover:bg-primary",
  accent: "bg-primary-container text-[#00251a] hover:bg-primary",
  outline: "border border-outline-variant text-on-surface hover:bg-surface-container-highest",
  ghost: "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
  danger: "border border-error/50 text-error hover:bg-error/10",
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
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    />
  );
}
