"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { ChevronLeftIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { DownloadIcon, FlowBar, roundButton } from "../shops/parts";
import type { SellerOrder } from "./data";
import { money, shipToLine, PAYMENT_NOTE } from "./format";
import { OrderTag, SaleTag, ShipForm } from "./parts";
import { PayPalPayoutRow, type PayoutPayPal } from "./payout-row";

/*
 * B5 Sales and payouts on real orders. Same frame as the design: the payout
 * card and "Ready to ship" on the left, recent sales on the right. The card
 * shows what the seller gets after fees: held by PayPal, and released to them
 * (labelled as test money when the server has no PayPal keys).
 */

type Filter = "all" | "ship" | "way" | "done" | "problem";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ship", label: "To ship" },
  { value: "way", label: "On the way" },
  { value: "done", label: "Paid out" },
  { value: "problem", label: "Problems" },
];

const PAGE = 8;

function matches(o: SellerOrder, f: Filter) {
  if (f === "all") return true;
  if (f === "ship") return o.status === "paid";
  if (f === "way") return o.status === "shipped" || o.status === "delivered";
  if (f === "problem") return !!o.problem;
  return o.status === "completed";
}

function whereItsAt(o: SellerOrder) {
  if (o.problem) return o.problem === "escalated" ? "resell.store is looking at a problem" : "Problem reported, money held";
  if ((o.status === "refunded" || o.status === "cancelled") && o.refundedCents) return `${money(o.refundedCents)} back to ${o.buyer.firstName}`;
  if (o.status === "shipped") return o.trackingNumber ? `Tracking ${o.trackingNumber}` : "Shipped";
  if (o.status === "paid") return `To ship to ${shipToLine(o)}`;
  return null;
}

function downloadCsv(rows: SellerOrder[]) {
  const header = ["Item", "Sold", "Buyer", "Status", "Item price", "Shipping", "Total", "Tracking"];
  const lines = rows.map((o) =>
    [
      o.listing.title,
      o.createdAt.slice(0, 10),
      o.buyer.name,
      o.status,
      (o.itemCents / 100).toFixed(2),
      (o.shippingCents / 100).toFixed(2),
      (o.totalCents / 100).toFixed(2),
      o.trackingNumber ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
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

function PayoutCard({
  desk,
  heldCents,
  releasedCents,
  paypal,
}: {
  desk: boolean;
  heldCents: number;
  releasedCents: number;
  paypal: PayoutPayPal;
}) {
  const test = paypal === "off";
  return (
    <div className={cn("flex w-full flex-col rounded-xl bg-secondary text-on-secondary", desk ? "gap-5 p-7" : "gap-4 p-6")}>
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold text-leaf-100">Held until it arrives{test && " (test)"}</span>
        <span className={cn("font-display font-extrabold tracking-tight", desk ? "text-[72px] leading-[76px]" : "text-5xl")}>
          {money(heldCents)}
        </span>
        <span className="text-base text-leaf-100">
          {test
            ? `Paid by buyers and held until they say it arrived. ${PAYMENT_NOTE}`
            : "Your share of sales still on the way, after fees. You get it when the buyer says it arrived."}
        </span>
      </div>
      <div className={cn("flex items-center gap-2.5 border-t pt-4", desk ? "border-white/30" : "border-leaf-300")}>
        <span className="flex-1 text-sm font-bold">{test ? "Released (test)" : "Paid out to your PayPal"}</span>
        <span className="font-display text-lg font-extrabold">{money(releasedCents)}</span>
      </div>
      <PayPalPayoutRow paypal={paypal} />
    </div>
  );
}

function ShipCard({ order, desk }: { order: SellerOrder; desk: boolean }) {
  return (
    <div className={cn("flex w-full flex-col rounded-lg border border-border bg-surface", desk ? "gap-4 p-5" : "gap-3.5 p-4")}>
      <div className={cn("flex items-start", desk ? "gap-3.5" : "gap-3")}>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/sales/${order.id}`} className="text-base font-bold hover:underline">
            {order.listing.title}
          </Link>
          <span className="text-sm text-text-muted">
            {order.buyer.name} paid {money(order.totalCents)}
            {order.delivery === "express" ? ", express" : ""}. {order.soldOn}.
          </span>
        </div>
        <OrderTag status="paid" />
      </div>
      <div className="rounded-md bg-surface-muted px-4 py-3 text-sm">
        <div className="font-semibold text-text">{order.shipTo.name}</div>
        <div className="whitespace-pre-line text-text-muted">{order.shipTo.address}</div>
        <div className="text-text-muted">{order.shipTo.country}</div>
      </div>
      <ShipForm order={order} />
    </div>
  );
}

function NothingToShip() {
  return (
    <div className="flex w-full flex-col gap-1 rounded-lg border border-border bg-surface p-5">
      <span className="text-base font-bold">Nothing to ship</span>
      <span className="text-sm text-text-muted">When something sells, it shows up here with the address.</span>
    </div>
  );
}

export function SalesLive({
  orders,
  heldCents,
  releasedCents,
  paypal,
}: {
  orders: SellerOrder[];
  heldCents: number;
  releasedCents: number;
  paypal: PayoutPayPal;
}) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  // Oldest first: ship in the order they were bought
  const toShip = orders.filter((o) => o.status === "paid").reverse();
  const filtered = orders.filter((o) => matches(o, filter));
  const visible = expanded ? filtered : filtered.slice(0, PAGE);
  const phoneRecent = orders.filter((o) => o.status !== "paid");

  const shipList = (desk: boolean) =>
    toShip.length ? toShip.map((o) => <ShipCard key={o.id} order={o} desk={desk} />) : <NothingToShip />;

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
        <section className="px-4 pt-6">
          <PayoutCard desk={false} heldCents={heldCents} releasedCents={releasedCents} paypal={paypal} />
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">Ready to ship</h2>
          {shipList(false)}
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7 pb-9">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">Recent sales</h2>
          {phoneRecent.length ? (
            <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5">
              {phoneRecent.map((o, i) => (
                <Link
                  key={o.id}
                  href={`/sales/${o.id}`}
                  className={cn("flex items-center gap-3 py-3.5", i < phoneRecent.length - 1 && "border-b border-border")}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-semibold">{o.listing.title}</span>
                    <span className="text-sm text-text-muted">
                      {o.buyer.firstName}, {o.soldOn.toLowerCase()}
                    </span>
                  </div>
                  <SaleTag order={o} />
                  <span className="shrink-0 text-right font-display text-lg leading-6 font-extrabold">
                    {money(o.totalCents)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-text-muted">Shipped sales show up here.</p>
          )}
        </section>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-8 pb-14 desk:flex">
        <div className="flex items-center justify-between gap-6">
          <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight">Sales and payouts</h1>
          <button
            type="button"
            onClick={() => {
              downloadCsv(orders);
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
            <PayoutCard desk heldCents={heldCents} releasedCents={releasedCents} paypal={paypal} />
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Ready to ship</h2>
              {shipList(true)}
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
                <span className="w-[110px] shrink-0">Buyer</span>
                <span className="w-[150px] shrink-0">Status</span>
                <span className="w-20 shrink-0 text-right">Total</span>
              </div>
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">Nothing here right now.</p>
              ) : (
                visible.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 border-b border-border py-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/sales/${o.id}`} className="truncate text-base font-bold hover:underline">
                        {o.listing.title}
                      </Link>
                      <span className="truncate text-sm text-text-muted">
                        {o.soldOn}
                        {whereItsAt(o) ? `, ${whereItsAt(o)}` : ""}
                      </span>
                    </div>
                    <span className="w-[110px] shrink-0 truncate text-sm font-medium">{o.buyer.name}</span>
                    <span className="flex w-[150px] shrink-0">
                      <SaleTag order={o} />
                    </span>
                    <span className="w-20 shrink-0 text-right font-display text-lg leading-6 font-extrabold tracking-tight">
                      {money(o.totalCents)}
                    </span>
                  </div>
                ))
              )}
              <div className="flex items-center justify-between pt-4 pb-1 text-sm">
                <span className="text-text-muted">
                  Showing {visible.length} of {filtered.length}
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
