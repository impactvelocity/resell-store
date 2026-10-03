"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { ArrowUpRightIcon, CloseIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { Spinner } from "../agent-chat/agent-chat";
import {
  findingFacts,
  findingSources,
  priceRange,
  type PriceRange,
  type Source,
} from "../../lib/mock-listing";
import { RangeBar } from "./range-bar";

/*
 * Findings card (spec 04 / Findings card and price range bar). What the
 * research found: what used ones sell for, and the proof. End of step 1.
 *
 * States: working (spinner and grey bars, the Price card on C2), ready,
 * rough (fewer than five sales: no band, a line saying so), nothing (no bar,
 * the agent asks what they paid).
 */

export type FindingsState = "working" | "ready" | "rough" | "nothing";

/** What the research found. Defaults to the dutch oven (the mock). */
export type FindingsData = {
  price: PriceRange;
  facts: { label: string; value: string }[];
  sources: (Omit<Source, "items"> & {
    items: { title: string; detail: string; value?: string; url?: string }[];
  })[];
};

const mockData: FindingsData = { price: priceRange, facts: findingFacts, sources: findingSources };

/** The "Price" card while the research runs (C2). */
export function PriceWorkingCard({
  label = "Working it out from 42 recent sales",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-field="price"
      className={cn(
        "flex w-full flex-col gap-3.5 rounded-lg border border-border bg-surface px-6 py-5",
        className,
      )}
    >
      <div className="text-base font-bold">Price</div>
      <div className="flex items-center gap-2.5">
        <Spinner size={20} />
        <span className="text-base font-medium text-text-muted">{label}</span>
      </div>
      <div className="flex w-full flex-col gap-2" aria-hidden>
        <span className="h-3 w-[60%] animate-pulse rounded-full bg-surface-muted" />
        <span className="h-3 w-full animate-pulse rounded-full bg-surface-muted" />
      </div>
    </div>
  );
}

function SourceSheet({ source }: { source: FindingsData["sources"][number] }) {
  const toast = useToast();
  return (
    <Dialog>
      <DialogTrigger className="flex h-7 cursor-pointer items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text transition-colors hover:bg-border">
        {source.label}
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-xl">{source.title}</DialogTitle>
            <DialogDescription className="text-sm">{source.description}</DialogDescription>
          </div>
          <DialogClose
            aria-label="Close"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface hover:bg-surface-muted"
          >
            <CloseIcon size={18} />
          </DialogClose>
        </div>
        <ul className="flex flex-col">
          {source.items.map((item) => (
            <li key={`${item.title}-${item.detail}-${item.value}`} className="border-t border-border first:border-t-0">
              <button
                type="button"
                onClick={() =>
                  item.url
                    ? window.open(item.url, "_blank", "noopener,noreferrer")
                    : toast.add({ title: "Links to the real page once this is live" })
                }
                className="flex w-full cursor-pointer items-center gap-3 py-3 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-semibold">{item.title}</span>
                  <span className="text-sm text-text-muted">{item.detail}</span>
                </span>
                {item.value && (
                  <span className="font-display text-lg font-extrabold">{item.value}</span>
                )}
                <ArrowUpRightIcon size={18} className="shrink-0 text-text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Headline({
  state,
  compact,
  price,
}: {
  state: FindingsState;
  compact: boolean;
  price: PriceRange;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">
        Used ones sell for
      </div>
      <div
        className={cn(
          "font-display font-extrabold tracking-tight",
          compact ? "text-3xl leading-[42px]" : "text-3xl",
        )}
      >
        {state === "nothing"
          ? "No sales found"
          : `$${price.bandLow} to $${price.bandHigh}`}
      </div>
    </div>
  );
}

function Bar({
  state,
  compact,
  price,
}: {
  state: FindingsState;
  compact: boolean;
  price: PriceRange;
}) {
  if (state === "nothing") {
    return (
      <p className="text-sm text-text-muted">
        I couldn&apos;t find any sold lately. I&apos;ll ask what you paid and suggest a
        price from that.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <RangeBar
        range={price}
        value={price.suggested}
        size={compact ? "sm" : "lg"}
        showBand={state !== "rough"}
        middle={
          <span className="font-bold text-secondary">
            Suggested ${price.suggested}
          </span>
        }
      />
      {state === "rough" && (
        <p className="text-sm text-text-muted">
          Not many of these sold lately, so this is a rough guess.
        </p>
      )}
    </div>
  );
}

export function FindingsCard({
  state = "ready",
  variant = "wide",
  data = mockData,
  className,
}: {
  state?: FindingsState;
  data?: FindingsData;
  /** wide: two columns with "Where this came from" (desktop canvas). compact: stacked (phone thread). */
  variant?: "wide" | "compact";
  className?: string;
}) {
  if (state === "working") return <PriceWorkingCard className={className} />;

  const compact = variant === "compact";
  const sources = (
    <div className="flex flex-wrap items-center gap-1.5 desk:gap-2">
      {!compact && (
        <span className="text-sm font-medium text-text-muted">Where this came from</span>
      )}
      {data.sources.map((source) => (
        <SourceSheet key={source.key} source={source} />
      ))}
    </div>
  );

  if (compact) {
    return (
      <div
        data-field="findings"
        className={cn(
          "flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-5",
          className,
        )}
      >
        <Headline state={state} compact price={data.price} />
        <Bar state={state} compact price={data.price} />
        <div className="flex w-full flex-col">
          {data.facts.map((fact) => (
            <div
              key={fact.label}
              className="flex justify-between gap-3 border-t border-border py-2.5 text-sm last:border-b"
            >
              <span className="text-text-muted">{fact.label}</span>
              <span className="text-right font-semibold">{fact.value}</span>
            </div>
          ))}
        </div>
        {sources}
      </div>
    );
  }

  return (
    <div
      data-field="findings"
      className={cn(
        "flex w-full flex-col gap-5 rounded-lg border border-border bg-surface p-6",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-5 xl:flex-row xl:gap-10">
        <div className="flex flex-1 flex-col gap-3.5">
          <Headline state={state} compact={false} price={data.price} />
          <Bar state={state} compact={false} price={data.price} />
        </div>
        <div className="flex flex-1 flex-col">
          {data.facts.map((fact, i) => (
            <div
                key={fact.label}
                className={cn(
                  "flex justify-between gap-3 py-[9px] text-sm",
                  i < data.facts.length - 1 && "border-b border-border",
                )}
              >
                <span className="font-medium text-text-muted">{fact.label}</span>
                <span className="text-right font-semibold">{fact.value}</span>
              </div>
          ))}
        </div>
      </div>
      {data.sources.length > 0 && <div className="border-t border-border pt-4">{sources}</div>}
    </div>
  );
}
