import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import type { Listing } from "../../../lib/mock-market";
import { ItemArt } from "../art";

/** Thumb, title and seller: the top of the summary card, and P10's item row. */
export function OrderItem({
  listing,
  storeName,
  size = "md",
}: {
  listing: Listing;
  storeName: string;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  return (
    <div className={cn("flex items-center", sm ? "gap-3.5" : "gap-4")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[12px] bg-public-photo",
          sm ? "size-16" : "size-20",
        )}
      >
        <ItemArt art={listing.art} size={sm ? 40 : 50} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-base font-bold">{listing.fullTitle ?? listing.title}</p>
        <p className="text-sm text-public-text-muted">Sold by {storeName}</p>
      </div>
    </div>
  );
}

export type SummaryLine = {
  label: string;
  value: ReactNode;
  /** "good" = leaf green (Included), "struck" = crossed-out asking price */
  tone?: "good" | "struck" | "strong";
};

/** Label on the left, amount on the right. */
export function SummaryLines({ lines, className }: { lines: SummaryLine[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-2.5", className)}>
      {lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-4 text-base">
          <dt className="text-public-text-muted">{l.label}</dt>
          <dd
            className={cn(
              "font-medium",
              l.tone === "good" && "font-semibold text-leaf-600",
              l.tone === "struck" && "text-public-text-muted line-through decoration-1",
              l.tone === "strong" && "font-semibold",
            )}
          >
            {l.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The bordered card in the right column of P4 and P5: item, line items, a footer. */
export function OrderSummary({
  listing,
  storeName,
  lines,
  footer,
  className,
}: {
  listing: Listing;
  storeName: string;
  lines: SummaryLine[];
  footer: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Order summary"
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-public-border p-5 desk:p-7",
        className,
      )}
    >
      <OrderItem listing={listing} storeName={storeName} />
      <SummaryLines lines={lines} className="border-t border-public-border pt-5" />
      <div className="border-t border-public-border pt-5">{footer}</div>
    </section>
  );
}

/** A numbered or iconed explainer list, like "Where your money waits". */
export function StepList({
  title,
  steps,
  className,
}: {
  title: string;
  steps: { marker: ReactNode; markerClass: string; title: string; body: ReactNode }[];
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-5 desk:px-7", className)}>
      <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
      <ol className="flex flex-col gap-[18px]">
        {steps.map((s) => (
          <li key={s.title} className="flex gap-3.5">
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                s.markerClass,
              )}
            >
              {s.marker}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-base font-bold">{s.title}</p>
              <p className="text-sm text-public-text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
