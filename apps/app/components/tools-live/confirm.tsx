"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";

/** "Make a new key/link?" and "Delete it?": asks first, then runs the action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  cancel = "Keep the old one",
  onConfirm,
  danger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirm: string;
  cancel?: string;
  onConfirm: () => Promise<void>;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="soft" size="md" disabled={busy} />}>{cancel}</DialogClose>
          <Button
            size="md"
            variant={danger ? "secondary" : "primary"}
            className={danger ? "bg-danger hover:bg-danger/90" : undefined}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
