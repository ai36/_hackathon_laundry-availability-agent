import type { ComponentProps } from "react";
import Link from "next/link";

import { buttonClasses, type Variant } from "@/components/ui/button";

/**
 * A navigation control that *looks* like a Button. Use this instead of wrapping <Button> in
 * <Link> — that renders <a><button>, which is invalid HTML and a nested interactive control
 * (WCAG 4.1.2). This is a single <a> with the shared button classes.
 */
export function LinkButton({
  variant = "outline",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClasses(variant, className)} />;
}
