"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function Input({
  className,
  ...props
}: ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      className={cn(
        "h-[54px] w-full rounded-md border-[1.5px] border-border bg-surface px-[18px] text-base text-text transition-colors outline-none placeholder:text-text-muted focus:border-secondary focus:shadow-[0_0_0_0.5px_var(--color-secondary)] data-disabled:opacity-40 data-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
