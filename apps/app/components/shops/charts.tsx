"use client";

import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import type { ShopStats } from "../../lib/mock-shops";

/*
 * Spec E / Numbers. Bars: one series in the secondary green, 4px rounded at
 * the free end, square at the baseline, always from zero. Values sit above
 * the bars (six bars or fewer). Baseline and category labels only. Hover,
 * focus or tap shows a tip with the exact number and the dates.
 */

type Week = ShopStats["weeks"][number];

export function WeeklyBars({
  weeks,
  size,
}: {
  weeks: Week[];
  size: "phone" | "desk";
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...weeks.map((w) => w.value), 0);
  const empty = max === 0;
  const desk = size === "desk";
  const plotHeight = desk ? 192 : 120;

  return (
    <div className={cn("flex w-full flex-col", desk ? "flex-1 justify-end" : "gap-2")}>
      <div
        className={cn(
          "relative flex w-full shrink-0 items-end justify-around border-b border-border",
          desk ? cn("h-[232px]", weeks.length > 5 ? "gap-2" : "gap-6") : "h-[150px]",
        )}
        onPointerLeave={() => setActive(null)}
      >
        {empty ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-muted">
            Nothing sold in this period yet.
          </p>
        ) : (
          weeks.map((week, i) => {
            const height = Math.round((week.value / max) * plotHeight);
            return (
              <button
                key={week.label}
                type="button"
                aria-label={`$${week.value}, ${week.dates}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                className={cn(
                  "relative flex cursor-default flex-col items-center outline-none",
                  desk ? "min-w-0 flex-1 gap-2" : weeks.length > 5 ? "min-w-0 flex-1 gap-1.5" : "w-14 shrink-0 gap-1.5",
                )}
              >
                {active === i && (
                  <span
                    role="tooltip"
                    className="absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-sm bg-text px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-background"
                  >
                    ${week.value} earned, {week.dates}
                  </span>
                )}
                <span className={cn("text-text", desk ? "font-bold" : "font-semibold", weeks.length > 7 ? "text-xs" : "text-sm")}>
                  ${week.value}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-t-[4px] bg-secondary transition-opacity",
                    desk ? (weeks.length > 5 ? "w-full max-w-16" : "w-16") : weeks.length > 7 ? "w-4" : "w-7",
                    active !== null && active !== i && "opacity-60",
                  )}
                  style={{ height }}
                />
              </button>
            );
          })
        )}
      </div>
      <div className={cn("flex w-full justify-around", desk && (weeks.length > 5 ? "gap-2 pt-2.5" : "gap-6 pt-2.5"))}>
        {weeks.map((week) => (
          <span
            key={week.label}
            className={cn(
              "text-center text-sm text-text-muted",
              desk ? "min-w-0 flex-1" : weeks.length > 5 ? "min-w-0 flex-1 text-xs font-medium" : "w-14 shrink-0 font-medium",
            )}
          >
            {desk ? week.label : week.short}
          </span>
        ))}
      </div>
    </div>
  );
}

/** "See as a table" swaps the chart for the same numbers in rows. */
export function WeeklyTable({ weeks }: { weeks: Week[] }) {
  return (
    <table className="w-full text-base">
      <thead>
        <tr className="text-left text-sm font-semibold text-text-muted">
          <th className="pb-2 font-semibold">Week</th>
          <th className="pb-2 text-right font-semibold">Earned</th>
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week.label} className="border-t border-border">
            <td className="py-3 text-text-muted">{week.dates}</td>
            <td className="py-3 text-right font-bold">${week.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Horizontal bars for "Where buyers came from", scaled to the biggest source. */
export function SourceBars({
  sources,
  size,
}: {
  sources: ShopStats["sources"];
  size: "phone" | "desk";
}) {
  const desk = size === "desk";
  if (sources.length === 0) {
    return <p className="text-sm text-text-muted">No visitors in this period yet.</p>;
  }
  const max = Math.max(...sources.map((s) => s.percent));
  return (
    <div className={cn("flex w-full flex-col", "gap-3.5")}>
      {sources.map((source) => (
        <div key={source.label} className={cn("flex w-full items-center", desk ? "gap-4" : "gap-3")}>
          <span
            className={cn(
              "shrink-0 font-medium",
              desk ? "w-[104px] text-base" : "w-[92px] text-sm",
            )}
          >
            {source.label}
          </span>
          <span className={cn("flex flex-1", desk ? "h-3" : "h-2.5")}>
            <span
              className="h-full rounded-r-[4px] bg-secondary"
              style={{ width: `${Math.round((source.percent / max) * 100)}%` }}
            />
          </span>
          <span
            className={cn(
              "shrink-0 text-right",
              desk ? "w-10 text-base font-bold" : "w-9 text-sm font-semibold",
            )}
          >
            {source.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}
