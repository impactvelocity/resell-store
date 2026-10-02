"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { CheckIcon, ChevronLeftIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  payout,
  readyToShip,
  sales as initialSales,
  totalSales,
  type Sale,
} from "../../lib/mock-shops";
import { Badge, DownloadIcon, FlowBar, ItemThumb, roundButton } from "./parts";

/* B5 Sales and payouts. Filters, shipping and "Show more" are local state. */

type Filter = "all" | "ship" | "way" | "paid";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ship", label: "To ship" },
  { value: "way", label: "On the way" },
  { value: "paid", label: "Paid out" },
];

const PAGE = 5;

function matches(sale: Sale, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "ship") return sale.status === "ready";
  if (filter === "way") return sale.status === "shipped" || sale.status === "delivered";
  return sale.status === "paid";
}

function WhereItsAt({ sale }: { sale: Sale }) {
  if (sale.status === "ready") return <Badge tone="lemon">{sale.where}</Badge>;
  if (sale.status === "shipped") return <Badge tone="muted">{sale.where}</Badge>;
  if (sale.status === "delivered") return <Badge tone="leaf">{sale.where}</Badge>;
  return <span className="text-sm text-text-muted">{sale.where}</span>;
}

function downloadCsv(rows: Sale[]) {
  const header = ["Item", "Sold", "Buyer", "Where it's at", "You get"];
  const lines = rows.map((s) =>
    [s.title, s.soldOn.replace("Sold ", ""), s.buyer, s.where, `$${s.amount}`]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resell-store-sales.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function SalesView() {
  const toast = useToast();
  const [sales, setSales] = useState(initialSales);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  const toShip = sales.find((s) => s.id === readyToShip.saleId && s.status === "ready");
  const filtered = sales.filter((s) => matches(s, filter));
  const visible = expanded ? filtered : filtered.slice(0, PAGE);
  const phoneRecent = sales.filter((s) => s.status !== "ready").slice(0, 4);

  function markShipped() {
    setSales((prev) =>
      prev.map((s) =>
        s.id === readyToShip.saleId
          ? {
              ...s,
              status: "shipped",
              where: "Shipped today",
              phoneNote: "On its way to Priya, shipped today",
            }
          : s,
      ),
    );
    toast.add({ title: "Marked as shipped. We'll let Priya know." });
  }

  function getLabel() {
    toast.add({ title: "Label ready. Print it and tape it on." });
  }

  const payoutCard = (desk: boolean) => (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl bg-secondary text-on-secondary",
        desk ? "gap-5 p-7" : "gap-4 p-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tracking-wide text-leaf-100 uppercase">
          On its way to you
        </span>
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            desk ? "text-[72px] leading-[76px]" : "text-5xl",
          )}
        >
          ${payout.amount}
        </span>
        <span className="text-base text-leaf-100">{payout.note}</span>
      </div>
      <div
        className={cn(
          "flex items-center gap-2.5 border-t pt-4",
          desk ? "border-white/30" : "border-leaf-300",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <CheckIcon size={14} strokeWidth={3.2} />
        </span>
        <span className={cn("flex-1 text-sm", desk ? "font-bold" : "font-semibold")}>
          PayPal connected
        </span>
        <span className={cn("text-sm text-leaf-100", !desk && "font-medium")}>
          {payout.account}
        </span>
      </div>
    </div>
  );

  const shipCard = (desk: boolean) =>
    toShip ? (
      <div
        className={cn(
          "flex w-full flex-col rounded-lg border border-border bg-surface",
          desk ? "gap-4 p-5" : "gap-3.5 p-4",
        )}
      >
        <div className={cn("flex items-center", desk ? "gap-3.5" : "gap-3")}>
          <ItemThumb kind="vase" tone="lemon" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-bold">{readyToShip.title}</span>
            <span className="text-sm text-text-muted">{readyToShip.to}</span>
          </div>
          <Badge tone="lemon">{readyToShip.due}</Badge>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={getLabel}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300"
          >
            Get the label
          </button>
          <button
            type="button"
            onClick={markShipped}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-sm font-bold transition-colors hover:bg-surface-muted"
          >
            I&apos;ve shipped it
          </button>
        </div>
      </div>
    ) : (
      <div className="flex w-full flex-col gap-1 rounded-lg border border-border bg-surface p-5">
        <span className="text-base font-bold">Nothing to ship. Nice.</span>
        <span className="text-sm text-text-muted">
          When something sells, it shows up here with its label.
        </span>
      </div>
    );

  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <FlowBar
          left={
            <Link href="/me" aria-label="Back" className={roundButton}>
              <ChevronLeftIcon />
            </Link>
          }
          title="Sales and payouts"
        />
        <section className="px-4 pt-6">{payoutCard(false)}</section>
        <section className="flex flex-col gap-2.5 px-4 pt-7">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Ready to ship
          </h2>
          {shipCard(false)}
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7 pb-9">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Recent sales
          </h2>
          <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5">
            {phoneRecent.map((sale, i) => (
              <div
                key={sale.id}
                className={cn(
                  "flex items-center gap-3 py-3.5",
                  i < phoneRecent.length - 1 && "border-b border-border",
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-semibold">{sale.title}</span>
                  <span className="text-sm text-text-muted">{sale.phoneNote}</span>
                </div>
                <span className="w-12 shrink-0 text-right font-display text-lg leading-6 font-extrabold">
                  ${sale.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-8 pb-14 desk:flex">
        <div className="flex items-center justify-between gap-6">
          <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">
            Sales and payouts
          </h1>
          <button
            type="button"
            onClick={() => {
              downloadCsv(sales);
              toast.add({ title: "Spreadsheet downloaded." });
            }}
            className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold transition-colors hover:bg-surface-muted"
          >
            <DownloadIcon />
            Download as a spreadsheet
          </button>
        </div>
        <div className="flex flex-col items-start gap-7 xl:flex-row">
          <div className="flex w-full shrink-0 flex-col gap-7 xl:w-[400px]">
            {payoutCard(true)}
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Ready to ship</h2>
              {shipCard(true)}
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Recent sales</h2>
              <ChipGroup
                value={[filter]}
                onValueChange={(value) => {
                  const next = value[0] as Filter | undefined;
                  if (next) {
                    setFilter(next);
                    setExpanded(false);
                  }
                }}
                aria-label="Filter sales"
                className="gap-1.5"
              >
                {filters.map((f) => (
                  <Chip key={f.value} value={f.value} className="h-9 border px-3.5">
                    {f.label}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
            <div className="flex flex-col rounded-xl border border-border bg-surface px-6 pt-2 pb-4">
              <div className="flex items-center gap-4 border-b border-border py-3.5 text-sm font-semibold text-text-muted">
                <span className="flex-1">Item</span>
                <span className="w-[88px] shrink-0">Buyer</span>
                <span className="w-[168px] shrink-0">Where it&apos;s at</span>
                <span className="w-16 shrink-0 text-right">You get</span>
              </div>
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">Nothing here right now.</p>
              ) : (
                visible.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-4 border-b border-border py-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-bold">{sale.title}</span>
                      <span className="text-sm text-text-muted">{sale.soldOn}</span>
                    </div>
                    <span className="w-[88px] shrink-0 text-sm font-medium">{sale.buyer}</span>
                    <span className="flex w-[168px] shrink-0">
                      <WhereItsAt sale={sale} />
                    </span>
                    <span className="w-16 shrink-0 text-right font-display text-lg leading-6 font-extrabold tracking-tight">
                      ${sale.amount}
                    </span>
                  </div>
                ))
              )}
              <div className="flex items-center justify-between pt-4 pb-1 text-sm">
                <span className="text-text-muted">
                  Showing {visible.length} of {filter === "all" ? totalSales : filtered.length}
                </span>
                {filtered.length > PAGE && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="cursor-pointer font-bold text-secondary hover:underline"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
