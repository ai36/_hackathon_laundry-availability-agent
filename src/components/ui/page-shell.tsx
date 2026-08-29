import type { ReactNode } from "react";

/**
 * Shared page frame (Lumina Wash): one max width (1280px), one padding scale, one header
 * shape — title + optional subtitle + a right-aligned slot for contextual actions that
 * wraps under the title on narrow screens. Global navigation lives in <AppShell>.
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
    <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[32px] md:leading-10">
            {title}
          </h1>
          {nav && <div className="flex flex-wrap gap-2">{nav}</div>}
        </div>
        {subtitle && <div className="text-on-surface-variant mt-2 text-sm">{subtitle}</div>}
      </header>
      {children}
      {footer && (
        <footer className="border-outline-variant text-outline mt-10 border-t pt-4 text-[13px] break-words">
          {footer}
        </footer>
      )}
    </main>
  );
}
