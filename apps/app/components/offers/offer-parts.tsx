"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { Button, IconButton } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/dialog";
import { ChevronRightIcon, LockIcon, PlusIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { OfferStatus } from "../../lib/mock-inbox";

/* Small pieces shared by the offer card (C9), the offer page (C10) and the inbox. */

const toneClasses = {
  pink: "bg-accent-soft",
  leaf: "bg-leaf-100",
  muted: "bg-surface-muted",
} as const;

/** A person's letter avatar. Buyers are pink unless told otherwise. */
export function LetterAvatar({
  initial,
  tone = "pink",
  className,
}: {
  initial: string;
  tone?: keyof typeof toneClasses;
  /** Size and text size, e.g. "size-12 text-xl". */
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold text-text",
        toneClasses[tone],
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** "$20 hold paid": a lock and the amount (spec D, The hold). */
export function HoldBadge({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full bg-secondary-soft pr-3 pl-2 text-sm font-semibold whitespace-nowrap text-secondary",
        className,
      )}
    >
      <LockIcon size={16} strokeWidth={2.4} />${amount} hold paid
    </span>
  );
}

const statusTag: Record<OfferStatus, { label: string; className: string }> = {
  "needs-you": { label: "Needs you", className: "bg-accent-soft text-accent-text" },
  waiting: { label: "Waiting", className: "bg-primary-soft text-text" },
  accepted: { label: "Accepted", className: "bg-secondary-soft text-secondary" },
  declined: { label: "Declined", className: "bg-surface-muted text-text-muted" },
  "ran-out": { label: "Ran out", className: "bg-surface-muted text-text-muted" },
};

export function StatusTag({
  status,
  className,
}: {
  status: OfferStatus;
  className?: string;
}) {
  const tag = statusTag[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tag.className,
        className,
      )}
    >
      {tag.label}
    </span>
  );
}

function MinusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  );
}

/**
 * "Push back": a price stepper filled with the agent's suggestion.
 * The agent sends it and carries on haggling.
 */
export function PriceStepper({
  buyer,
  start,
  min,
  max,
  step = 5,
  onSend,
  onCancel,
  className,
}: {
  buyer: string;
  start: number;
  min: number;
  max: number;
  step?: number;
  onSend: (amount: number) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [value, setValue] = useState(start);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md bg-surface-muted p-4",
        className,
      )}
    >
      <div className="text-sm font-semibold text-text">Ask {buyer} for</div>
      <div className="flex items-center gap-3">
        <IconButton
          aria-label={`$${step} less`}
          size="sm"
          disabled={value - step < min}
          onClick={() => setValue((v) => Math.max(min, v - step))}
        >
          <MinusIcon size={18} />
        </IconButton>
        <output
          aria-live="polite"
          className="min-w-[4ch] text-center font-display text-3xl font-extrabold tracking-tight"
        >
          ${value}
        </output>
        <IconButton
          aria-label={`$${step} more`}
          size="sm"
          disabled={value + step > max}
          onClick={() => setValue((v) => Math.min(max, v + step))}
        >
          <PlusIcon size={18} strokeWidth={2.4} />
        </IconButton>
      </div>
      <p className="text-sm text-text-muted">
        Your agent sends it and carries on haggling.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" onClick={() => onSend(value)}>
          Send ${value}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Accept asks once. Money actions wait for a tap from the person. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  onConfirm,
  danger = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirm: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button
            variant="secondary"
            size="md"
            className={cn(danger && "bg-danger hover:bg-danger/90")}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Desktop breadcrumb: muted links, chevrons, the current page in bold. */
export function Breadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("hidden items-center gap-2 desk:flex", className)}
    >
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && (
            <ChevronRightIcon
              size={14}
              strokeWidth={2.4}
              className="text-text-muted"
            />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-sm font-medium text-text-muted hover:text-text"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-sm font-semibold text-text">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/** The yellow dutch oven, from the C9 header. */
export function OvenIllustration({
  size = 60,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden
      className={className}
    >
      <rect x="5" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <rect x="63" y="42" width="12" height="7" rx="3.5" fill="var(--color-lemon-500)" />
      <path d="M14 40h52v18c0 6-5 10-11 10H25c-6 0-11-4-11-10Z" fill="var(--color-lemon-400)" />
      <path d="M16 38c0-9 11-13 24-13s24 4 24 13Z" fill="var(--color-lemon-500)" />
      <circle cx="40" cy="22" r="4.5" fill="var(--color-leaf-900)" />
    </svg>
  );
}

/** Undo link shown for five seconds after a decline. */
export function UndoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 cursor-pointer rounded-full px-3 py-1 text-sm font-bold text-secondary hover:bg-secondary-soft"
    >
      Undo
    </button>
  );
}
