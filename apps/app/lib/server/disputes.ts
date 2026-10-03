import "server-only";
import {
  and,
  asc,
  db,
  desc,
  dispute,
  disputeEvent,
  eq,
  inArray,
  listing,
  orders,
  shop,
  sql,
  user,
  type DisputeEventKind,
  type DisputeReason,
  type DisputeStatus,
} from "@repo/db";
import { emitOrderEvent } from "./api/webhooks";
import { CommerceError, releaseOrder, type OrderRow } from "./commerce";
import { coverPhotos } from "./listings";
import { buyerCanCancel } from "./payout-policy";
import { PayPalError, refundCapture } from "./paypal";

/*
 * When a sale goes wrong: cancelling before it ships, and problems after.
 *
 * Cancelling (order "paid", not shipped): the seller can call it off any
 * time; the buyer can once the ship-by date has passed; the sweep does it
 * after AUTO_CANCEL_DAYS. The buyer gets everything back.
 *
 * Problems (order shipped or delivered): the buyer reports one and the held
 * money stays held. The seller can refund in full, offer part of it back, or
 * reply. The buyer can take a part refund, say it's sorted, or ask us to step
 * in (so can the seller; the sweep does if the seller goes quiet). We decide
 * escalated ones with resolveDispute. Disputes opened in PayPal arrive
 * through the webhook (syncPayPalDispute) and follow PayPal's outcome.
 */

export type DisputeRow = typeof dispute.$inferSelect;
export type DisputeEventRow = typeof disputeEvent.$inferSelect;
export type Side = "buyer" | "seller" | "platform";

export const LIVE_DISPUTE: DisputeStatus[] = ["open", "escalated"];

export const disputeReasons: { id: DisputeReason; label: string }[] = [
  { id: "not_arrived", label: "It hasn't arrived" },
  { id: "not_as_described", label: "It isn't as described" },
  { id: "damaged", label: "It arrived damaged" },
  { id: "other", label: "Something else" },
];

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What's left to give back on an order. */
export function refundableCents(o: Pick<OrderRow, "totalCents" | "refundedCents">) {
  return Math.max(0, o.totalCents - o.refundedCents);
}

/**
 * Gives `amountCents` back to the buyer: through PayPal for real orders, on
 * paper for test ones. Returns the refund's reference. `requestId` makes a
 * retry safe (PayPal won't refund the same request twice).
 */
async function giveBack(row: OrderRow, amountCents: number, reason: string, requestId: string) {
  if (amountCents <= 0) throw new CommerceError("There's nothing left to refund.");
  if (row.paymentProvider !== "paypal") return `mock_refund_${crypto.randomUUID().slice(0, 12)}`;
  if (!row.paymentRef || !row.payeeMerchantId) throw new CommerceError("This order has no PayPal payment to refund.");
  if (row.releasedAt) throw new CommerceError("The money already went to the seller, so it can't be refunded here.");
  try {
    const all = row.refundedCents === 0 && amountCents >= row.totalCents;
    const refund = await refundCapture({
      captureId: row.paymentRef,
      sellerMerchantId: row.payeeMerchantId,
      reason,
      amountCents: all ? null : amountCents,
      requestId,
    });
    return refund.id;
  } catch (error) {
    if (error instanceof PayPalError) {
      console.error("PayPal refund failed", row.id, error.issue, error.debugId, error.message);
      throw new CommerceError("PayPal couldn't make the refund just now. Try again in a minute.");
    }
    throw error;
  }
}

async function lockOrder(tx: Tx, orderId: string) {
  const [row] = await tx
    .select({ orders, ownerId: shop.ownerId })
    .from(orders)
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .where(eq(orders.id, orderId))
    .for("update", { of: orders });
  if (!row) throw new CommerceError("That order isn't here any more.");
  return row;
}

async function addEvent(
  tx: Tx | typeof db,
  e: { disputeId: string; side: Side; authorId?: string | null; kind: DisputeEventKind; body?: string | null; amountCents?: number | null },
) {
  const [row] = await tx
    .insert(disputeEvent)
    .values({
      disputeId: e.disputeId,
      side: e.side,
      authorId: e.authorId ?? null,
      kind: e.kind,
      body: e.body?.trim() || null,
      amountCents: e.amountCents ?? null,
    })
    .returning();
  return row!;
}

/** Ends whatever problem is live on an order, as part of something else that settles it. */
async function settleLive(tx: Tx, orderId: string, status: "refunded" | "closed", side: Side, body: string) {
  const live = await tx
    .update(dispute)
    .set({ status, offerCents: null, resolvedAt: new Date() })
    .where(and(eq(dispute.orderId, orderId), inArray(dispute.status, LIVE_DISPUTE)))
    .returning();
  for (const d of live) await addEvent(tx, { disputeId: d.id, side, kind: status === "refunded" ? "refunded" : "closed", body });
  return live[0] ?? null;
}

/* Cancelling before it ships */

export async function cancelOrder(input: {
  orderId: string;
  /** The buyer or seller doing it; null when the sweep calls it off. */
  actorId: string | null;
  by: "buyer" | "seller" | "system";
  note?: string | null;
}) {
  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    const { orders: row, ownerId } = await lockOrder(tx, input.orderId);
    if (input.by === "buyer" && row.buyerId !== input.actorId) throw new CommerceError("That order isn't yours.");
    if (input.by === "seller" && ownerId !== input.actorId) throw new CommerceError("That order isn't yours.");
    if (row.status !== "paid")
      throw new CommerceError(
        row.status === "shipped" || row.status === "delivered"
          ? "It's already shipped. If something's wrong, report a problem instead."
          : "That order is already wrapped up.",
      );
    if (input.by === "buyer" && !buyerCanCancel(row, now))
      throw new CommerceError("The seller still has time to ship it. You can cancel once the ship-by date passes.");

    const reason =
      input.by === "seller"
        ? "The seller couldn't send it, so here's all your money back."
        : "It wasn't shipped in time, so here's all your money back.";
    const amount = refundableCents(row);
    const ref = await giveBack(row, amount, reason, `cancel-${row.id}`);
    const [out] = await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: now, refundedCents: row.totalCents, refundRef: ref, refundedAt: now })
      .where(eq(orders.id, row.id))
      .returning();
    // The seller still has it: back on sale if they called it off, a draft to look at if it lapsed
    await tx
      .update(listing)
      .set({ status: input.by === "seller" ? "live" : "draft", soldAt: null })
      .where(and(eq(listing.id, row.listingId), eq(listing.status, "sold")));
    await settleLive(tx, row.id, "refunded", input.by === "system" ? "platform" : input.by, "Cancelled before it shipped.");
    return out!;
  });
  emitOrderEvent(updated.id, "order.refunded");
  return updated;
}

/* Problems after it ships */

export async function openDispute(input: { buyerId: string; orderId: string; reason: DisputeReason; details?: string | null }) {
  const created = await db.transaction(async (tx) => {
    const { orders: row } = await lockOrder(tx, input.orderId);
    if (row.buyerId !== input.buyerId) throw new CommerceError("That order isn't yours.");
    if (row.status === "paid")
      throw new CommerceError("It hasn't shipped yet. If it doesn't ship by the date we gave, you can cancel for a refund.");
    if (row.status !== "shipped" && row.status !== "delivered")
      throw new CommerceError(
        row.status === "completed"
          ? "That one's wrapped up and the seller's been paid. You can still open a case with PayPal."
          : "That order is already settled.",
      );
    const [existing] = await tx
      .select()
      .from(dispute)
      .where(and(eq(dispute.orderId, row.id), inArray(dispute.status, LIVE_DISPUTE)));
    if (existing) throw new CommerceError("You've already reported a problem with this order.");
    const [d] = await tx
      .insert(dispute)
      .values({ orderId: row.id, reason: input.reason, details: input.details?.trim() || null })
      .returning();
    await addEvent(tx, { disputeId: d!.id, side: "buyer", authorId: input.buyerId, kind: "opened", body: input.details });
    return d!;
  });
  emitOrderEvent(input.orderId, "order.problem");
  return created;
}

type Loaded = { dispute: DisputeRow; order: OrderRow; ownerId: string; side: Side };

/** A live dispute and which side `userId` is on; refuses anyone else. */
async function loadForUser(tx: Tx, disputeId: string, userId: string | null, need?: Side): Promise<Loaded> {
  const [row] = await tx
    .select({ dispute, orders, ownerId: shop.ownerId })
    .from(dispute)
    .innerJoin(orders, eq(orders.id, dispute.orderId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .where(eq(dispute.id, disputeId))
    .for("update", { of: [dispute, orders] });
  if (!row) throw new CommerceError("That problem isn't here any more.");
  const side: Side | null =
    userId === null ? "platform" : row.orders.buyerId === userId ? "buyer" : row.ownerId === userId ? "seller" : null;
  if (!side || (need && side !== need)) throw new CommerceError("That isn't yours to answer.");
  if (!LIVE_DISPUTE.includes(row.dispute.status)) throw new CommerceError("That problem has already been settled.");
  return { dispute: row.dispute, order: row.orders, ownerId: row.ownerId, side };
}

export async function replyToDispute(input: { userId: string; disputeId: string; body: string }) {
  const body = input.body.trim();
  if (!body) throw new CommerceError("Write a message first.");
  return db.transaction(async (tx) => {
    const { side } = await loadForUser(tx, input.disputeId, input.userId);
    return addEvent(tx, { disputeId: input.disputeId, side, authorId: input.userId, kind: "message", body });
  });
}

/** Seller: offer part of the money back. The buyer takes it or not. */
export async function offerPartialRefund(input: { sellerId: string; disputeId: string; amountCents: number; body?: string | null }) {
  return db.transaction(async (tx) => {
    const { order } = await loadForUser(tx, input.disputeId, input.sellerId, "seller");
    const left = refundableCents(order);
    if (input.amountCents <= 0) throw new CommerceError("Offer at least $1 back.");
    if (input.amountCents >= left) throw new CommerceError("That's all of it. Use “Refund in full” instead.");
    const [d] = await tx
      .update(dispute)
      .set({ offerCents: input.amountCents })
      .where(eq(dispute.id, input.disputeId))
      .returning();
    await addEvent(tx, {
      disputeId: input.disputeId,
      side: "seller",
      authorId: input.sellerId,
      kind: "refund_offered",
      body: input.body,
      amountCents: input.amountCents,
    });
    return d!;
  });
}

/**
 * Buyer: take the seller's part refund (the rest goes to the seller and the
 * order is done) or turn it down (the problem stays open).
 */
export async function answerRefundOffer(input: { buyerId: string; disputeId: string; accept: boolean }) {
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const { dispute: d, order } = await loadForUser(tx, input.disputeId, input.buyerId, "buyer");
    if (d.offerCents == null) throw new CommerceError("There's no offer to answer.");
    if (!input.accept) {
      const [out] = await tx.update(dispute).set({ offerCents: null }).where(eq(dispute.id, d.id)).returning();
      await addEvent(tx, { disputeId: d.id, side: "buyer", authorId: input.buyerId, kind: "offer_declined", amountCents: d.offerCents });
      return { dispute: out!, order: null };
    }
    const ref = await giveBack(order, d.offerCents, "Part of your money back, as agreed with the seller.", `partial-${d.id}`);
    const [out] = await tx
      .update(dispute)
      .set({ status: "refunded", resolvedAt: now, offerCents: null })
      .where(eq(dispute.id, d.id))
      .returning();
    await addEvent(tx, { disputeId: d.id, side: "buyer", authorId: input.buyerId, kind: "refunded", amountCents: d.offerCents });
    const [o] = await tx
      .update(orders)
      .set({
        status: "completed",
        refundedCents: order.refundedCents + d.offerCents,
        refundRef: ref,
        refundedAt: now,
        deliveredAt: order.deliveredAt ?? now,
        completedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning();
    return { dispute: out!, order: o! };
  });
  if (result.order) {
    emitOrderEvent(result.order.id, "order.refunded");
    const released = await releaseOrder(result.order);
    if (released || result.order.paymentProvider !== "paypal") await sendPaidOut(result.order.id, "agreed");
  }
  return result.dispute;
}

/** Seller (or us, deciding an escalated one): everything back to the buyer. */
export async function refundInFull(input: { userId: string | null; disputeId: string; body?: string | null }) {
  const now = new Date();
  const order = await db.transaction(async (tx) => {
    const { dispute: d, order, side } = await loadForUser(tx, input.disputeId, input.userId);
    if (side === "buyer") throw new CommerceError("Only the seller can refund this.");
    const amount = refundableCents(order);
    const ref = await giveBack(order, amount, "Your money back for the problem with your order.", `refund-${d.id}`);
    await tx.update(dispute).set({ status: "refunded", resolvedAt: now, offerCents: null }).where(eq(dispute.id, d.id));
    await addEvent(tx, { disputeId: d.id, side, authorId: input.userId, kind: "refunded", body: input.body, amountCents: amount });
    const [o] = await tx
      .update(orders)
      .set({ status: "refunded", refundedCents: order.totalCents, refundRef: ref, refundedAt: now })
      .where(eq(orders.id, order.id))
      .returning();
    return o!;
  });
  emitOrderEvent(order.id, "order.refunded");
  return order;
}

/** Buyer: it's sorted. The problem closes and the order goes back to its timer. */
export async function closeDispute(input: { buyerId: string; disputeId: string; body?: string | null }) {
  return db.transaction(async (tx) => {
    const { dispute: d } = await loadForUser(tx, input.disputeId, input.buyerId, "buyer");
    const [out] = await tx
      .update(dispute)
      .set({ status: "closed", resolvedAt: new Date(), offerCents: null })
      .where(eq(dispute.id, d.id))
      .returning();
    await addEvent(tx, { disputeId: d.id, side: "buyer", authorId: input.buyerId, kind: "closed", body: input.body });
    return out!;
  });
}

/** Either side (or the sweep, with userId null): ask resell.store to decide. */
export async function escalateDispute(input: { userId: string | null; disputeId: string; body?: string | null }) {
  return db.transaction(async (tx) => {
    const { dispute: d, side } = await loadForUser(tx, input.disputeId, input.userId);
    if (d.status === "escalated") throw new CommerceError("We're already looking at this one.");
    const [out] = await tx
      .update(dispute)
      .set({ status: "escalated", escalatedAt: new Date() })
      .where(eq(dispute.id, d.id))
      .returning();
    await addEvent(tx, { disputeId: d.id, side, authorId: input.userId, kind: "escalated", body: input.body });
    return out!;
  });
}

/**
 * Our decision on an escalated (or any live) problem: refund the buyer in
 * full, or release the money to the seller and finish the order.
 */
export async function resolveDispute(input: { disputeId: string; outcome: "refund" | "release"; note?: string | null }) {
  if (input.outcome === "refund") return refundInFull({ userId: null, disputeId: input.disputeId, body: input.note });
  const now = new Date();
  const order = await db.transaction(async (tx) => {
    const { dispute: d, order } = await loadForUser(tx, input.disputeId, null);
    // Never pay out an order that didn't ship or whose money already went back (e.g. a PayPal reversal)
    if (order.status !== "shipped" && order.status !== "delivered" && order.status !== "completed")
      throw new CommerceError("That order can't be released: it hasn't shipped, or the buyer already has their money back.");
    await tx.update(dispute).set({ status: "closed", resolvedAt: now, offerCents: null }).where(eq(dispute.id, d.id));
    await addEvent(tx, { disputeId: d.id, side: "platform", kind: "closed", body: input.note ?? "Decided for the seller." });
    const [o] = await tx
      .update(orders)
      .set({ status: "completed", deliveredAt: order.deliveredAt ?? now, completedAt: now })
      .where(eq(orders.id, order.id))
      .returning();
    return o!;
  });
  emitOrderEvent(order.id, "order.completed");
  const released = await releaseOrder(order);
  if (released || order.paymentProvider !== "paypal") await sendPaidOut(order.id, "decided");
  return released ?? order;
}

/** "You've been paid", once (sweeps.ts imports this file, so it's loaded late). */
async function sendPaidOut(orderId: string, why: "agreed" | "decided") {
  const { paidOut } = await import("./sweeps");
  await paidOut(orderId, why);
}

/* PayPal disputes (from the webhook) */

const paypalReasons: Record<string, DisputeReason> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "not_arrived",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "not_as_described",
};

export type PayPalDisputeResource = {
  dispute_id: string;
  reason?: string;
  status?: string;
  disputed_transactions?: { seller_transaction_id?: string }[];
  dispute_outcome?: { outcome_code?: string; amount_refunded?: { value?: string } };
  messages?: { content?: string }[];
};

/**
 * A dispute opened, updated or resolved in PayPal. Mirrors it onto the
 * order: open while PayPal works on it, then refunded or closed by PayPal's
 * outcome (PayPal moves the money itself; we only record it). Returns the
 * dispute, or null if it isn't about one of our orders.
 */
export async function syncPayPalDispute(resource: PayPalDisputeResource) {
  const captureId = resource.disputed_transactions?.find((t) => t.seller_transaction_id)?.seller_transaction_id;
  if (!captureId) return null;
  const now = new Date();
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.paymentProvider, "paypal"), eq(orders.paymentRef, captureId)))
      .for("update");
    if (!found) return null;

    const resolved = resource.status === "RESOLVED";
    const buyerWon = resolved && resource.dispute_outcome?.outcome_code === "RESOLVED_BUYER_FAVOUR";
    const status: DisputeStatus = resolved
      ? buyerWon
        ? "refunded"
        : "closed"
      : resource.status === "UNDER_REVIEW"
        ? "escalated"
        : "open";

    let [d] = await tx.select().from(dispute).where(eq(dispute.providerDisputeId, resource.dispute_id));
    // First we've heard of this PayPal case (new, or taking over one reported here)
    const newCase = !d;
    if (!d) {
      // A problem they already reported here becomes the PayPal one
      [d] = await tx
        .select()
        .from(dispute)
        .where(and(eq(dispute.orderId, found.id), inArray(dispute.status, LIVE_DISPUTE)));
    }
    const before = d?.status;
    if (d) {
      [d] = await tx
        .update(dispute)
        .set({
          providerDisputeId: resource.dispute_id,
          // PayPal runs it from here: our sweep stops escalating it, PayPal's status rules
          source: "paypal",
          status,
          resolvedAt: resolved ? (d.resolvedAt ?? now) : null,
          escalatedAt: status === "escalated" ? (d.escalatedAt ?? now) : d.escalatedAt,
        })
        .where(eq(dispute.id, d.id))
        .returning();
    } else {
      [d] = await tx
        .insert(dispute)
        .values({
          orderId: found.id,
          source: "paypal",
          reason: paypalReasons[resource.reason ?? ""] ?? "other",
          details: resource.messages?.[0]?.content ?? null,
          status,
          providerDisputeId: resource.dispute_id,
          resolvedAt: resolved ? now : null,
          escalatedAt: status === "escalated" ? now : null,
        })
        .returning();
      await addEvent(tx, { disputeId: d!.id, side: "buyer", kind: "opened", body: "Opened in PayPal." });
    }
    if (newCase && before !== undefined)
      await addEvent(tx, { disputeId: d!.id, side: "platform", kind: "message", body: "The buyer opened a case in PayPal, so PayPal decides this one now." });
    if (before !== status && before !== undefined) {
      const kind: DisputeEventKind = status === "refunded" ? "refunded" : status === "closed" ? "closed" : status === "escalated" ? "escalated" : "message";
      await addEvent(tx, { disputeId: d!.id, side: "platform", kind, body: `PayPal: ${resource.status?.toLowerCase().replace(/_/g, " ")}.` });
    }
    if (buyerWon && found.status !== "refunded" && found.status !== "cancelled") {
      // PayPal says how much it gave back; without that, assume all of it
      const given = resource.dispute_outcome?.amount_refunded?.value;
      const refunded = Math.min(found.totalCents, Math.max(found.refundedCents, given ? Math.round(Number(given) * 100) : found.totalCents));
      const all = refunded >= found.totalCents;
      await tx
        .update(orders)
        .set({
          refundedCents: refunded,
          refundedAt: now,
          ...(all && { status: found.status === "paid" ? ("cancelled" as const) : ("refunded" as const) }),
          ...(all && found.status === "paid" && { cancelledAt: now }),
        })
        .where(eq(orders.id, found.id));
      // Never shipped: the seller still has it, as a draft to look at
      if (all && found.status === "paid")
        await tx.update(listing).set({ status: "draft", soldAt: null }).where(and(eq(listing.id, found.listingId), eq(listing.status, "sold")));
    }
    return { ...d!, previousStatus: before ?? null, newCase };
  });
}

/* Reading */

/** Orders among these with a live problem (the release sweep skips them). */
export async function ordersWithLiveDispute(orderIds: string[]) {
  if (!orderIds.length) return new Set<string>();
  const rows = await db
    .select({ orderId: dispute.orderId })
    .from(dispute)
    .where(and(inArray(dispute.orderId, orderIds), inArray(dispute.status, LIVE_DISPUTE)));
  return new Set(rows.map((r) => r.orderId));
}

/** The latest problem on each of these orders, live or not. */
export async function latestDisputes(orderIds: string[]) {
  if (!orderIds.length) return new Map<string, DisputeRow>();
  const rows = await db.select().from(dispute).where(inArray(dispute.orderId, orderIds)).orderBy(desc(dispute.createdAt));
  const out = new Map<string, DisputeRow>();
  for (const r of rows) if (!out.has(r.orderId)) out.set(r.orderId, r);
  return out;
}

/**
 * One order with its latest problem and timeline, for the buyer's or the
 * seller's problem page. Null when it isn't theirs.
 */
export async function orderCase(orderId: string, viewerId: string) {
  const [row] = await db
    .select({
      order: orders,
      listing: { id: listing.id, title: sql<string>`coalesce(${listing.title}, ${listing.name}, 'Untitled')`, slug: listing.slug },
      shop: { id: shop.id, slug: shop.slug, name: shop.name, ownerId: shop.ownerId },
      buyer: { id: user.id, name: user.name, email: user.email },
    })
    .from(orders)
    .innerJoin(listing, eq(listing.id, orders.listingId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .innerJoin(user, eq(user.id, orders.buyerId))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const side: "buyer" | "seller" | null =
    row.order.buyerId === viewerId ? "buyer" : row.shop.ownerId === viewerId ? "seller" : null;
  if (!side) return null;
  const [d] = await db.select().from(dispute).where(eq(dispute.orderId, orderId)).orderBy(desc(dispute.createdAt)).limit(1);
  const events = d
    ? await db.select().from(disputeEvent).where(eq(disputeEvent.disputeId, d.id)).orderBy(asc(disputeEvent.createdAt))
    : [];
  const photo = (await coverPhotos([row.listing.id])).get(row.listing.id) ?? null;
  return { ...row, photo, side, dispute: d ?? null, events };
}

export type OrderCase = NonNullable<Awaited<ReturnType<typeof orderCase>>>;
