import "server-only";
import {
  and,
  db,
  desc,
  dispute,
  disputeEvent,
  eq,
  inArray,
  listing,
  ne,
  checkout,
  offer,
  orders,
  paypalAccount,
  shop,
  sql,
  user,
  type OfferStatus,
  type OrderStatus,
  type ShipTo,
} from "@repo/db";
import { emitOfferEvent, emitOrderEvent } from "./api/webhooks";
import { runAfterResponse } from "./later";
import { coverPhotos } from "./listings";
import { platformFeeCents } from "./payout-policy";
import {
  captureOrder,
  createOrder,
  demoSellerId,
  PayPalError,
  refundCapture,
  releaseToSeller,
  type Capture,
} from "./paypal";

/*
 * Buying and offers. With PayPal keys set, checkout goes through PayPal: the
 * buyer approves there, we capture with the money held, and it's released to
 * the seller when the buyer says it's all good. Without keys it's a test
 * checkout ("mock" provider): the order is real, no money moves.
 *
 * Offer lifecycle: open → (countered →) accepted → paid, or declined /
 * withdrawn / expired. Expiry is read from expiresAt, so it's right to the
 * second; the offer-expiry sweep (sweeps.ts) writes the status and tells both
 * sides. Refunds, cancelling and problems are in disputes.ts.
 */

export type OfferRow = typeof offer.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;

const HOUR = 60 * 60 * 1000;
/** How long an offer stays open, and how long an accepted one waits for payment. */
export const OFFER_HOURS = 48;

/** Flat test rates until the seller sets shipping and a rate service is wired. */
export function shippingFor(listingShippingCents: number | null, delivery: "tracked" | "express") {
  const tracked = listingShippingCents ?? 900;
  return delivery === "express" ? tracked + 1200 : tracked;
}

export class CommerceError extends Error {}

/** An offer's status as of now: open/countered/accepted ones lapse at expiresAt. */
export function effectiveStatus(o: Pick<OfferRow, "status" | "expiresAt">): OfferStatus {
  if ((o.status === "open" || o.status === "countered" || o.status === "accepted") && o.expiresAt < new Date())
    return "expired";
  return o.status;
}

/** What the buyer pays for the item under an offer: the counter if there was one. */
export function agreedCents(o: Pick<OfferRow, "amountCents" | "counterCents">) {
  return o.counterCents ?? o.amountCents;
}

/* Buying */

type BuyInput = {
  buyerId: string;
  listingId: string;
  offerId?: string | null;
  delivery: "tracked" | "express";
  payMethod: "paypal" | "card";
  shipTo: ShipTo;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * What the buyer pays for a live listing: its price, or an accepted offer's.
 * With `lock`, the listing row stays locked for the rest of the transaction,
 * so nobody else can buy it in between.
 */
async function quote(tx: Tx, input: Omit<BuyInput, "shipTo" | "payMethod">, { lock = false } = {}) {
  const query = tx
    .select({ listing, ownerId: shop.ownerId, paused: shop.paused })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(eq(listing.id, input.listingId));
  const [row] = lock ? await query.for("update", { of: listing }) : await query;
  if (!row) throw new CommerceError("That listing isn't here any more.");
  if (row.listing.status !== "live") throw new CommerceError("Sorry, someone just bought this one.");
  if (row.paused) throw new CommerceError("This shop is taking a break, so nothing here can be bought for now.");
  if (row.ownerId === input.buyerId) throw new CommerceError("That's your own listing.");
  if (row.listing.priceCents == null) throw new CommerceError("This listing doesn't have a price yet.");

  let itemCents = row.listing.priceCents;
  let offerRow: OfferRow | undefined;
  if (input.offerId) {
    [offerRow] = await tx
      .select()
      .from(offer)
      .where(
        and(eq(offer.id, input.offerId), eq(offer.listingId, row.listing.id), eq(offer.buyerId, input.buyerId)),
      );
    if (!offerRow || effectiveStatus(offerRow) !== "accepted")
      throw new CommerceError("That offer isn't open for paying any more.");
    itemCents = agreedCents(offerRow);
  }
  const shippingCents = shippingFor(row.listing.shippingCents, input.delivery);
  return { row, offerRow, itemCents, shippingCents, totalCents: itemCents + shippingCents };
}

type Payment = {
  provider: string;
  ref: string;
  payeeMerchantId?: string | null;
  platformFeeCents?: number | null;
  paypalFeeCents?: number | null;
  sellerNetCents?: number | null;
};

/** Test checkout, when PayPal isn't set up: always succeeds, nothing moves. */
async function mockPayment(): Promise<Payment> {
  return { provider: "mock", ref: `mock_${crypto.randomUUID().slice(0, 12)}` };
}

/**
 * Buys a live listing. In one transaction the listing row is locked, the
 * payment taken, the order written, the listing marked sold, the offer marked
 * paid and any other open offers on it declined. If the payment throws,
 * nothing is written; `pay` sees the final amounts and can refuse them.
 */
export async function placeOrder(
  input: BuyInput,
  pay: (amounts: { itemCents: number; shippingCents: number; totalCents: number }) => Promise<Payment> = mockPayment,
) {
  const placed = await db.transaction(async (tx) => {
    const { row, offerRow, itemCents, shippingCents, totalCents } = await quote(tx, input, { lock: true });
    const payment = await pay({ itemCents, shippingCents, totalCents });

    const [created] = await tx
      .insert(orders)
      .values({
        listingId: row.listing.id,
        shopId: row.listing.shopId,
        buyerId: input.buyerId,
        offerId: offerRow?.id ?? null,
        itemCents,
        shippingCents,
        totalCents,
        delivery: input.delivery,
        payMethod: input.payMethod,
        shipTo: input.shipTo,
        paymentProvider: payment.provider,
        paymentRef: payment.ref,
        payeeMerchantId: payment.payeeMerchantId ?? null,
        platformFeeCents: payment.platformFeeCents ?? null,
        paypalFeeCents: payment.paypalFeeCents ?? null,
        sellerNetCents: payment.sellerNetCents ?? null,
      })
      .returning();
    await tx
      .update(listing)
      .set({ status: "sold", soldAt: new Date() })
      .where(eq(listing.id, row.listing.id));
    if (offerRow) await tx.update(offer).set({ status: "paid" }).where(eq(offer.id, offerRow.id));
    // Anyone else's offer on it is over
    await tx
      .update(offer)
      .set({ status: "declined", respondedAt: new Date() })
      .where(
        and(
          eq(offer.listingId, row.listing.id),
          inArray(offer.status, ["open", "countered", "accepted"]),
          offerRow ? ne(offer.id, offerRow.id) : sql`true`,
        ),
      );
    return created!;
  });
  emitOrderEvent(placed.id, "listing.sold");
  return placed;
}

/* Paying with PayPal */

/** Where a seller's money goes: their connected PayPal, else the sandbox demo seller. */
async function payeeFor(ownerId: string) {
  const [account] = await db.select().from(paypalAccount).where(eq(paypalAccount.userId, ownerId));
  if (account?.paymentsReceivable) return account.merchantId;
  const demo = demoSellerId();
  if (demo) return demo;
  throw new CommerceError(
    account
      ? "This seller's PayPal isn't ready to take payments yet."
      : "This seller hasn't connected PayPal yet, so it can't be bought right now.",
  );
}

/**
 * Step 1 of a PayPal checkout: price it, create the PayPal order (paid to the
 * seller, our fee taken, the money held) and remember what the buyer chose.
 * Returns the PayPal page to send them to. Nothing is charged yet.
 */
export async function startCheckout(input: BuyInput & { returnUrl: string; cancelUrl: string }) {
  const { row, offerRow, itemCents, shippingCents, totalCents } = await db.transaction((tx) => quote(tx, input));
  const payeeMerchantId = await payeeFor(row.ownerId);
  const platformFee = platformFeeCents(itemCents);
  const checkoutId = crypto.randomUUID();
  const order = await createOrder({
    reference: checkoutId,
    itemName: row.listing.title ?? row.listing.name ?? "Item",
    itemCents,
    shippingCents,
    platformFeeCents: platformFee,
    payeeMerchantId,
    method: input.payMethod,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
  });
  await db.insert(checkout).values({
    id: checkoutId,
    providerOrderId: order.id,
    buyerId: input.buyerId,
    listingId: row.listing.id,
    offerId: offerRow?.id ?? null,
    delivery: input.delivery,
    payMethod: input.payMethod,
    shipTo: input.shipTo,
    itemCents,
    shippingCents,
    totalCents,
    platformFeeCents: platformFee,
    payeeMerchantId,
  });
  return { approveUrl: order.approveUrl };
}

/**
 * Step 2, when PayPal sends the buyer back: capture the payment inside the
 * order transaction, so it's only taken if the listing is still theirs to buy.
 * Safe to run twice (a refresh returns the same order).
 */
export async function finishCheckout(input: { providerOrderId: string; viewerId: string | null }) {
  const [started] = await db.select().from(checkout).where(eq(checkout.providerOrderId, input.providerOrderId));
  if (!started) throw new CommerceError("We couldn't find that checkout.");
  if (input.viewerId && input.viewerId !== started.buyerId) throw new CommerceError("That checkout isn't yours.");
  const listingId = started.listingId;
  if (started.status === "completed" && started.orderId) return { order: null, listingId, already: true };
  if (started.status === "failed") throw new CommerceError("That payment didn't go through. Try again?");

  let capture: Capture | null = null;
  try {
    const order = await placeOrder(started, async (amounts) => {
      // The price moved (offer lapsed, seller edited it) since they left: don't charge
      if (amounts.totalCents !== started.totalCents || amounts.itemCents !== started.itemCents)
        throw new CommerceError("The price changed while you were in PayPal. Nothing was charged; take another look.");
      capture = await captureOrder(started.providerOrderId, `capture-${started.id}`);
      if (capture.status !== "COMPLETED" && capture.status !== "PENDING")
        throw new CommerceError("PayPal didn't take the payment. Nothing was charged.");
      return {
        provider: "paypal",
        ref: capture.id,
        payeeMerchantId: started.payeeMerchantId,
        platformFeeCents: capture.platformFeeCents ?? started.platformFeeCents,
        paypalFeeCents: capture.paypalFeeCents,
        sellerNetCents: capture.sellerNetCents,
      };
    });
    await db.update(checkout).set({ status: "completed", orderId: order.id }).where(eq(checkout.id, started.id));
    return { order, listingId, already: false };
  } catch (error) {
    await db.update(checkout).set({ status: "failed" }).where(eq(checkout.id, started.id));
    // Taken, but the order couldn't be written: give the money straight back
    const taken = capture as Capture | null;
    // Only a capture that took money needs giving back (a DECLINED one took nothing)
    if (taken && (taken.status === "COMPLETED" || taken.status === "PENDING")) {
      await refundCapture({
        captureId: taken.id,
        sellerMerchantId: started.payeeMerchantId,
        reason: "The item couldn't be sold to you after all, so here's your money back.",
      }).catch((refundError) => console.error("Refund after a failed order also failed", taken.id, refundError));
    }
    if (error instanceof PayPalError) {
      console.error("PayPal capture failed", error.issue, error.debugId, error.message);
      throw new CommerceError(
        error.issue === "INSTRUMENT_DECLINED"
          ? "PayPal declined that way to pay. Try again with another one."
          : error.issue === "PAYEE_ACCOUNT_NOT_VERIFIED"
            ? "The seller's PayPal account isn't verified yet, so PayPal can't pay them. Nothing was charged."
            : "PayPal couldn't take the payment. Nothing was charged.",
      );
    }
    throw error;
  }
}

/* Offers */

export async function makeOffer(input: {
  buyerId: string;
  listingId: string;
  amountCents: number;
  note?: string | null;
  depositCents?: number | null;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ listing, ownerId: shop.ownerId, paused: shop.paused })
      .from(listing)
      .innerJoin(shop, eq(shop.id, listing.shopId))
      .where(eq(listing.id, input.listingId));
    if (!row || row.listing.status !== "live") throw new CommerceError("This one isn't for sale any more.");
    if (row.paused) throw new CommerceError("This shop is taking a break, so it isn't taking offers right now.");
    if (row.ownerId === input.buyerId) throw new CommerceError("That's your own listing.");
    if (!row.listing.takeOffers) throw new CommerceError("This seller isn't taking offers on it.");
    const price = row.listing.priceCents ?? 0;
    if (input.amountCents < 100) throw new CommerceError("Offers start at $1.");
    if (input.amountCents >= price) throw new CommerceError("That's the asking price. Just buy it.");
    if (input.depositCents && input.depositCents >= input.amountCents)
      throw new CommerceError("The deposit has to be less than the offer.");

    // One live offer per buyer per listing: a new one replaces the last
    await tx
      .update(offer)
      .set({ status: "withdrawn" })
      .where(
        and(
          eq(offer.listingId, row.listing.id),
          eq(offer.buyerId, input.buyerId),
          inArray(offer.status, ["open", "countered"]),
        ),
      );
    const [created] = await tx
      .insert(offer)
      .values({
        listingId: row.listing.id,
        shopId: row.listing.shopId,
        buyerId: input.buyerId,
        amountCents: input.amountCents,
        note: input.note?.trim() || null,
        depositCents: input.depositCents || null,
        expiresAt: new Date(Date.now() + OFFER_HOURS * HOUR),
      })
      .returning();
    return created!;
  }).then((created) => {
    emitOfferEvent(created.id, "offer.received");
    // The shop's agent may counter it (negotiator.ts, imported late: it imports this file)
    runAfterResponse(async () => (await import("./negotiator")).negotiate(created.id));
    return created;
  });
}

/** The seller's answer. Accepting (or countering) gives the buyer 48 hours. */
export async function respondToOffer(input: {
  sellerId: string;
  offerId: string;
  action: "accept" | "decline" | "counter";
  counterCents?: number;
}) {
  const [row] = await db
    .select({ offer, listing, ownerId: shop.ownerId })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .where(eq(offer.id, input.offerId));
  if (!row || row.ownerId !== input.sellerId) throw new CommerceError("That offer isn't yours to answer.");
  if (effectiveStatus(row.offer) !== "open") throw new CommerceError("That offer has already been answered or ran out.");
  if (row.listing.status !== "live") throw new CommerceError("This listing isn't for sale any more.");

  const now = new Date();
  const later = new Date(now.getTime() + OFFER_HOURS * HOUR);
  if (input.action === "decline") {
    return update(row.offer.id, { status: "declined", respondedAt: now });
  }
  if (input.action === "accept") {
    return update(row.offer.id, { status: "accepted", respondedAt: now, expiresAt: later });
  }
  const counter = input.counterCents ?? 0;
  const price = row.listing.priceCents ?? 0;
  if (counter <= row.offer.amountCents || counter >= price)
    throw new CommerceError("A counter sits between their offer and your price.");
  return update(row.offer.id, { status: "countered", counterCents: counter, counteredBy: "seller", respondedAt: now, expiresAt: later });
}

/** The buyer's answer to a counter, or taking their offer back. */
export async function buyerRespond(input: {
  buyerId: string;
  offerId: string;
  action: "accept-counter" | "decline-counter" | "withdraw";
}) {
  const [row] = await db.select().from(offer).where(eq(offer.id, input.offerId));
  if (!row || row.buyerId !== input.buyerId) throw new CommerceError("That offer isn't yours.");
  const status = effectiveStatus(row);
  let updated: OfferRow;
  if (input.action === "withdraw") {
    if (status !== "open" && status !== "countered") throw new CommerceError("It's too late to take that one back.");
    updated = await update(row.id, { status: "withdrawn" });
  } else {
    if (status !== "countered") throw new CommerceError("There's no counter to answer.");
    updated =
      input.action === "decline-counter"
        ? await update(row.id, { status: "declined" })
        : await update(row.id, { status: "accepted", expiresAt: new Date(Date.now() + OFFER_HOURS * HOUR) });
  }
  emitOfferEvent(updated.id, "offer.updated");
  return updated;
}

async function update(id: string, patch: Partial<typeof offer.$inferInsert>) {
  const [row] = await db.update(offer).set(patch).where(eq(offer.id, id)).returning();
  return row!;
}

/* After the sale */

export async function markShipped(input: { sellerId: string; orderId: string; trackingNumber?: string | null }) {
  const [row] = await db
    .select({ orders, ownerId: shop.ownerId })
    .from(orders)
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .where(eq(orders.id, input.orderId));
  if (!row || row.ownerId !== input.sellerId) throw new CommerceError("That order isn't yours.");
  if (row.orders.status !== "paid") throw new CommerceError("That order has already shipped.");
  const [updated] = await db
    .update(orders)
    .set({ status: "shipped", shippedAt: new Date(), trackingNumber: input.trackingNumber?.trim() || null })
    .where(eq(orders.id, row.orders.id))
    .returning();
  return updated!;
}

/** "It's all good": the buyer has it, so the held money goes to the seller. */
export async function confirmReceived(input: { buyerId: string; orderId: string }) {
  const [row] = await db.select().from(orders).where(eq(orders.id, input.orderId));
  if (!row || row.buyerId !== input.buyerId) throw new CommerceError("That order isn't yours.");
  if (row.status !== "shipped" && row.status !== "delivered")
    throw new CommerceError(row.status === "paid" ? "It hasn't shipped yet." : "That one's already wrapped up.");
  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    // Their word settles any problem they'd reported
    const live = await tx
      .update(dispute)
      .set({ status: "closed", offerCents: null, resolvedAt: now })
      .where(and(eq(dispute.orderId, row.id), inArray(dispute.status, ["open", "escalated"])))
      .returning({ id: dispute.id });
    for (const d of live)
      await tx.insert(disputeEvent).values({ disputeId: d.id, side: "buyer", authorId: input.buyerId, kind: "closed", body: "It's all good." });
    const [out] = await tx
      .update(orders)
      .set({ status: "completed", deliveredAt: row.deliveredAt ?? now, completedAt: now })
      .where(eq(orders.id, row.id))
      .returning();
    return out;
  });
  emitOrderEvent(updated!.id, "order.completed");
  // The buyer's word stands even if PayPal is down; an unreleased order is retried later
  return (await releaseOrder(updated!)) ?? updated!;
}

/**
 * Sends a completed order's held money to the seller. Returns the updated
 * row, or null when there's nothing to release or PayPal refused (logged).
 */
export async function releaseOrder(row: OrderRow) {
  if (row.paymentProvider !== "paypal" || !row.paymentRef || row.releasedAt || row.status !== "completed") return null;
  // A live problem keeps the money held
  const [held] = await db
    .select({ id: dispute.id })
    .from(dispute)
    .where(and(eq(dispute.orderId, row.id), inArray(dispute.status, ["open", "escalated"])));
  if (held) return null;
  try {
    // "failed:2" after PayPal said two releases failed (paypal-webhook.ts): try a fresh request
    const attempt = Number(row.payoutRef?.match(/^failed:(\d+)$/)?.[1] ?? 0);
    const { payoutRef } = await releaseToSeller(row.paymentRef, attempt);
    const [updated] = await db
      .update(orders)
      .set({ releasedAt: new Date(), payoutRef })
      .where(eq(orders.id, row.id))
      .returning();
    emitOrderEvent(row.id, "payout.sent");
    return updated!;
  } catch (error) {
    console.error("Releasing the payment to the seller failed", row.id, error);
    return null;
  }
}

/* Reading */

const listingCard = {
  id: listing.id,
  title: sql<string>`coalesce(${listing.title}, ${listing.name}, 'Untitled')`,
  slug: listing.slug,
  priceCents: listing.priceCents,
  lowestCents: listing.lowestCents,
  status: listing.status,
};
const shopCard = { id: shop.id, slug: shop.slug, name: shop.name, tone: shop.tone };
const personCard = { id: user.id, name: user.name, email: user.email };

async function withCovers<T extends { listing: { id: string } }>(rows: T[]) {
  const covers = await coverPhotos(rows.map((r) => r.listing.id));
  return rows.map((r) => ({ ...r, photo: covers.get(r.listing.id) ?? null }));
}

/** P8: what the buyer has bought, newest first. */
export async function listBuyerOrders(buyerId: string) {
  const rows = await db
    .select({ order: orders, listing: listingCard, shop: shopCard })
    .from(orders)
    .innerJoin(listing, eq(listing.id, orders.listingId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt));
  return withCovers(rows);
}

/** P8: the buyer's offers, newest first, with status as of now. */
export async function listBuyerOffers(buyerId: string) {
  const rows = await db
    .select({ offer, listing: listingCard, shop: shopCard })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .where(eq(offer.buyerId, buyerId))
    .orderBy(desc(offer.createdAt));
  return (await withCovers(rows)).map((r) => ({ ...r, status: effectiveStatus(r.offer) }));
}

/** Seller side (A5, C9, Home): offers on the seller's listings, optionally one listing. */
export async function listSellerOffers(sellerId: string, opts: { listingId?: string } = {}) {
  const rows = await db
    .select({ offer, listing: listingCard, shop: shopCard, buyer: personCard })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .innerJoin(user, eq(user.id, offer.buyerId))
    .where(and(eq(shop.ownerId, sellerId), opts.listingId ? eq(offer.listingId, opts.listingId) : sql`true`))
    .orderBy(desc(offer.createdAt));
  return (await withCovers(rows)).map((r) => ({ ...r, status: effectiveStatus(r.offer) }));
}

/** Seller side (B5, A5, Home): orders on the seller's shops, newest first. */
export async function listSellerOrders(sellerId: string) {
  const rows = await db
    .select({ order: orders, listing: listingCard, shop: shopCard, buyer: personCard })
    .from(orders)
    .innerJoin(listing, eq(listing.id, orders.listingId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .innerJoin(user, eq(user.id, orders.buyerId))
    .where(eq(shop.ownerId, sellerId))
    .orderBy(desc(orders.createdAt));
  return withCovers(rows);
}

/** The buyer's accepted, unpaid offer on a listing, if any: checkout uses its price. */
export async function acceptedOfferFor(buyerId: string, listingId: string) {
  const rows = await db
    .select()
    .from(offer)
    .where(and(eq(offer.buyerId, buyerId), eq(offer.listingId, listingId), eq(offer.status, "accepted")))
    .orderBy(desc(offer.respondedAt));
  return rows.find((o) => effectiveStatus(o) === "accepted") ?? null;
}

/** The last address this buyer shipped to, to prefill checkout. */
export async function lastShipTo(buyerId: string): Promise<ShipTo | null> {
  const [row] = await db
    .select({ shipTo: orders.shipTo })
    .from(orders)
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return row?.shipTo ?? null;
}

export type { OfferStatus, OrderStatus, ShipTo };
