import "server-only";
import { and, db, dispute, disputeEvent, eq, inArray, isNotNull, isNull, listing, orders, paypalAccount, paypalEvent, user } from "@repo/db";
import { emitOrderEvent } from "./api/webhooks";
import { syncPayPalDispute, type PayPalDisputeResource } from "./disputes";
import { notifyProblemOpened, notifyProblemUpdate, notifyRefunded } from "./notify-after-sale";
import { syncPayPalAccount } from "./paypal-sellers";

/*
 * PayPal webhooks (POST /api/paypal/webhook). The route checks the signature
 * with PayPal; this records the event and acts on it. Every event is stored
 * by PayPal's id first, so a redelivery of one we've handled is a no-op, and
 * every handler only moves an order forward, so handling one twice is too.
 *
 * Subscribe the webhook (PAYPAL_WEBHOOK_ID) to:
 *   PAYMENT.CAPTURE.COMPLETED / DENIED / DECLINED / REFUNDED / REVERSED
 *   CUSTOMER.DISPUTE.CREATED / UPDATED / RESOLVED
 *   MERCHANT.ONBOARDING.COMPLETED, MERCHANT.PARTNER-CONSENT.REVOKED
 *   PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED / FAILED
 */

export type PayPalEvent = {
  id: string;
  event_type: string;
  resource?: Record<string, unknown> & { id?: string };
};

type Money = { value?: string };
const cents = (m?: Money) => (m?.value ? Math.round(Number(m.value) * 100) : null);

/**
 * Claims an event for handling. True the first time it arrives, or when an
 * earlier attempt failed (its error is cleared, so two retries at once can't
 * both claim it). False for a redelivery that's handled or being handled.
 */
export async function recordPayPalEvent(event: PayPalEvent) {
  const inserted = await db
    .insert(paypalEvent)
    .values({
      id: event.id,
      type: event.event_type,
      resourceId: event.resource?.id ?? null,
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ id: paypalEvent.id });
  if (inserted.length) return true;
  const retried = await db
    .update(paypalEvent)
    .set({ error: null })
    .where(and(eq(paypalEvent.id, event.id), isNull(paypalEvent.processedAt), isNotNull(paypalEvent.error)))
    .returning({ id: paypalEvent.id });
  return retried.length > 0;
}

/** Records, handles and marks an event. Returns what happened, for the log and the response. */
export async function processPayPalEvent(event: PayPalEvent) {
  if (!(await recordPayPalEvent(event))) return "duplicate";
  try {
    const outcome = await handlePayPalEvent(event);
    await db.update(paypalEvent).set({ processedAt: new Date(), error: null }).where(eq(paypalEvent.id, event.id));
    return outcome;
  } catch (error) {
    await db
      .update(paypalEvent)
      .set({ error: error instanceof Error ? error.message : String(error) })
      .where(eq(paypalEvent.id, event.id));
    throw error;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The order for a capture, locked. A refund we make holds this lock until it
 * commits, so PayPal's webhook for it waits and then sees it recorded.
 */
async function lockOrderByCapture(tx: Tx, captureId: string | undefined | null) {
  if (!captureId) return null;
  const [row] = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.paymentProvider, "paypal"), eq(orders.paymentRef, captureId)))
    .for("update");
  return row ?? null;
}

/** The buyer has all their money back some other way: any live problem is over. */
async function settleLiveDisputes(tx: Tx, orderId: string, why: string) {
  const settled = await tx
    .update(dispute)
    .set({ status: "refunded", offerCents: null, resolvedAt: new Date() })
    .where(and(eq(dispute.orderId, orderId), inArray(dispute.status, ["open", "escalated"])))
    .returning({ id: dispute.id });
  for (const d of settled) await tx.insert(disputeEvent).values({ disputeId: d.id, side: "platform", kind: "refunded", body: why });
}

/**
 * Marks an order fully refunded from PayPal's side. One that never shipped
 * is cancelled instead, and its listing goes back to drafts for the seller.
 */
async function markAllRefunded(tx: Tx, order: typeof orders.$inferSelect, patch: Partial<typeof orders.$inferInsert>, why: string) {
  const now = new Date();
  const unshipped = order.status === "paid";
  await tx
    .update(orders)
    .set({
      ...patch,
      refundedCents: order.totalCents,
      refundedAt: now,
      ...(order.status !== "cancelled" && { status: unshipped ? ("cancelled" as const) : ("refunded" as const) }),
      ...(unshipped && { cancelledAt: now }),
    })
    .where(eq(orders.id, order.id));
  if (unshipped)
    await tx.update(listing).set({ status: "draft", soldAt: null }).where(and(eq(listing.id, order.listingId), eq(listing.status, "sold")));
  await settleLiveDisputes(tx, order.id, why);
}

async function orderByCapture(captureId: string | undefined | null) {
  if (!captureId) return null;
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.paymentProvider, "paypal"), eq(orders.paymentRef, captureId)));
  return row ?? null;
}

/** The capture a refund belongs to: its "up" link ends in /captures/{id}. */
export function captureIdFromRefund(resource: { links?: { rel?: string; href?: string }[] }) {
  const up = resource.links?.find((l) => l.rel === "up")?.href;
  return up?.match(/\/captures\/([^/?]+)/)?.[1] ?? null;
}

export async function handlePayPalEvent(event: PayPalEvent): Promise<string> {
  const r = (event.resource ?? {}) as Record<string, any>;
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      return (await orderByCapture(r.id)) ? "capture completed" : "not ours";

    // A pending capture that never came through: the sale is off, it goes back on sale
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED": {
      const order = await orderByCapture(r.id);
      if (!order) return "not ours";
      const [cancelled] = await db
        .update(orders)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, "paid")))
        .returning();
      if (!cancelled) return "already moved on";
      await db.update(listing).set({ status: "live", soldAt: null }).where(and(eq(listing.id, order.listingId), eq(listing.status, "sold")));
      return "order cancelled";
    }

    // Money back to the buyer: ours (already recorded) or one made in PayPal
    case "PAYMENT.CAPTURE.REFUNDED": {
      const result = await db.transaction(async (tx) => {
        const order = await lockOrderByCapture(tx, captureIdFromRefund(r));
        if (!order) return null;
        const total = cents(r.seller_payable_breakdown?.total_refunded_amount) ?? order.refundedCents + (cents(r.amount) ?? 0);
        const refunded = Math.min(order.totalCents, Math.max(order.refundedCents, total));
        if (refunded === order.refundedCents) return { order, outcome: "already recorded" };
        if (refunded >= order.totalCents) {
          await markAllRefunded(tx, order, { refundRef: r.id ?? order.refundRef }, "Refunded in PayPal.");
          return { order, outcome: "order refunded" };
        }
        await tx
          .update(orders)
          .set({ refundedCents: refunded, refundRef: r.id ?? order.refundRef, refundedAt: new Date() })
          .where(eq(orders.id, order.id));
        return { order, outcome: "part refund recorded" };
      });
      if (!result) return "not ours";
      if (result.outcome !== "already recorded") {
        emitOrderEvent(result.order.id, "order.refunded");
        await notifyRefunded(result.order.id);
      }
      return result.outcome;
    }

    // A chargeback or reversal: the buyer has the money back
    case "PAYMENT.CAPTURE.REVERSED": {
      const outcome = await db.transaction(async (tx) => {
        const order = await lockOrderByCapture(tx, r.id);
        if (!order) return "not ours";
        if (order.refundedCents >= order.totalCents) return "already recorded";
        await markAllRefunded(tx, order, {}, "The payment was reversed in PayPal.");
        emitOrderEvent(order.id, "order.refunded");
        return "order reversed";
      });
      return outcome;
    }

    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.UPDATED":
    case "CUSTOMER.DISPUTE.RESOLVED": {
      const resource = r as PayPalDisputeResource;
      if (!resource.dispute_id) return "no dispute id";
      const d = await syncPayPalDispute(resource);
      if (!d) return "not ours";
      if (d.newCase) {
        // New to us, or taking over one reported here: either way the seller hears it's with PayPal now
        await notifyProblemOpened(d.id);
        emitOrderEvent(d.orderId, "order.problem");
      } else if (d.previousStatus !== d.status) {
        if (d.status === "refunded") {
          emitOrderEvent(d.orderId, "order.refunded");
          await notifyRefunded(d.orderId);
        } else await notifyProblemUpdate(d.id);
      }
      return `dispute ${d.status}`;
    }

    case "MERCHANT.ONBOARDING.COMPLETED": {
      const trackingId = r.tracking_id as string | undefined;
      if (!trackingId) return "no tracking id";
      const [person] = await db.select({ id: user.id }).from(user).where(eq(user.id, trackingId));
      if (!person) return "not ours";
      await syncPayPalAccount(person.id);
      return "seller synced";
    }

    case "MERCHANT.PARTNER-CONSENT.REVOKED": {
      const merchantId = r.merchant_id as string | undefined;
      if (!merchantId) return "no merchant id";
      const rows = await db
        .update(paypalAccount)
        .set({ paymentsReceivable: false, permissions: [] })
        .where(and(eq(paypalAccount.merchantId, merchantId), eq(paypalAccount.demo, false)))
        .returning();
      return rows.length ? "seller disconnected" : "not ours";
    }

    case "PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED": {
      const order = await orderByCapture(r.reference_id);
      if (!order) return "not ours";
      const rows = await db
        .update(orders)
        .set({ releasedAt: new Date(), payoutRef: r.item_id ?? order.payoutRef })
        .where(and(eq(orders.id, order.id), isNull(orders.releasedAt)))
        .returning();
      if (rows.length) emitOrderEvent(order.id, "payout.sent");
      return rows.length ? "payout recorded" : "already recorded";
    }

    // The release didn't go through after all: clear it so the sweep tries again
    case "PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED": {
      const order = await orderByCapture(r.reference_id);
      if (!order) return "not ours";
      const failures = Number(order.payoutRef?.match(/^failed:(\d+)$/)?.[1] ?? 0) + 1;
      await db
        .update(orders)
        .set({ releasedAt: null, payoutRef: `failed:${failures}` })
        .where(and(eq(orders.id, order.id), inArray(orders.status, ["completed"])));
      return "payout failed, will retry";
    }

    default:
      return "ignored";
  }
}
