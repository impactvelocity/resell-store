"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/dialog";
import { useToast } from "@repo/ui/toast";

/*
 * Secret field behaviour (spec E, "Secret field and permissions"):
 * hidden by default with the last few characters showing, "Show" reveals it
 * for 30 seconds, "Copy" copies the whole value, "Make a new one" asks first.
 */

const REVEAL_MS = 30_000;

export type SecretSource = {
  maskedPrefix: string;
  maskedShortPrefix: string;
  fullPrefix: string;
  suffix: string;
};

function randomSuffix(length: number) {
  const chars = "abcdefghjkmnpqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function useSecret(source: SecretSource) {
  const [suffix, setSuffix] = useState(source.suffix);
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toggleReveal = () => {
    if (timer.current) clearTimeout(timer.current);
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    timer.current = setTimeout(() => setRevealed(false), REVEAL_MS);
  };

  const regenerate = () => {
    if (timer.current) clearTimeout(timer.current);
    setRevealed(false);
    setSuffix(randomSuffix(source.suffix.length));
  };

  const full = source.fullPrefix + suffix;

  return {
    suffix,
    full,
    revealed,
    toggleReveal,
    regenerate,
    display: revealed ? full : source.maskedPrefix + suffix,
    displayShort: revealed ? full : source.maskedShortPrefix + suffix,
  };
}

/** "Make a new link/key" confirmation. The old one stops working at once. */
export function RegenerateDialog({
  open,
  onOpenChange,
  thing,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "link" or "key" */
  thing: string;
  onConfirm: () => void;
}) {
  const toast = useToast();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Make a new {thing}?</DialogTitle>
        <DialogDescription>
          The old {thing} stops working right away, and every app using it has
          to be set up again with the new one.
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="soft" size="md" />}>
            Keep the old one
          </DialogClose>
          <Button
            size="md"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
              toast.add({
                title: `New ${thing} made. The old one stopped working.`,
              });
            }}
          >
            Make a new {thing}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
