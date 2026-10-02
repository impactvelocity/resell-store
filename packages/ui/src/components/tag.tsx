import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

const tagVariants = {
  available: "bg-secondary-soft text-secondary",
  hold: "bg-primary-soft text-text",
  new: "bg-accent-soft text-accent-text",
  sale: "border-[1.5px] border-danger bg-surface font-bold text-danger",
} as const;

export interface TagProps extends ComponentProps<"span"> {
  variant?: keyof typeof tagVariants;
}

/** Small status label for listings: available, on hold, new, price drops. */
export function Tag({
  className,
  variant = "available",
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        tagVariants[variant],
        className,
      )}
      {...props}
    >
      {variant === "available" && (
        <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
      )}
      {children}
    </span>
  );
}
