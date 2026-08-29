import type { ReactNode } from "react";

/**
 * Shared page frame (Lumina Wash): one max width (1280px), one padding scale, one header
 * shape — title + optional subtitle + a right-aligned slot for contextual actions that
 * wraps under the title on narrow screens. Body children are spaced on a single `space-y-6`
 * rhythm; global navigation lives in <AppShell>.
 */
export function PageShell({
  title,
  subtitle,
  nav,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1280px] scroll-mt-4 px-4 py-6 focus:outline-none sm:px-6 md:px-10 md:py-10"
    >
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] text-balance md:text-[32px] md:leading-10">
            {title}
          </h1>
          {nav && <div className="flex flex-wrap gap-2">{nav}</div>}
        </div>
        {subtitle && <div className="text-on-surface-variant mt-2 text-sm">{subtitle}</div>}
      </header>
      <div className="space-y-6">{children}</div>
      {footer && (
        <footer className="border-outline-variant text-outline mt-10 border-t pt-4 text-xs break-words">
          {footer}
        </footer>
      )}
    </main>
  );
}
