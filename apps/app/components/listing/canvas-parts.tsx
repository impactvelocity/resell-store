"use client";

import type { ReactNode } from "react";
import { CloseIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { CanvasHeader, ProgressBar } from "../workspace/listing-panel";
import { PotIllustration } from "./pot-illustration";

/*
 * Small canvas pieces shared by C2 to C4: the header for each layout, the two
 * columns, and the not-yet-started Photos and Words cards.
 */

/**
 * The drawer's close button. The canvas is rendered on the desktop too (outside
 * the drawer), so this can't use DrawerClose: it sends Escape, which the open
 * drawer listens for.
 */
function CloseDrawerButton() {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={(e) => {
        e.currentTarget.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      }}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
    >
      <CloseIcon size={18} strokeWidth={2.4} />
    </button>
  );
}

/**
 * Canvas header. Desktop: the shared CanvasHeader with the bar on the right.
 * Phone (in the drawer): smaller title, close button, the bar underneath.
 */
export function ListingCanvasHeader({
  title,
  description,
  phoneDescription,
  filled,
  total = 12,
}: {
  title: string;
  description: string;
  /** Phones say "Tap" where desktops say "Click". */
  phoneDescription?: string;
  filled: number;
  total?: number;
}) {
  return (
    <>
      <div className="hidden desk:block">
        <CanvasHeader title={title} description={description} filled={filled} total={total} />
      </div>
      <div className="flex flex-col gap-4 pb-4 desk:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
            <p className="text-sm text-text-muted">{phoneDescription ?? description}</p>
          </div>
          <CloseDrawerButton />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">
            {filled} of {total} filled
          </span>
          <ProgressBar value={filled / total} />
        </div>
      </div>
    </>
  );
}

/** Two columns from wide desktops up, stacked below that and in the drawer. */
export function CanvasColumns({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-4 xl:flex-row xl:items-start", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-4">{left}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">{right}</div>
    </div>
  );
}

export function PhotosCard({ count = 1 }: { count?: number }) {
  return (
    <div
      data-field="photos"
      className="flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface px-6 py-5"
    >
      <div className="flex items-baseline justify-between">
        <div className="text-base font-bold">Photos</div>
        <div className="text-sm font-medium text-text-muted">{count} so far</div>
      </div>
      <div className="flex w-full gap-2">
        {Array.from({ length: 4 }, (_, i) =>
          i < count ? (
            <div
              key={i}
              className="flex h-[72px] flex-1 items-center justify-center rounded-md bg-leaf-100"
            >
              <PotIllustration size={48} />
            </div>
          ) : (
            <div key={i} className="h-[72px] flex-1 rounded-md bg-surface-muted" />
          ),
        )}
      </div>
    </div>
  );
}

export function WordsCard() {
  return (
    <div
      data-field="words"
      className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-surface px-6 py-5"
    >
      <div className="text-base font-bold">Words</div>
      <p className="text-base text-text-muted">
        Title, one-liner and description. I write these in step 4.
      </p>
    </div>
  );
}
