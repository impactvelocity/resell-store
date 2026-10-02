"use client";

import { Input } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { SearchIcon } from "./icons";

export interface SearchFieldProps extends ComponentProps<typeof Input> {
  /** Class for the outer pill; `className` styles the input itself. */
  containerClassName?: string;
}

export function SearchField({
  containerClassName,
  className,
  type = "search",
  "aria-label": ariaLabel = "Search",
  ...props
}: SearchFieldProps) {
  return (
    <label
      className={cn(
        "flex h-[54px] w-full cursor-text items-center gap-2.5 rounded-full border-[1.5px] border-border bg-surface px-5 text-text-muted transition-colors focus-within:border-secondary",
        containerClassName,
      )}
    >
      <SearchIcon />
      <Input
        type={type}
        aria-label={ariaLabel}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
        {...props}
      />
    </label>
  );
}
