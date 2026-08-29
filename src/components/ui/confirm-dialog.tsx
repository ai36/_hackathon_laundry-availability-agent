"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "radix-ui";

import { Button } from "@/components/ui/button";

/**
 * A controlled yes/no dialog (Radix AlertDialog): focus-trapped, Esc / overlay-click
 * cancels. `open` + `onOpenChange` drive it; `onConfirm` runs on the action button.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "confirm",
  confirmVariant = "default",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="border-outline-variant bg-surface-container-high fixed top-1/2 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-5 shadow-xl">
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="text-on-surface-variant mt-1.5 text-sm">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={busy}>
                cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={confirmVariant}
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
