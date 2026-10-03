import "server-only";
import type { DisputeReason, DisputeStatus, OrderStatus } from "@repo/db";
import { disputeReasons, refundableCents, type OrderCase } from "../../lib/server/disputes";
import {
  autoCancelAt,
  buyerCanCancel,
  disputeEscalatesAt,
  releaseAt,
  shipBy,
} from "../../lib/server/payout-policy";
import { ago, personName } from "../seller-live/data";

/*
 * One order, shaped for the buyer's and the seller's order pages (P8 order,
 * B5 sale): the money, the steps it's been through, what's next and the
 * problem timeline. Dates and "3 hours ago" are worked out here so the client
 * renders exactly what the server did.
 */

export type CaseStep = {
  label: string;
  /** "October 3", or "By October 6" for one still to come. */
  when: string | null;
  state: "done" | "next" | "todo" | "stopped";
};

export type CaseEvent = {
  id: string;
  side: "buyer" | "seller" | "platform";
  kind: "opened" | "message" | "refund_offered" | "offer_declined" | "refunded" | "escalated" | "closed";
  body: string | null;
  amountCents: number | null;
  /** "3 hours ago" */
  when: string;
};

export type CaseDispute = {
  id: string;
  status: DisputeStatus;
  live: boolean;
  source: "buyer" | "paypal";
  reason: DisputeReason;
  /** "It arrived damaged" */
  reasonLabel: string;
  details: string | null;
  /** The seller's part refund, waiting on the buyer. */
  offerCents: number | null;
  /** "October 3" */
  openedOn: string;
  /** When an unanswered one goes to resell.store, while the seller hasn't replied. */
  escalatesOn: string | null;
  sellerReplied: boolean;
};

export type OrderCaseView = {
  id: string;
  side: "buyer" | "seller";
  status: OrderStatus;
  /** A test checkout: no money moved. */
  test: boolean;
  item: { id: string; title: string; slug: string | null; photo: string | null };
  shop: { name: string; slug: string };
  buyer: { name: string; firstName: string; initial: string };
  delivery: "tracked" | "express";
  shipTo: { name: string; address: string; country: string };
  trackingNumber: string | null;
  money: {
    itemCents: number;
    shippingCents: number;
    totalCents: number;
    refundedCents: number;
    /** What's left to give back. */
    refundableCents: number;
    platformFeeCents: number | null;
    paypalFeeCents: number | null;
    /** The seller's share after fees and refunds (0 once it's all gone back). */
    youGetCents: number;
    /** In the seller's PayPal (a completed test order counts). */
    released: boolean;
  };
  dates: {
    /** "October 3" */
    paidOn: string;
    shippedOn: string | null;
    arrivedOn: string | null;
    doneOn: string | null;
    refundedOn: string | null;
    cancelledOn: string | null;
    releasedOn: string | null;
    /** While it's paid: ship by, and when it's called off if it never ships. */
    shipBy: string | null;
    autoCancel: string | null;
    /** While it's on the way: when the money goes to the seller unless the buyer says otherwise. */
    releaseOn: string | null;
  };
  /** Paid, past the ship-by date: the buyer may cancel for a full refund. */
  buyerCanCancel: boolean;
  steps: CaseStep[];
  dispute: CaseDispute | null;
  events: CaseEvent[];
};

const day = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const on = (d: Date | null | undefined) => (d ? day.format(d) : null);

export function toOrderCaseView(c: OrderCase, now = new Date()): OrderCaseView {
  const o = c.order;
  const test = o.paymentProvider !== "paypal";
  const paid = o.status === "paid";
  const onTheWay = o.status === "shipped" || o.status === "delivered";
  const gone = o.status === "refunded" || o.status === "cancelled";
  const net = gone ? 0 : Math.max(0, (o.sellerNetCents ?? o.totalCents) - o.refundedCents);
  const release = onTheWay ? releaseAt(o) : null;
  const d = c.dispute;
  const live = !!d && (d.status === "open" || d.status === "escalated");
  const sellerReplied = c.events.some((e) => e.side === "seller");

  return {
    id: o.id,
    side: c.side,
    status: o.status,
    test,
    item: { id: c.listing.id, title: c.listing.title, slug: c.listing.slug, photo: c.photo },
    shop: { name: c.shop.name, slug: c.shop.slug },
    buyer: personName(c.buyer),
    delivery: o.delivery,
    shipTo: o.shipTo,
    trackingNumber: o.trackingNumber,
    money: {
      itemCents: o.itemCents,
      shippingCents: o.shippingCents,
      totalCents: o.totalCents,
      refundedCents: o.refundedCents,
      refundableCents: refundableCents(o),
      platformFeeCents: o.platformFeeCents,
      paypalFeeCents: o.paypalFeeCents,
      youGetCents: net,
      released: test ? o.status === "completed" : o.releasedAt != null,
    },
    dates: {
      paidOn: day.format(o.createdAt),
      shippedOn: on(o.shippedAt),
      arrivedOn: on(o.deliveredAt),
      doneOn: on(o.completedAt),
      refundedOn: on(o.refundedAt),
      cancelledOn: on(o.cancelledAt),
      releasedOn: on(o.releasedAt),
      shipBy: paid ? day.format(shipBy(o)) : null,
      autoCancel: paid ? day.format(autoCancelAt(o)) : null,
      releaseOn: on(release),
    },
    buyerCanCancel: buyerCanCancel(o, now),
    steps: steps(c, live),
    dispute: d
      ? {
          id: d.id,
          status: d.status,
          live,
          source: d.source,
          reason: d.reason,
          reasonLabel: disputeReasons.find((r) => r.id === d.reason)?.label ?? "Something else",
          details: d.details,
          offerCents: d.offerCents,
          openedOn: day.format(d.createdAt),
          escalatesOn: d.status === "open" && !sellerReplied ? day.format(disputeEscalatesAt(d)) : null,
          sellerReplied,
        }
      : null,
    events: c.events.map((e) => ({
      id: e.id,
      side: e.side,
      kind: e.kind,
      body: e.body,
      amountCents: e.amountCents,
      when: ago(e.createdAt, now.getTime()),
    })),
  };
}

/** Paid → Shipped → Arrived → Done, or where it stopped (cancelled, refunded). */
function steps(c: OrderCase, live: boolean): CaseStep[] {
  const o = c.order;
  const paidStep: CaseStep = { label: "Paid", when: day.format(o.createdAt), state: "done" };
  if (o.status === "cancelled") {
    return [paidStep, { label: "Cancelled", when: on(o.cancelledAt), state: "stopped" }];
  }
  if (o.status === "refunded") {
    return [
      paidStep,
      ...(o.shippedAt ? [{ label: "Shipped", when: on(o.shippedAt), state: "done" as const }] : []),
      ...(o.deliveredAt ? [{ label: "Arrived", when: on(o.deliveredAt), state: "done" as const }] : []),
      { label: "Refunded", when: on(o.refundedAt), state: "stopped" },
    ];
  }
  const shipped = o.status !== "paid";
  const arrived = o.status === "delivered" || o.status === "completed";
  const done = o.status === "completed";
  const release = releaseAt(o);
  return [
    paidStep,
    {
      label: "Shipped",
      when: shipped ? on(o.shippedAt) : `By ${day.format(shipBy(o))}`,
      state: shipped ? "done" : "next",
    },
    { label: "Arrived", when: arrived ? on(o.deliveredAt) : null, state: arrived ? "done" : shipped ? "next" : "todo" },
    {
      label: "Done",
      // A live problem holds the money, so there is no date to promise
      when: done ? on(o.completedAt) : arrived && release && !live ? `By ${day.format(release)}` : null,
      state: done ? "done" : arrived ? "next" : "todo",
    },
  ];
}
