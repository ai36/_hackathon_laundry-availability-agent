import type { ReactNode } from "react";

/**
 * Shared page frame: one max width, one padding scale, one header shape (title + optional
 * subtitle + a right-aligned nav slot that wraps under the title on narrow screens).
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
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {nav && <div className="flex flex-wrap gap-2">{nav}</div>}
        </div>
        {subtitle && <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>}
      </header>
      {children}
      {footer && (
        <footer className="mt-8 border-t border-zinc-200/60 pt-4 text-xs break-words text-zinc-400 dark:border-zinc-800">
          {footer}
        </footer>
      )}
    </main>
  );
}
