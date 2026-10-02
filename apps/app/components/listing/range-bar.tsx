import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import type { PriceRange } from "../../lib/mock-listing";

/*
 * Price range bar (spec 04 / Findings card and price range bar).
 * Track: lowest to highest sale found, pale green. Band: where most sold, the
 * middle half, mid green. Dot: the suggested or chosen price, dark green with a
 * white ring. Labels: low end, the middle line, high end.
 */

function pct(range: PriceRange, value: number) {
  const p = ((value - range.min) / (range.max - range.min)) * 100;
  return Math.min(100, Math.max(0, p));
}

export function RangeBar({
  range,
  value,
  middle,
  showBand = true,
  size = "lg",
  className,
}: {
  range: PriceRange;
  /** Where the dot sits. */
  value: number;
  /** The middle label, e.g. "Suggested $185". */
  middle?: ReactNode;
  /** A rough guess hides the band. */
  showBand?: boolean;
  /** lg: 22px dot, 10px track. sm: 16px dot, 8px track (phone findings card). */
  size?: "lg" | "sm";
  className?: string;
}) {
  const lg = size === "lg";
  const bandLeft = pct(range, range.bandLow);
  const bandWidth = pct(range, range.bandHigh) - bandLeft;
  const dot = pct(range, value);

  return (
    <div className={cn("flex w-full flex-col", lg ? "gap-1.5" : "gap-2.5", className)}>
      <div
        className={cn("relative flex w-full shrink-0 items-center", lg ? "h-[22px]" : "h-4")}
        aria-hidden
      >
        <div
          className={cn(
            "w-full rounded-full bg-secondary-soft",
            lg ? "h-2.5" : "h-2",
          )}
        />
        {showBand && (
          <div
            className={cn(
              "absolute rounded-full bg-leaf-300",
              lg ? "top-1.5 h-2.5" : "top-1 h-2",
            )}
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
          />
        )}
        <div
          className={cn(
            "absolute top-0 rounded-full border-solid border-surface bg-secondary transition-[left] duration-300 ease-out",
            lg ? "size-[22px] border-[3px]" : "size-4 border-2",
          )}
          style={{ left: `calc(${dot}% - ${lg ? 11 : 8}px)` }}
        />
      </div>
      <div className="flex w-full justify-between gap-3 text-sm font-medium text-text-muted">
        <span>${range.min}</span>
        {middle && <span className="text-center">{middle}</span>}
        <span>${range.max}</span>
      </div>
    </div>
  );
}
