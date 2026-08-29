"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, ShieldHalf, SlidersHorizontal, WashingMachine } from "lucide-react";

/**
 * Global navigation frame (Lumina Wash): a fixed left rail on desktop, a fixed bottom bar
 * on phones. Three destinations, one per URL route — no query-param "mode" toggle.
 */
const NAV = [
  { href: "/tenant", label: "Live status", Icon: Radio },
  { href: "/integrator", label: "Integrator", Icon: ShieldHalf },
  { href: "/integrator/settings", label: "Settings", Icon: SlidersHorizontal },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/integrator") return pathname === "/integrator";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/tenant";

  return (
    <>
      {/* Desktop rail */}
      <nav className="border-outline-variant bg-surface-container fixed top-0 left-0 z-40 hidden h-full w-60 flex-col border-r md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <WashingMachine size={22} className="text-primary-container" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">Laundry room</span>
        </div>
        <ul className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-r-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-container text-[#00251a]"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex min-h-full flex-1 flex-col pb-16 md:ml-60 md:pb-0">{children}</div>

      {/* Mobile bottom bar */}
      <nav className="border-outline-variant bg-surface-container-highest fixed bottom-0 left-0 z-50 flex w-full justify-around rounded-t-xl border-t md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary-container" : "text-on-surface-variant"
              }`}
            >
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
