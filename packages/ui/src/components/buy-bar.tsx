import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

export interface BuyBarProps extends ComponentProps<"div"> {
  price: ReactNode;
  /** Small print next to the price, e.g. "plus $5 shipping". */
  note?: ReactNode;
  /** Usually `<Button variant="secondary">Buy now</Button>`. */
  action: ReactNode;
}

/** Sticky purchase bar for a listing. */
export function BuyBar({
  price,
  note,
  action,
  className,
  ...props
}: BuyBarProps) {
  return (
    <div
      className={cn(
        "flex h-[76px] w-full items-center justify-between gap-6 rounded-full border-[1.5px] border-border bg-surface pr-2.5 pl-6",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold tracking-tight text-text">
          {price}
        </span>
        {note && (
          <span className="truncate text-sm font-medium text-text-muted">
            {note}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
