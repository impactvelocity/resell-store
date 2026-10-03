import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import {
  and,
  asc,
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
  thread,
  user,
  webhookDelivery,
  webhookEndpoint,
  type WebhookEvent,
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
async function send(endpoint: WebhookRow, type: string, body: string): Promise<Attempt> {
  const t = Math.floor(Date.now() / 1000);
  let status: number | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "resell.store-webhooks/1",
        "resell-event": type,
        "resell-signature": `t=${t},v1=${sign(endpoint.secret, t, body)}`,
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

/** The endpoint's last result, and when it started failing (kept until a success). */
async function noteResult(userId: string, result: Attempt, now: Date) {
  await db
    .update(webhookEndpoint)
    .set({ lastStatus: result.status, lastError: result.error, lastDeliveredAt: now })
    .where(eq(webhookEndpoint.userId, userId));
  if (result.error) {
    await db
      .update(webhookEndpoint)
      .set({ failingSince: now })
      .where(and(eq(webhookEndpoint.userId, userId), isNull(webhookEndpoint.failingSince)));
  } else {
    await db.update(webhookEndpoint).set({ failingSince: null }).where(eq(webhookEndpoint.userId, userId));
  }
}

/**
 * Sends one event to one endpoint and records how it went. A failed event
 * (not the "ping" test) is queued to be tried again.
 */
export async function deliver(endpoint: WebhookRow, type: WebhookEvent | "ping", object: unknown) {
  const event = {
    id: `evt_${randomBytes(12).toString("hex")}`,
    object: "event",
    type,
    created_at: new Date().toISOString(),
    data: { object },
  };
  const body = JSON.stringify(event);
  const result = await send(endpoint, type, body);
  const now = new Date();
  await noteResult(endpoint.userId, result, now);
  if (type !== "ping") {
    await db.insert(webhookDelivery).values({
      userId: endpoint.userId,
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
    const endpoint = await getWebhook(d.userId);
    if (!endpoint?.enabled) {
      await db
        .update(webhookDelivery)
        .set({ status: "failed", nextAttemptAt: null, lastError: "The webhook was turned off or removed." })
        .where(eq(webhookDelivery.id, d.id));
      gaveUp++;
      continue;
    }
    const result = await send(endpoint, d.type, d.body);
    await noteResult(d.userId, result, now);
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
      .where(and(eq(webhookDelivery.userId, userId), eq(webhookDelivery.status, "pending")));
  }

  // Keep a month of history; nothing pending is ever cleared
  await db
    .delete(webhookDelivery)
    .where(and(lte(webhookDelivery.createdAt, new Date(now.getTime() - KEEP_DELIVERIES_MS)), isNull(webhookDelivery.nextAttemptAt)));

  return { retried: due.length, delivered, gaveUp, turnedOff: turnedOff.length };
}

/** Events still waiting for another try, for /tools/api. */
export async function pendingDeliveries(userId: string) {
  const rows = await db
    .select({ id: webhookDelivery.id })
    .from(webhookDelivery)
    .where(and(eq(webhookDelivery.userId, userId), eq(webhookDelivery.status, "pending")));
  return rows.length;
}

/** Sends an event to the seller's endpoint if they've asked for it. Never throws. */
async function emit(sellerId: string, type: WebhookEvent, load: () => Promise<unknown>) {
  try {
    const endpoint = await getWebhook(sellerId);
    if (!endpoint?.enabled || !endpoint.events.includes(type)) return;
    const object = await load();
    if (object) await deliver(endpoint, type, object);
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

async function offerObject(offerId: string) {
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

async function orderObject(orderId: string) {
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

/** A buyer wrote to a shop. */
export function emitQuestion(messageId: string) {
  fire(async () => {
    const [row] = await db
      .select({ message, thread, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name, email: user.email }, listing: listingCard })
      .from(message)
      .innerJoin(thread, eq(thread.id, message.threadId))
      .innerJoin(shop, eq(shop.id, thread.shopId))
      .innerJoin(user, eq(user.id, thread.buyerId))
      .leftJoin(listing, eq(listing.id, thread.listingId))
      .where(eq(message.id, messageId));
    if (!row || row.message.side !== "buyer") return;
    const buyer = (row.buyer.name?.trim() || row.buyer.email.split("@")[0]!).split(/\s+/)[0]!;
    await emit(row.shop.ownerId, "question.asked", async () => ({
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
    }));
  });
}

/** A buyer reviewed an order. Private reviews go too: they're the seller's to read. */
export function emitReviewEvent(reviewId: string) {
  fire(async () => {
    const [row] = await db
      .select({ review, shop: { slug: shop.slug, name: shop.name, ownerId: shop.ownerId }, buyer: { name: user.name }, listing: listingCard })
      .from(review)
      .innerJoin(shop, eq(shop.id, review.shopId))
      .innerJoin(user, eq(user.id, review.buyerId))
      .innerJoin(listing, eq(listing.id, review.listingId))
      .where(eq(review.id, reviewId));
    if (!row) return;
    await emit(row.shop.ownerId, "review.created", async () => ({
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
    }));
  });
}
