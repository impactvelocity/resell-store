"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { PriceRange } from "../../lib/mock-listing";
import { RangeBar } from "./range-bar";

/*
 * Price card (spec 04 / Price card). Where the person sets the price and how
 * far the agent may go. Step 2.
 *
 * Stepper: minus and plus move $5, or $1 under $30. Tap the number to type one.
 * Range bar: the dot follows the price; outside the band, one line says so.
 * Lowest: the private floor. Starts at the bottom of the band, never above the price.
 * Take offers: off hides the Lowest row.
 */

function MinusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function stepDown(price: number) {
  return Math.max(1, price - (price <= 30 ? 1 : 5));
}

export function stepUp(price: number) {
  return price + (price < 30 ? 1 : 5);
}

/** A dollar figure that turns into a number input when tapped. */
function DollarInput({
  value,
  onChange,
  label,
  className,
  inputClassName,
  trailing,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
  inputClassName?: string;
  trailing?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  function save() {
    const n = Math.round(Number(draft.replace(/[^0-9.]/g, "")));
    if (Number.isFinite(n) && n > 0) onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className={cn("flex items-center", className)}>
        <span aria-hidden>$</span>
        <input
          ref={ref}
          inputMode="numeric"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className={cn(
            "min-w-0 rounded-sm border-[1.5px] border-secondary bg-surface px-1 text-center outline-none",
            inputClassName,
          )}
          style={{ width: `${Math.max(2, draft.length) + 1}ch` }}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label}: $${value}. Tap to type a new one`}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={cn("flex cursor-text items-center gap-2", className)}
    >
      ${value}
      {trailing}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors",
        checked ? "bg-secondary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-surface shadow-sm transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function PriceCard({
  range,
  price,
  onPriceChange,
  lowest,
  onLowestChange,
  takeOffers,
  onTakeOffersChange,
  nextHref,
  nextLabel = "Looks right, on to photos",
  className,
}: {
  range: PriceRange;
  price: number;
  onPriceChange: (price: number) => void;
  lowest: number;
  onLowestChange: (lowest: number) => void;
  takeOffers: boolean;
  onTakeOffersChange: (on: boolean) => void;
  nextHref: string;
  nextLabel?: string;
  className?: string;
}) {
  const note =
    price > range.bandHigh
      ? "Higher than most. It may take longer to sell."
      : price < range.bandLow
        ? "Lower than most. It should go fast."
        : null;

  const stepButton =
    "flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface transition-colors hover:bg-surface-muted active:scale-95 disabled:cursor-default disabled:opacity-40";

  return (
    <div
      data-field="price"
      className={cn(
        "flex w-full flex-col gap-5 rounded-lg border border-border bg-surface p-6",
        className,
      )}
    >
      <div className="text-base font-bold">Your price</div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Lower the price"
          disabled={price <= 1}
          onClick={() => onPriceChange(stepDown(price))}
          className={stepButton}
        >
          <MinusIcon />
        </button>
        <DollarInput
          label="Your price"
          value={price}
          onChange={onPriceChange}
          className="font-display text-5xl font-extrabold tracking-tight"
          inputClassName="h-[60px]"
        />
        <button
          type="button"
          aria-label="Raise the price"
          onClick={() => onPriceChange(stepUp(price))}
          className={stepButton}
        >
          <PlusIcon size={22} strokeWidth={2.6} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <RangeBar
          range={range}
          value={price}
          middle={`Most sell between $${range.bandLow} and $${range.bandHigh}`}
        />
        {note && (
          <p aria-live="polite" className="text-sm font-semibold text-text">
            {note}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col border-t border-border">
        {takeOffers && (
          <div
            data-field="lowest"
            className="flex items-center gap-3 border-b border-border py-3.5"
          >
            <div className="flex flex-1 flex-col">
              <span className="text-base font-semibold">Lowest you&apos;d take</span>
              <span className="text-sm text-text-muted">
                Your agent won&apos;t go under this. Buyers never see it.
              </span>
            </div>
            <DollarInput
              label="Lowest you'd take"
              value={lowest}
              onChange={(n) => onLowestChange(Math.min(n, price))}
              className="font-display text-xl font-extrabold"
              inputClassName="h-9"
              trailing={
                <span className="text-text-muted">
                  <EditIcon />
                </span>
              }
            />
          </div>
        )}
        <div className={cn("flex items-center gap-3", takeOffers ? "pt-3.5" : "py-3.5 pb-0")}>
          <div className="flex flex-1 flex-col">
            <span className="text-base font-semibold">Take offers</span>
            <span className="text-sm text-text-muted">
              {takeOffers
                ? "Your agent haggles, you say yes or no."
                : `Buyers can only pay $${price}.`}
            </span>
          </div>
          <Switch checked={takeOffers} onChange={onTakeOffersChange} label="Take offers" />
        </div>
      </div>

      <Button render={<Link href={nextHref} />} nativeButton={false} className="w-full">
        {nextLabel}
      </Button>
    </div>
  );
}
