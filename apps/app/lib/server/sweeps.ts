import "server-only";
import {
  and,
  db,
  dispute,
  disputeEvent,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  notice,
  offer,
  orders,
  type OfferStatus,
} from "@repo/db";
import { pruneActivity } from "./api/log";
import { emitOfferEvent, emitOrderEvent, retryWebhooks } from "./api/webhooks";
import { releaseOrder } from "./commerce";
import { requestReviews, sendAgentSummaries, sendFollowDigests } from "./digests";
import { cancelOrder, escalateDispute, ordersWithLiveDispute } from "./disputes";
import {
  notifyArrivalCheck,
  notifyCancelled,
  notifyOfferAnswerReminder,
  notifyOfferBuyerReminder,
  notifyOfferExpired,
  notifyPaidOut,
  notifyProblemUpdate,
  notifyShipLate,
  notifyShipReminder,
  type PaidOutWhy,
} from "./notify-after-sale";
import { arrivalCheckAt, autoCancelAt, disputeEscalatesAt, releaseAt, shipBy } from "./payout-policy";

/*
 * The timed side of offers and orders. Each sweep finds what's due and acts
 * on it; every action re-checks the row, so running a sweep twice (or two at
 * once) does nothing extra. Reminders are claimed in the `notice` table
 * before they're sent, so nobody gets the same one twice.
 *
 * They run as Render Workflow tasks (workflows/main.ts), started by a Render
 * Cron Job every 15 minutes. Without Render, POST /api/cron/sweep runs
 * runSweeps() in-process.
 *
 *   offers  expire the lapsed ones, remind whoever's turn it is 12 hours before
 *   digests follower digests, the evening agent summary, review requests
 *           (digests.ts)
 *   orders  "did you ship it?" at the ship-by date (and tell the buyer they
 *           may cancel), cancel and refund if it never ships, "did it
 *           arrive?" a week after shipping, release the money when the
 *           check window closes, and step in on problems nobody answers
 */

/** How long before an offer runs out whoever's turn it is gets a reminder. */
export const OFFER_REMINDER_HOURS = 12;

const HOUR = 60 * 60 * 1000;

/** Marks a reminder as sent. False if it already was: don't send it again. */
export async function claimNotice(kind: string, refId: string) {
  const rows = await db.insert(notice).values({ kind, refId }).onConflictDoNothing().returning();
  return rows.length > 0;
}

/* Offers */

/** Lapsed offers get status "expired", a webhook and emails to whoever needs to know. */
export async function expireOffers(now = new Date()) {
  const due = await db
    .select({ id: offer.id, status: offer.status })
    .from(offer)
    .where(and(inArray(offer.status, ["open", "countered", "accepted"]), lte(offer.expiresAt, now)));
  let expired = 0;
  for (const o of due) {
    // Only if nobody moved it on in the meantime
    const [row] = await db
      .update(offer)
      .set({ status: "expired" })
      .where(and(eq(offer.id, o.id), eq(offer.status, o.status), lte(offer.expiresAt, now)))
      .returning({ id: offer.id });
    if (!row) continue;
    expired++;
    emitOfferEvent(o.id, "offer.updated");
    await notifyOfferExpired(o.id, o.status as OfferStatus);
  }
  return expired;
}

/** 12 hours before an offer runs out: the seller if it's theirs to answer, else the buyer. */
export async function remindOffers(now = new Date()) {
  const soon = new Date(now.getTime() + OFFER_REMINDER_HOURS * HOUR);
  const due = await db
    .select({ id: offer.id, status: offer.status, createdAt: offer.createdAt, respondedAt: offer.respondedAt })
    .from(offer)
    .where(and(inArray(offer.status, ["open", "countered", "accepted"]), gt(offer.expiresAt, now), lte(offer.expiresAt, soon)));
  let sent = 0;
  for (const o of due) {
    if (!(await claimNotice(`offer.${o.status}-reminder`, o.id))) continue;
    sent++;
    if (o.status === "open") await notifyOfferAnswerReminder(o.id);
    else await notifyOfferBuyerReminder(o.id);
  }
  return sent;
}

/* Orders: shipping */

/** Past the ship-by date and still "paid": nudge the seller, tell the buyer they can cancel. Once. */
export async function remindShipping(now = new Date()) {
  const paid = await db.select().from(orders).where(eq(orders.status, "paid"));
  let sent = 0;
  for (const o of paid) {
    if (shipBy(o) > now || autoCancelAt(o) <= now) continue;
    if (!(await claimNotice("order.ship-reminder", o.id))) continue;
    sent++;
    await notifyShipReminder(o.id);
    await notifyShipLate(o.id);
  }
  return sent;
}

/** Orders that never shipped and are due to be called off. */
export async function dueCancellations(now = new Date()) {
  const paid = await db.select({ id: orders.id, createdAt: orders.createdAt }).from(orders).where(eq(orders.status, "paid"));
  return paid.filter((o) => autoCancelAt(o) <= now).map((o) => o.id);
}

/**
 * Calls off one order that never shipped and refunds the buyer. Throws if
 * the refund fails, so a workflow retries it; a no-op if it moved on.
 */
export async function cancelUnshipped(orderId: string, now = new Date()) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o || o.status !== "paid" || autoCancelAt(o) > now) return false;
  await cancelOrder({ orderId, actorId: null, by: "system" });
  await notifyCancelled(orderId, "system");
  return true;
}

/* Orders: arrival and payout */

/** A week after shipping: ask the buyer whether it arrived. Once, and not while there's a problem. */
export async function checkArrivals(now = new Date()) {
  const onTheWay = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.status, ["shipped", "delivered"]), isNotNull(orders.shippedAt)));
  const due = onTheWay.filter((o) => (arrivalCheckAt(o) ?? now) <= now && (releaseAt(o) ?? now) > now);
  const held = await ordersWithLiveDispute(due.map((o) => o.id));
  let sent = 0;
  for (const o of due) {
    if (held.has(o.id)) continue;
    if (!(await claimNotice("order.arrival-check", o.id))) continue;
    sent++;
    await notifyArrivalCheck(o.id);
  }
  return sent;
}

/**
 * Orders whose money should go to the seller now: the check window after
 * delivery has closed (or PayPal's hold limit is near), and nothing's wrong.
 * Also completed PayPal orders whose release failed earlier.
 */
export async function dueReleases(now = new Date()) {
  const candidates = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, ["shipped", "delivered", "completed"]));
  const due = candidates.filter((o) =>
    o.status === "completed"
      ? o.paymentProvider === "paypal" && !o.releasedAt
      : (releaseAt(o) ?? new Date(8.64e15)) <= now,
  );
  const held = await ordersWithLiveDispute(due.map((o) => o.id));
  return due.filter((o) => !held.has(o.id)).map((o) => o.id);
}

/**
 * Finishes one order and pays the seller. Throws when PayPal won't release
 * yet, so a workflow retries it; a no-op if it's already done or has a live
 * problem.
 */
export async function releaseDue(orderId: string, now = new Date()) {
  const held = await ordersWithLiveDispute([orderId]);
  if (held.size) return false;
  let [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return false;
  let why: PaidOutWhy | undefined;
  if (o.status === "shipped" || o.status === "delivered") {
    if ((releaseAt(o) ?? new Date(8.64e15)) > now) return false;
    why = "window";
    const [done] = await db
      .update(orders)
      .set({ status: "completed", deliveredAt: o.deliveredAt ?? now, completedAt: now })
      .where(and(eq(orders.id, o.id), inArray(orders.status, ["shipped", "delivered"])))
      .returning();
    if (!done) return false;
    o = done;
    emitOrderEvent(o.id, "order.completed");
  }
  if (o.status !== "completed") return false;
  if (o.paymentProvider === "paypal" && !o.releasedAt) {
    const released = await releaseOrder(o);
    if (!released) throw new Error(`Couldn't release order ${o.id} to the seller yet; will retry`);
  }
  await paidOut(o.id, why);
  return true;
}

/** The "you've been paid" email, once per order, whoever finished it. */
export async function paidOut(orderId: string, why?: PaidOutWhy) {
  if (await claimNotice("order.paid-out", orderId)) await notifyPaidOut(orderId, why);
}

/* Problems */

/** Problems the seller hasn't answered in time go to resell.store. */
export async function escalateQuiet(now = new Date()) {
  const open = await db
    .select({ id: dispute.id, createdAt: dispute.createdAt })
    .from(dispute)
    .where(and(eq(dispute.status, "open"), eq(dispute.source, "buyer"), isNull(dispute.escalatedAt)));
  let escalated = 0;
  for (const d of open) {
    if (disputeEscalatesAt(d) > now) continue;
    const [sellerSaid] = await db
      .select({ id: disputeEvent.id })
      .from(disputeEvent)
      .where(and(eq(disputeEvent.disputeId, d.id), eq(disputeEvent.side, "seller")))
      .limit(1);
    if (sellerSaid) continue;
    try {
      await escalateDispute({ userId: null, disputeId: d.id, body: "The seller didn't answer in time." });
    } catch {
      continue;
    }
    escalated++;
    await notifyProblemUpdate(d.id);
  }
  return escalated;
}

/* Everything, in-process */

async function each(ids: string[], fn: (id: string) => Promise<boolean>) {
  let done = 0;
  for (const id of ids) {
    try {
      if (await fn(id)) done++;
    } catch (error) {
      console.error("[sweep]", error);
    }
  }
  return done;
}

/** Failed webhook deliveries that are due (api/webhooks.ts), plus clearing out old API activity. */
export async function webhookSweep(now = new Date()) {
  const webhooks = await retryWebhooks(now);
  const activityPruned = await pruneActivity(now);
  return { ...webhooks, activityPruned };
}

/** One pass of every sweep. What the cron route runs when there's no Render Workflow. */
export async function runSweeps(now = new Date()) {
  const offersExpired = await expireOffers(now);
  const offerReminders = await remindOffers(now);
  const shipReminders = await remindShipping(now);
  const cancelled = await each(await dueCancellations(now), (id) => cancelUnshipped(id, now));
  const arrivalChecks = await checkArrivals(now);
  const released = await each(await dueReleases(now), (id) => releaseDue(id, now));
  const escalated = await escalateQuiet(now);
  const digests = await runDigests(now);
  const webhooks = await webhookSweep(now);
  return { offersExpired, offerReminders, shipReminders, cancelled, arrivalChecks, released, escalated, ...digests, webhooks };
}

/** The roll-up emails (digests.ts): follower digests, the evening agent summary, review requests. */
export async function runDigests(now = new Date()) {
  const followDigests = await sendFollowDigests(now);
  const agentSummaries = await sendAgentSummaries(claimNotice, now);
  const reviewRequests = await requestReviews(claimNotice, now);
  return { followDigests, agentSummaries, reviewRequests };
}
