/*
 * The money rules for a sale: what the platform keeps and when the seller is
 * paid. PayPal captures the buyer's payment with delayed disbursement, so the
 * money sits with PayPal until we release it to the seller (or PayPal does on
 * its own, 28 days after capture).
 *
 * Seller nets: total − platform fee − PayPal's processing fee. PayPal takes
 * its fee from the seller's share, not from ours.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Platform fee in basis points of the item price. Shipping is never taxed. */
// `||`, not `??`: a blank PLATFORM_FEE_BPS= (as in .env.example) means the default, not 0%
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS || 1000);

/** The fee on a sale, in cents. Free sales stay free. */
export function platformFeeCents(itemCents: number) {
  return Math.round((itemCents * PLATFORM_FEE_BPS) / 10_000);
}

/** The seller ships within this many days of payment, or the buyer can cancel for a refund. */
export const SHIP_BY_DAYS = 3;

/** Still not shipped this long after payment: it's called off and the buyer refunded. */
export const AUTO_CANCEL_DAYS = 7;

/** This long after shipping, the buyer is asked whether it arrived. */
export const ARRIVAL_CHECK_DAYS = 7;

/** A seller who hasn't answered a problem in this long: resell.store steps in. */
export const DISPUTE_REPLY_DAYS = 3;

/** After delivery the buyer has this long to report a problem, then the money is released. */
export const CHECK_DAYS = 3;

/**
 * Without a tracking service there may never be a "delivered" event, so a
 * shipped order is treated as delivered after this many days.
 */
export const ASSUME_DELIVERED_DAYS = 10;

/** PayPal releases held money by itself after 28 days. Release before then, with a margin. */
export const PAYPAL_HOLD_LIMIT_DAYS = 28;

/**
 * Demo knob: shrink every wait above to this many minutes per "day" so the
 * auto-release can be shown live. Unset in production.
 */
export const DAY_MS = process.env.PAYOUT_DEMO_MINUTES_PER_DAY
  ? Number(process.env.PAYOUT_DEMO_MINUTES_PER_DAY) * 60 * 1000
  : DAY;

const after = (from: Date, days: number) => new Date(from.getTime() + days * DAY_MS);

/** When a paid order should have shipped by. */
export function shipBy(order: { createdAt: Date }) {
  return after(order.createdAt, SHIP_BY_DAYS);
}

/** When an order that never shipped is cancelled and refunded. */
export function autoCancelAt(order: { createdAt: Date }) {
  return after(order.createdAt, AUTO_CANCEL_DAYS);
}

/** Past the ship-by date and still not shipped: the buyer may call it off. */
export function buyerCanCancel(order: { status: string; createdAt: Date }, now = new Date()) {
  return order.status === "paid" && shipBy(order) <= now;
}

/** When to ask the buyer whether a shipped order arrived. */
export function arrivalCheckAt(order: { shippedAt: Date | null }) {
  return order.shippedAt ? after(order.shippedAt, ARRIVAL_CHECK_DAYS) : null;
}

/** When an unanswered problem goes to resell.store. */
export function disputeEscalatesAt(d: { createdAt: Date }) {
  return after(d.createdAt, DISPUTE_REPLY_DAYS);
}

/** When a paid order's money goes to the seller, if the buyer doesn't release it first. */
export function releaseAt(order: { createdAt: Date; shippedAt: Date | null; deliveredAt: Date | null }) {
  const delivered =
    order.deliveredAt ?? (order.shippedAt ? new Date(order.shippedAt.getTime() + ASSUME_DELIVERED_DAYS * DAY_MS) : null);
  if (!delivered) return null;
  const release = delivered.getTime() + CHECK_DAYS * DAY_MS;
  // Never later than PayPal's own release, less a day for the sweep to run
  const cap = order.createdAt.getTime() + (PAYPAL_HOLD_LIMIT_DAYS - 1) * DAY_MS;
  return new Date(Math.min(release, cap));
}
