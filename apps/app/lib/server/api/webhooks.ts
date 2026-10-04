import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import {
  and,
  asc,
  count,
  db,
  eq,
  isNull,
  listing,
  lte,
  message,
  offer,
  orders,
  review,
  shop,
  sql,
  thread,
  user,
  webhookDelivery,
  webhookEndpoint,
  webhookSubscription,
  type WebhookEvent,
  type WebhookSubscriptionSource,
} from "@repo/db";
import { effectiveStatus } from "../commerce";
import { coverPhotos } from "../listings";
import { storeUrl } from "../../urls";
import { apiOffer, apiOrder } from "./serialize";

/*
 * Webhooks (D3): we POST a signed JSON event to the seller's URL when
 * something happens on their shops, with a 10 second timeout; the last status
 * shows on /tools/api. Delivery never blocks or fails the thing that caused it.
 *
 * Anything but a 2xx is tried again by the webhook sweep, about 5 minutes,
 * 30 minutes, 2 hours, 6 hours and a day later (six tries in all), with the
 * same event id so receivers can skip repeats. An endpoint that has failed
 * for three days straight is turned off until the seller saves it again.
 *
 * Each request carries `Resell-Signature: t=<unix seconds>,v1=<hex>`, where
 * v1 is HMAC-SHA256 of `${t}.${body}` with the endpoint's secret.
 *
 * Subscriptions are more places to send events, each with its own events
 * and secret (REST hooks): the resell.store Zapier app makes one per Zap,
 * and sellers can paste a Webhooks by Zapier address on /tools/api. They're
 * retried and turned off the same way, and one that answers 410 Gone is
 * deleted, as Zapier asks.
 */

export const webhookEvents: { id: WebhookEvent; what: string }[] = [
  { id: "listing.sold", what: "Something sold" },
  { id: "offer.received", what: "A buyer made an offer" },
  { id: "offer.updated", what: "A buyer took your counter, turned it down or withdrew" },
  { id: "question.asked", what: "A buyer sent a message" },
  { id: "order.completed", what: "A buyer said it arrived and it's all good" },
  { id: "order.problem", what: "A buyer reported a problem with an order" },
  { id: "order.refunded", what: "An order was cancelled or refunded" },
  { id: "payout.sent", what: "Money went to your PayPal" },
  { id: "review.created", what: "A buyer left a review" },
];

export const defaultWebhookEvents: WebhookEvent[] = ["listing.sold", "offer.received", "question.asked"];

export type WebhookRow = typeof webhookEndpoint.$inferSelect;
export type SubscriptionRow = typeof webhookSubscription.$inferSelect;

/** Where one event goes: the seller's endpoint, or one of their subscriptions. */
type Target = { userId: string; url: string; secret: string; subscriptionId: string | null };

const endpointTarget = (row: WebhookRow): Target => ({ userId: row.userId, url: row.url, secret: row.secret, subscriptionId: null });
const subscriptionTarget = (row: SubscriptionRow): Target => ({
  userId: row.userId,
  url: row.url,
  secret: row.secret,
  subscriptionId: row.id,
});

export function newWebhookSecret() {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function sign(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export async function getWebhook(userId: string) {
  const [row] = await db.select().from(webhookEndpoint).where(eq(webhookEndpoint.userId, userId));
  return row ?? null;
}

export async function saveWebhook(userId: string, input: { url: string; events: WebhookEvent[]; enabled?: boolean }) {
  const existing = await getWebhook(userId);
  // Saving switches it back on and starts the failure clock over
  const values = { url: input.url, events: input.events, enabled: input.enabled ?? true, failingSince: null };
  if (existing) {
    const [row] = await db.update(webhookEndpoint).set(values).where(eq(webhookEndpoint.userId, userId)).returning();
    return row!;
  }
  const [row] = await db
    .insert(webhookEndpoint)
    .values({ userId, secret: newWebhookSecret(), ...values })
    .returning();
  return row!;
}

export async function deleteWebhook(userId: string) {
  await db.delete(webhookEndpoint).where(eq(webhookEndpoint.userId, userId));
}

export async function rotateWebhookSecret(userId: string) {
  const [row] = await db
    .update(webhookEndpoint)
    .set({ secret: newWebhookSecret() })
    .where(eq(webhookEndpoint.userId, userId))
    .returning();
  return row ?? null;
}

/* Subscriptions */

/** Enough for a Zap per event on every shop, with room to spare. */
export const MAX_SUBSCRIPTIONS = 50;

export async function listSubscriptions(userId: string) {
  return db.select().from(webhookSubscription).where(eq(webhookSubscription.userId, userId)).orderBy(asc(webhookSubscription.createdAt));
}

export async function getSubscription(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(webhookSubscription)
    .where(and(eq(webhookSubscription.userId, userId), eq(webhookSubscription.id, id)));
  return row ?? null;
}

/**
 * Adds a subscription, or updates the one already sending to that address
 * (switching it back on). Null when they already have MAX_SUBSCRIPTIONS.
 */
export async function addSubscription(
  userId: string,
  input: { url: string; events: WebhookEvent[]; source: WebhookSubscriptionSource; name?: string | null },
) {
  const values = { events: input.events, name: input.name?.trim() || null, enabled: true, failingSince: null };
  const [same] = await db
    .update(webhookSubscription)
    .set(values)
    .where(and(eq(webhookSubscription.userId, userId), eq(webhookSubscription.url, input.url)))
    .returning();
  if (same) return same;
  const [{ n }] = (await db.select({ n: count() }).from(webhookSubscription).where(eq(webhookSubscription.userId, userId))) as [{ n: number }];
  if (n >= MAX_SUBSCRIPTIONS) return null;
  const [row] = await db
    .insert(webhookSubscription)
    .values({ userId, url: input.url, source: input.source, secret: newWebhookSecret(), ...values })
    .returning();
  return row!;
}

/** True if there was one to remove. */
export async function removeSubscription(userId: string, id: string) {
  const gone = await db
    .delete(webhookSubscription)
    .where(and(eq(webhookSubscription.userId, userId), eq(webhookSubscription.id, id)))
    .returning({ id: webhookSubscription.id });
  return gone.length > 0;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The wait before each retry; after the last one the event is given up on. */
export const RETRY_DELAYS_MS = [5 * MINUTE, 30 * MINUTE, 2 * HOUR, 6 * HOUR, 24 * HOUR];

/** An endpoint failing this long is turned off. */
export const TURN_OFF_AFTER_MS = 3 * 24 * HOUR;

/** How long delivered and given-up events are kept. */
const KEEP_DELIVERIES_MS = 30 * 24 * HOUR;

type Attempt = { status: number | null; error: string | null };

/** One POST of an already-built event body, signed now. */
async function send(target: Target, type: string, body: string): Promise<Attempt> {
  const t = Math.floor(Date.now() / 1000);
  let status: number | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "resell.store-webhooks/1",
        "resell-event": type,
        "resell-signature": `t=${t},v1=${sign(target.secret, t, body)}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
      redirect: "manual",
    });
    status = res.status;
    if (!res.ok) error = `Your server answered ${res.status}.`;
  } catch (e) {
    error = e instanceof Error && e.name === "TimeoutError" ? "Your server took longer than 10 seconds." : "We couldn't reach your server.";
  }
  return { status, error };
}

/** A subscription's address answered 410 Gone: Zapier's way of saying the Zap is gone. */
const isGone = (target: Target, result: Attempt) => target.subscriptionId !== null && result.status === 410;

/**
 * The target's last result, and when it started failing (kept until a
 * success). A subscription that answered 410 is deleted instead.
 */
async function noteResult(target: Target, result: Attempt, now: Date) {
  const last = { lastStatus: result.status, lastError: result.error, lastDeliveredAt: now };
  if (target.subscriptionId) {
    const where = eq(webhookSubscription.id, target.subscriptionId);
    if (isGone(target, result)) {
      await db.delete(webhookSubscription).where(where);
      return;
    }
    await db
      .update(webhookSubscription)
      .set({ ...last, failingSince: result.error ? sql`coalesce(${webhookSubscription.failingSince}, ${now})` : null })
      .where(where);
    return;
  }
  await db
    .update(webhookEndpoint)
    .set({ ...last, failingSince: result.error ? sql`coalesce(${webhookEndpoint.failingSince}, ${now})` : null })
    .where(eq(webhookEndpoint.userId, target.userId));
}

/** The JSON we POST. `test` marks samples sent from the API page or POST /webhooks/subscriptions/:id/test. */
export function eventBody(type: WebhookEvent | "ping", object: unknown, { test = false, id = `evt_${randomBytes(12).toString("hex")}` } = {}) {
  return {
    id,
    object: "event",
    type,
    created_at: new Date().toISOString(),
    ...(test ? { test: true } : {}),
    data: { object },
  };
}

/**
 * Sends one event to one target and records how it went. A failed event
 * (not a "ping" or a test) is queued to be tried again.
 */
async function deliverTo(target: Target, type: WebhookEvent | "ping", object: unknown, { test = false } = {}) {
  const event = eventBody(type, object, { test });
  const body = JSON.stringify(event);
  const result = await send(target, type, body);
  const now = new Date();
  await noteResult(target, result, now);
  if (type !== "ping" && !test && !isGone(target, result)) {
    await db.insert(webhookDelivery).values({
      userId: target.userId,
      subscriptionId: target.subscriptionId,
      eventId: event.id,
      type,
      body,
      attempts: 1,
      status: result.error ? "pending" : "delivered",
      nextAttemptAt: result.error ? new Date(now.getTime() + RETRY_DELAYS_MS[0]!) : null,
      lastStatus: result.status,
      lastError: result.error,
      deliveredAt: result.error ? null : now,
    });
  }
  return { id: event.id, ...result };
}

/** Sends one event to the seller's endpoint (see deliverTo). */
export function deliver(endpoint: WebhookRow, type: WebhookEvent | "ping", object: unknown) {
  return deliverTo(endpointTarget(endpoint), type, object);
}

/** Sends one event to a subscription; `test` ones aren't retried. */
export function deliverToSubscription(row: SubscriptionRow, type: WebhookEvent, object: unknown, opts: { test?: boolean } = {}) {
  return deliverTo(subscriptionTarget(row), type, object, opts);
}

/**
 * The webhook sweep: tries again whatever's due, turns off endpoints that
 * have failed for three days, and clears out old deliveries. Each event is
 * claimed before it's sent, so two sweeps at once don't send it twice.
 */
export async function retryWebhooks(now = new Date()) {
  const due = await db
    .select()
    .from(webhookDelivery)
    .where(and(eq(webhookDelivery.status, "pending"), lte(webhookDelivery.nextAttemptAt, now)))
    .orderBy(asc(webhookDelivery.nextAttemptAt))
    .limit(200);
  let delivered = 0;
  let gaveUp = 0;
  for (const d of due) {
    const [claimed] = await db
      .update(webhookDelivery)
      .set({ nextAttemptAt: new Date(now.getTime() + 10 * MINUTE) })
      .where(and(eq(webhookDelivery.id, d.id), eq(webhookDelivery.status, "pending"), lte(webhookDelivery.nextAttemptAt, now)))
      .returning({ id: webhookDelivery.id });
    if (!claimed) continue;
    // A removed subscription takes its deliveries with it, so only the endpoint can be missing here
    const row = d.subscriptionId ? await getSubscription(d.userId, d.subscriptionId) : await getWebhook(d.userId);
    if (!row?.enabled) {
      await db
        .update(webhookDelivery)
        .set({ status: "failed", nextAttemptAt: null, lastError: "The webhook was turned off or removed." })
        .where(eq(webhookDelivery.id, d.id));
      gaveUp++;
      continue;
    }
    const target = "id" in row ? subscriptionTarget(row) : endpointTarget(row);
    const result = await send(target, d.type, d.body);
    await noteResult(target, result, now);
    if (isGone(target, result)) {
      gaveUp++;
      continue;
    }
    const attempts = d.attempts + 1;
    const wait = RETRY_DELAYS_MS[attempts - 1];
    if (!result.error) delivered++;
    else if (wait === undefined) gaveUp++;
    await db
      .update(webhookDelivery)
      .set({
        attempts,
        lastStatus: result.status,
        lastError: result.error,
        ...(result.error
          ? { status: wait === undefined ? "failed" : "pending", nextAttemptAt: wait === undefined ? null : new Date(now.getTime() + wait) }
          : { status: "delivered", nextAttemptAt: null, deliveredAt: now }),
      })
      .where(eq(webhookDelivery.id, d.id));
  }

  const turnedOff = await db
    .update(webhookEndpoint)
    .set({
      enabled: false,
      lastError: "We turned this webhook off after three days of failed deliveries. Fix your server, then save it again.",
    })
    .where(and(eq(webhookEndpoint.enabled, true), lte(webhookEndpoint.failingSince, new Date(now.getTime() - TURN_OFF_AFTER_MS))))
    .returning({ userId: webhookEndpoint.userId });
  for (const { userId } of turnedOff) {
    await db
      .update(webhookDelivery)
      .set({ status: "failed", nextAttemptAt: null })
      .where(and(eq(webhookDelivery.userId, userId), isNull(webhookDelivery.subscriptionId), eq(webhookDelivery.status, "pending")));
  }
  const subsOff = await db
    .update(webhookSubscription)
    .set({
      enabled: false,
      lastError: "We turned this off after three days of failed deliveries. Turn the Zap off and on again, or add the address again.",
    })
    .where(
      and(eq(webhookSubscription.enabled, true), lte(webhookSubscription.failingSince, new Date(now.getTime() - TURN_OFF_AFTER_MS))),
    )
    .returning({ id: webhookSubscription.id });
  for (const { id } of subsOff) {
    await db
      .update(webhookDelivery)
      .set({ status: "failed", nextAttemptAt: null })
      .where(and(eq(webhookDelivery.subscriptionId, id), eq(webhookDelivery.status, "pending")));
  }

  // Keep a month of history; nothing pending is ever cleared
  await db
    .delete(webhookDelivery)
    .where(and(lte(webhookDelivery.createdAt, new Date(now.getTime() - KEEP_DELIVERIES_MS)), isNull(webhookDelivery.nextAttemptAt)));

  return { retried: due.length, delivered, gaveUp, turnedOff: turnedOff.length + subsOff.length };
}

/** Events still waiting for another try at the endpoint, for /tools/api. */
export async function pendingDeliveries(userId: string) {
  const rows = await db
    .select({ id: webhookDelivery.id })
    .from(webhookDelivery)
    .where(and(eq(webhookDelivery.userId, userId), isNull(webhookDelivery.subscriptionId), eq(webhookDelivery.status, "pending")));
  return rows.length;
}

/** Sends an event to the seller's endpoint and subscriptions that asked for it. Never throws. */
async function emit(sellerId: string, type: WebhookEvent, load: () => Promise<unknown>) {
  try {
    const [endpoint, subscriptions] = await Promise.all([getWebhook(sellerId), listSubscriptions(sellerId)]);
    const targets = [
      ...(endpoint?.enabled && endpoint.events.includes(type) ? [endpointTarget(endpoint)] : []),
      ...subscriptions.filter((s) => s.enabled && s.events.includes(type)).map(subscriptionTarget),
    ];
    if (targets.length === 0) return;
    const object = await load();
    if (!object) return;
    const results = await Promise.allSettled(targets.map((t) => deliverTo(t, type, object)));
    for (const r of results) if (r.status === "rejected") console.error(`[webhook] ${type} failed`, r.reason);
  } catch (error) {
    console.error(`[webhook] ${type} failed`, error);
  }
}

/* What each event carries */

const listingCard = {
  id: listing.id,
  title: listing.title,
  name: listing.name,
  slug: listing.slug,
  priceCents: listing.priceCents,
  status: listing.status,
};

export async function offerObject(offerId: string) {
  const [row] = await db
    .select({ offer, listing: listingCard, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name, email: user.email } })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .innerJoin(user, eq(user.id, offer.buyerId))
    .where(eq(offer.id, offerId));
  if (!row) return null;
  const photo = (await coverPhotos([row.listing.id])).get(row.listing.id) ?? null;
  return {
    sellerId: row.shop.ownerId,
    object: apiOffer({
      ...row,
      listing: { ...row.listing, title: row.listing.title ?? row.listing.name ?? "Untitled" },
      status: effectiveStatus(row.offer),
      photo,
    }),
  };
}

export async function orderObject(orderId: string) {
  const [row] = await db
    .select({ order: orders, listing: listingCard, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name, email: user.email } })
    .from(orders)
    .innerJoin(listing, eq(listing.id, orders.listingId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .innerJoin(user, eq(user.id, orders.buyerId))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const photo = (await coverPhotos([row.listing.id])).get(row.listing.id) ?? null;
  return {
    sellerId: row.shop.ownerId,
    object: apiOrder({ ...row, listing: { ...row.listing, title: row.listing.title ?? row.listing.name ?? "Untitled" }, photo }, "seller"),
  };
}

function fire(fn: () => Promise<void>) {
  void fn().catch((error) => console.error("[webhook] failed", error));
}

export function emitOfferEvent(offerId: string, type: "offer.received" | "offer.updated") {
  fire(async () => {
    const found = await offerObject(offerId);
    if (found) await emit(found.sellerId, type, async () => found.object);
  });
}

export function emitOrderEvent(
  orderId: string,
  type: "listing.sold" | "order.completed" | "order.problem" | "order.refunded" | "payout.sent",
) {
  fire(async () => {
    const found = await orderObject(orderId);
    if (found) await emit(found.sellerId, type, async () => found.object);
  });
}

/** A buyer's message to a shop, as question.asked carries it; null for the seller's own. */
export async function questionObject(messageId: string) {
  const [row] = await db
    .select({ message, thread, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name, email: user.email }, listing: listingCard })
    .from(message)
    .innerJoin(thread, eq(thread.id, message.threadId))
    .innerJoin(shop, eq(shop.id, thread.shopId))
    .innerJoin(user, eq(user.id, thread.buyerId))
    .leftJoin(listing, eq(listing.id, thread.listingId))
    .where(eq(message.id, messageId));
  if (!row || row.message.side !== "buyer") return null;
  const buyer = (row.buyer.name?.trim() || row.buyer.email.split("@")[0]!).split(/\s+/)[0]!;
  return {
    sellerId: row.shop.ownerId,
    object: {
      object: "message",
      id: row.message.id,
      thread: row.thread.id,
      from: buyer,
      body: row.message.body,
      created_at: row.message.createdAt.toISOString(),
      shop: { slug: row.shop.slug, name: row.shop.name },
      listing: row.listing
        ? {
            id: row.listing.id,
            title: row.listing.title ?? row.listing.name,
            url: row.listing.slug ? storeUrl(row.shop.slug, `/${row.listing.slug}`) : null,
          }
        : null,
    },
  };
}

/** A review, as review.created carries it. Private reviews too: they're the seller's to read. */
export async function reviewObject(reviewId: string) {
  const [row] = await db
    .select({ review, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name }, listing: listingCard })
    .from(review)
    .innerJoin(shop, eq(shop.id, review.shopId))
    .innerJoin(user, eq(user.id, review.buyerId))
    .innerJoin(listing, eq(listing.id, review.listingId))
    .where(eq(review.id, reviewId));
  if (!row) return null;
  return {
    sellerId: row.shop.ownerId,
    object: {
      object: "review",
      id: row.review.id,
      order: row.review.orderId,
      rating: row.review.rating,
      body: row.review.body,
      public: row.review.public,
      from: row.buyer.name?.trim().split(/\s+/)[0] || "A buyer",
      created_at: row.review.createdAt.toISOString(),
      reply: null,
      shop: { slug: row.shop.slug, name: row.shop.name },
      listing: {
        id: row.listing.id,
        title: row.listing.title ?? row.listing.name,
        url: row.listing.slug ? storeUrl(row.shop.slug, `/${row.listing.slug}`) : null,
      },
    },
  };
}

/** A buyer wrote to a shop. */
export function emitQuestion(messageId: string) {
  fire(async () => {
    const found = await questionObject(messageId);
    if (found) await emit(found.sellerId, "question.asked", async () => found.object);
  });
}

/** A buyer reviewed an order. */
export function emitReviewEvent(reviewId: string) {
  fire(async () => {
    const found = await reviewObject(reviewId);
    if (found) await emit(found.sellerId, "review.created", async () => found.object);
  });
}
