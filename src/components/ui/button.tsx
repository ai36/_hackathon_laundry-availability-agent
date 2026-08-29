"use client";

import type { ButtonHTMLAttributes } from "react";

export type Variant = "default" | "outline" | "ghost" | "danger" | "accent";

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

/**
 * Shared control classes. `min-h-10` (40px) clears the WCAG 2.5.8 target-size minimum with
 * headroom for touch. Icon-only callers use `ICON_BUTTON` for a 40×40 square.
 */
export function buttonClasses(variant: Variant = "outline", className = ""): string {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${className}`;
}

/** Icon-only button: 40×40 square, no text padding. Put a `size={24}` glyph inside. */
export const ICON_BUTTON = "h-10 w-10 shrink-0 px-0";

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={buttonClasses(variant, className)} />;
}
