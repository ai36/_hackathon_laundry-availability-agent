"use client";

import { useId, useState, type ReactNode } from "react";

import { DisclosureButton } from "@/components/ui/collapsible";

/**
 * A collapsible settings section. Same heading treatment as the machine grids on the other
 * pages (see `DisclosureButton`) — no card chrome, just a label + body.
 */
export function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section>
      <DisclosureButton open={open} onToggle={() => setOpen((o) => !o)} controls={bodyId}>
        {title}
      </DisclosureButton>
      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
