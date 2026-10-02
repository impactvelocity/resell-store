"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";

/*
 * Native radios and a switch, styled to the checkout designs. Native inputs keep
 * arrow-key navigation and form semantics for free.
 */

/** A bordered radio card: dot, title and detail, optional trailing slot. Selected = dark 2px border. */
export function RadioCard({
  title,
  detail,
  trailing,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type" | "title"> & {
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-md border border-public-border px-4 py-3.5 transition-colors desk:gap-3.5 desk:px-5 desk:py-4",
        "hover:border-[#bdbdbd] has-checked:border-leaf-900 has-checked:shadow-[inset_0_0_0_1px_var(--color-leaf-900)]",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary",
        "has-disabled:cursor-not-allowed has-disabled:opacity-55 has-disabled:hover:border-public-border",
        className,
      )}
    >
      <input type="radio" className="sr-only" {...props} />
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#bdbdbd] group-has-checked:border-leaf-900"
      >
        <span className="size-2.5 scale-0 rounded-full bg-leaf-900 transition-transform group-has-checked:scale-100" />
      </span>
      <span className="flex min-w-0 grow basis-0 flex-col">
        <span className="text-base font-semibold">{title}</span>
        {detail && <span className="text-sm text-public-text-muted">{detail}</span>}
      </span>
      {trailing}
    </label>
  );
}

/** On/off switch: leaf green when on. */
export function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentProps<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        checked ? "bg-leaf-600" : "bg-[#d4d4d4]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "size-[22px] rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/** A small pill toggle for amounts (offer shortcuts, deposit sizes). Pressed = dark fill. */
export function AmountChip({
  pressed,
  className,
  ...props
}: ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        pressed
          ? "border-leaf-900 bg-leaf-900 text-white"
          : "border-public-border hover:bg-public-photo",
        className,
      )}
      {...props}
    />
  );
}

/** The four-point sparkle at the size the checkout pills use. */
export function Sparkle({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)}>
      <path
        d="M12 2c.8 5.5 4.5 9.2 10 10-5.5.8-9.2 4.5-10 10-.8-5.5-4.5-9.2-10-10 5.5-.8 9.2-4.5 10-10Z"
        fill="currentColor"
      />
    </svg>
  );
}
