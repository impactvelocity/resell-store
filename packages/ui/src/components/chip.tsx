"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** A row of filter chips. Single-select by default; pass `multiple` for multi-select. */
export function ChipGroup({
  className,
  ...props
}: ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

export function Chip({ className, ...props }: ComponentProps<typeof Toggle>) {
  return (
    <Toggle
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-surface px-[18px] text-sm font-semibold whitespace-nowrap text-text transition-colors outline-none select-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        "data-pressed:border-text data-pressed:bg-text data-pressed:text-background",
        className,
      )}
      {...props}
    />
  );
}
