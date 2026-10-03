import "server-only";
import { and, db, eq, inArray, not, orders as ordersTable, shop } from "@repo/db";
import {
  listSellerOffers,
  listSellerOrders,
  type OfferStatus,
  type OrderStatus,
} from "../../lib/server/commerce";
import { latestDisputes } from "../../lib/server/disputes";

/*
 * The seller's side of offers and sales, shaped for client components: plain
 * strings and numbers, with relative times worked out on the server so the
 * client renders exactly what the server did.
 */

type OfferListRow = Awaited<ReturnType<typeof listSellerOffers>>[number];
type OrderListRow = Awaited<ReturnType<typeof listSellerOrders>>[number];

export type SellerOffer = {
  id: string;
  listing: { id: string; title: string; photo: string | null; status: string; href: string };
  shop: { name: string; slug: string };
  buyer: { firstName: string; initial: string };
  status: OfferStatus;
  amountCents: number;
  counterCents: number | null;
  /** "agent" when the shop's agent made the counter. */
  counteredBy: "seller" | "agent" | null;
  /** The agent's line to the seller about it ("That's above your lowest. I'd take it."). */
  agentNote: string | null;
  depositCents: number | null;
  note: string | null;
  askingCents: number | null;
  /** The lowest the seller takes: the listing's floor, or the shop's % off the price. */
  lowestCents: number | null;
  /** Declined automatically because someone else bought the listing. */
  closedBySale: boolean;
  /** "2 hours ago" */
  when: string;
  /** "47 hours left" while it's open, countered or accepted. */
  timeLeft: string | null;
  createdAt: string;
  respondedAt: string | null;
  updatedAt: string;
  expiresAt: string;
};

export type SellerOrder = {
  id: string;
  listing: { id: string; title: string; photo: string | null; href: string };
  shop: { name: string; slug: string };
  buyer: { name: string; firstName: string; initial: string };
  status: OrderStatus;
  itemCents: number;
  shippingCents: number;
  totalCents: number;
  delivery: "tracked" | "express";
  shipTo: { name: string; address: string; country: string };
  trackingNumber: string | null;
  offerId: string | null;
  /** "Sold today", "Sold 3 Oct" */
  soldOn: string;
  createdAt: string;
  shippedAt: string | null;
  /** "paypal" when real money moved; "test" for checkouts made without PayPal keys. */
  paidThrough: "paypal" | "test";
  /** What the seller gets: the total less our fee and PayPal's (the total on a test). */
  youGetCents: number;
  /** When the held money went to the seller's PayPal. */
  releasedAt: string | null;
  /** A live problem the buyer reported: "escalated" once resell.store is looking. */
  problem?: "open" | "escalated" | null;
  /** Money given back to the buyer so far (part of it after a problem, all of it on a refund). */
  refundedCents?: number;
};

export function personName(p: { name: string | null; email: string }) {
  const name = p.name?.trim() || p.email.split("@")[0]!;
  return { name, firstName: name.split(/\s+/)[0]!, initial: name[0]!.toUpperCase() };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago". */
export function ago(date: Date, now = Date.now()) {
  const ms = now - date.getTime();
  if (ms < MIN) return "just now";
  if (ms < HOUR) return plural(Math.floor(ms / MIN), "minute") + " ago";
  if (ms < DAY) return plural(Math.floor(ms / HOUR), "hour") + " ago";
  return plural(Math.floor(ms / DAY), "day") + " ago";
}

/** "47 hours left", "20 minutes left". */
export function left(date: Date, now = Date.now()) {
  const ms = date.getTime() - now;
  if (ms <= 0) return null;
  if (ms < HOUR) return plural(Math.max(1, Math.floor(ms / MIN)), "minute") + " left";
  return plural(Math.floor(ms / HOUR), "hour") + " left";
}

/** "Sold today", "Sold yesterday", "Sold 3 Oct". */
export function soldOn(date: Date, now = new Date()) {
  const day = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * MIN) / DAY);
  const diff = day(now) - day(date);
  if (diff <= 0) return "Sold today";
  if (diff === 1) return "Sold yesterday";
  return `Sold ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function toSellerOffer(
  row: OfferListRow,
  lowestPercent?: number,
  sale?: { offerId: string | null; createdAt: Date },
): SellerOffer {
  const o = row.offer;
  const live = row.status === "open" || row.status === "countered" || row.status === "accepted";
  return {
    id: o.id,
    listing: {
      id: row.listing.id,
      title: row.listing.title,
      photo: row.photo,
      status: row.listing.status,
      href: `/listings/${row.listing.id}`,
    },
    shop: { name: row.shop.name, slug: row.shop.slug },
    buyer: personName(row.buyer),
    status: row.status,
    amountCents: o.amountCents,
    counterCents: o.counterCents,
    counteredBy: o.counteredBy,
    agentNote: o.agentNote,
    depositCents: o.depositCents,
    note: o.note,
    askingCents: row.listing.priceCents,
    lowestCents: floorCents(row.listing, lowestPercent),
    // placeOrder declines the other offers in the same transaction as the sale
    closedBySale:
      row.status === "declined" &&
      !!sale &&
      sale.offerId !== o.id &&
      !!o.respondedAt &&
      Math.abs(o.respondedAt.getTime() - sale.createdAt.getTime()) < 1500,
    when: ago(o.createdAt),
    timeLeft: live ? left(o.expiresAt) : null,
    createdAt: o.createdAt.toISOString(),
    respondedAt: o.respondedAt?.toISOString() ?? null,
    updatedAt: o.updatedAt.toISOString(),
    expiresAt: o.expiresAt.toISOString(),
  };
}

export function toSellerOrder(row: OrderListRow): SellerOrder {
  const o = row.order;
  return {
    id: o.id,
    listing: {
      id: row.listing.id,
      title: row.listing.title,
      photo: row.photo,
      href: `/listings/${row.listing.id}`,
    },
    shop: { name: row.shop.name, slug: row.shop.slug },
    buyer: personName(row.buyer),
    status: o.status,
    itemCents: o.itemCents,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    delivery: o.delivery,
    shipTo: o.shipTo,
    trackingNumber: o.trackingNumber,
    offerId: o.offerId,
    soldOn: soldOn(o.createdAt),
    createdAt: o.createdAt.toISOString(),
    shippedAt: o.shippedAt?.toISOString() ?? null,
    paidThrough: o.paymentProvider === "paypal" ? "paypal" : "test",
    youGetCents: o.sellerNetCents ?? o.totalCents,
    releasedAt: o.releasedAt?.toISOString() ?? null,
    refundedCents: o.refundedCents,
  };
}

/** Same rule as the listing workspace (listing-live/format lowestCents). */
function floorCents(l: { priceCents: number | null; lowestCents: number | null }, percent?: number) {
  if (l.lowestCents != null) return l.lowestCents;
  if (l.priceCents == null || percent == null) return null;
  return Math.round((l.priceCents * (100 - percent)) / 100 / 100) * 100;
}

export async function sellerOffers(sellerId: string, opts: { listingId?: string } = {}) {
  const [rows, shops, sales] = await Promise.all([
    listSellerOffers(sellerId, opts),
    db.select({ id: shop.id, lowestPercent: shop.lowestPercent }).from(shop).where(eq(shop.ownerId, sellerId)),
    db
      .select({ listingId: ordersTable.listingId, offerId: ordersTable.offerId, createdAt: ordersTable.createdAt })
      .from(ordersTable)
      .innerJoin(shop, eq(shop.id, ordersTable.shopId))
      .where(and(eq(shop.ownerId, sellerId), not(inArray(ordersTable.status, ["refunded", "cancelled"])))),
  ]);
  const percent = new Map(shops.map((s) => [s.id, s.lowestPercent]));
  const saleFor = new Map(sales.map((s) => [s.listingId, s]));
  return rows.map((r) => toSellerOffer(r, percent.get(r.shop.id), saleFor.get(r.listing.id)));
}

export async function sellerOrders(sellerId: string) {
  const orders = (await listSellerOrders(sellerId)).map(toSellerOrder);
  const problems = await latestDisputes(orders.map((o) => o.id));
  return orders.map((o) => {
    const status = problems.get(o.id)?.status;
    return { ...o, problem: status === "open" || status === "escalated" ? status : null };
  });
}

/** What the seller still has to do: offers to answer (newest first), orders to ship (oldest first). */
export async function sellerTasks(sellerId: string) {
  const [offers, orders] = await Promise.all([sellerOffers(sellerId), sellerOrders(sellerId)]);
  return {
    offers,
    orders,
    toAnswer: offers.filter((o) => o.status === "open"),
    toShip: orders.filter((o) => o.status === "paid").reverse(),
  };
}

/** Released: in the seller's PayPal (a completed test order counts). Held: everything else still live. */
function isReleased(o: SellerOrder) {
  return o.paidThrough === "paypal" ? o.releasedAt != null : o.status === "completed";
}

/** What the seller has been paid and what's still held, after fees. */
export function payoutTotals(orders: SellerOrder[]) {
  // A part refund after a problem comes out of the seller's share
  const sum = (list: SellerOrder[]) => list.reduce((n, o) => n + Math.max(0, o.youGetCents - (o.refundedCents ?? 0)), 0);
  const live = orders.filter((o) => o.status !== "refunded" && o.status !== "cancelled");
  const released = live.filter(isReleased);
  const held = live.filter((o) => !isReleased(o));
  return {
    releasedCents: sum(released),
    heldCents: sum(held),
    sales: released.length + held.length,
  };
}


/* ---------- C10: how it went ---------- */

export type TimelineRow = {
  who: "buyer" | "you" | "agent";
  /** "3 hours ago" */
  time: string;
  text: string;
  /** The number on the table after that move. */
  amountCents?: number;
  /** Money down with this move (test). */
  depositCents?: number;
};

/**
 * The negotiation, rebuilt from the offer row: offered, then countered,
 * then accepted / declined / withdrawn / ran out, then paid.
 */
export function offerTimeline(offer: SellerOffer, order: SellerOrder | null): TimelineRow[] {
  const who = offer.buyer.firstName;
  const at = (iso: string | null) => (iso ? ago(new Date(iso)) : "");
  const rows: TimelineRow[] = [
    {
      who: "buyer",
      time: at(offer.createdAt),
      text: offer.note ? `Offered ${dollars(offer.amountCents)}: “${offer.note}”` : `Offered ${dollars(offer.amountCents)}.`,
      amountCents: offer.amountCents,
      depositCents: offer.depositCents ?? undefined,
    },
  ];

  if (offer.counterCents != null) {
    const byAgent = offer.counteredBy === "agent";
    rows.push({
      who: byAgent ? "agent" : "you",
      time: at(offer.respondedAt),
      text: byAgent
        ? `Countered at ${dollars(offer.counterCents)} for you, and told ${who} in your messages.`
        : `Countered at ${dollars(offer.counterCents)}.`,
      amountCents: offer.counterCents,
    });
  }

  switch (offer.status) {
    case "accepted":
    case "paid":
      rows.push(
        offer.counterCents != null
          ? { who: "buyer", time: at(offer.updatedAt), text: "Took your counter.", amountCents: offer.counterCents }
          : { who: "you", time: at(offer.respondedAt), text: "Accepted.", amountCents: offer.amountCents },
      );
      if (offer.status === "paid" && order) {
        rows.push({
          who: "buyer",
          time: at(order.createdAt),
          text: `Paid ${dollars(order.totalCents)} with shipping (test, no money moved). It's a sale.`,
        });
      } else if (offer.status === "accepted") {
        rows.push({
          who: "buyer",
          time: "Now",
          text: offer.timeLeft ? `Hasn't paid yet, ${offer.timeLeft}.` : "Hasn't paid yet.",
        });
      }
      break;
    case "declined":
      rows.push(
        offer.closedBySale
          ? { who: "you", time: at(offer.respondedAt), text: "Closed on its own when it sold." }
          : offer.counterCents != null
            ? { who: "buyer", time: at(offer.updatedAt), text: "Turned down your counter." }
            : { who: "you", time: at(offer.respondedAt), text: "Said no." },
      );
      break;
    case "withdrawn":
      rows.push({ who: "buyer", time: at(offer.updatedAt), text: `${who} took the offer back.` });
      break;
    case "expired":
      rows.push({
        who: offer.counterCents != null ? "buyer" : "you",
        time: at(offer.expiresAt),
        text: offer.counterCents != null ? "Didn't answer in time, so it ran out." : "Nobody answered in time, so it ran out.",
      });
      break;
  }
  return rows;
}

function dollars(cents: number) {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
}
