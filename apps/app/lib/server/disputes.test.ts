import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, dispute, disputeEvent, eq, listing, orders } from "@repo/db";
import { resetDb } from "../../test/db";
import { createOrder, createSale, createUser, daysAgo } from "../../test/factories";
import { clearEmails } from "../../test/mail";

/*
 * Cancelling, refunds and problems (disputes.ts) against the test database.
 * PayPal is mocked: real-PayPal orders (paypal: true) check what would be
 * asked of PayPal; test ("mock") orders are refunded on paper.
 */

vi.mock("./paypal", async (orig) => ({
  ...(await orig<typeof import("./paypal")>()),
  releaseToSeller: vi.fn(async () => ({ payoutRef: "PAYOUT-1", status: "SUCCESS" })),
  refundCapture: vi.fn(async () => ({ id: "REFUND-1", status: "COMPLETED", amountCents: null })),
}));
vi.mock("./api/webhooks", async (orig) => ({
  ...(await orig<typeof import("./api/webhooks")>()),
  emitOrderEvent: vi.fn(),
  emitOfferEvent: vi.fn(),
}));

const paypal = await import("./paypal");
const webhooks = await import("./api/webhooks");
const d = await import("./disputes");

type Sale = Awaited<ReturnType<typeof createSale>>;

beforeEach(async () => {
  await resetDb();
  clearEmails();
  vi.clearAllMocks();
});

const orderRow = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;
const listingRow = async (id: string) => (await db.select().from(listing).where(eq(listing.id, id)))[0]!;
const disputeRow = async (id: string) => (await db.select().from(dispute).where(eq(dispute.id, id)))[0]!;
const eventsOf = (id: string) => db.select().from(disputeEvent).where(eq(disputeEvent.disputeId, id)).orderBy(disputeEvent.createdAt);

/** An order that shipped two days ago. */
const shippedOrder = (sale: Sale, overrides: Parameters<typeof createOrder>[1] = {}) =>
  createOrder(sale, { createdAt: daysAgo(4), status: "shipped", shippedAt: daysAgo(2), ...overrides });

/** A shipped order with a problem the buyer just reported. */
async function withProblem(overrides: Parameters<typeof createOrder>[1] = {}) {
  const sale = await createSale();
  const order = await shippedOrder(sale, overrides);
  const problem = await d.openDispute({ buyerId: sale.buyer.id, orderId: order.id, reason: "damaged", details: "Cracked lid" });
  vi.clearAllMocks();
  return { sale, order, problem };
}

describe("refundableCents", () => {
  it("is what's left after earlier refunds, never below zero", () => {
    expect(d.refundableCents({ totalCents: 10_900, refundedCents: 0 })).toBe(10_900);
    expect(d.refundableCents({ totalCents: 10_900, refundedCents: 2_000 })).toBe(8_900);
    expect(d.refundableCents({ totalCents: 10_900, refundedCents: 20_000 })).toBe(0);
  });
});

describe("cancelOrder", () => {
  it("lets the seller cancel a test order any time before shipping, refunds everything and puts it back on sale", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);

    const out = await d.cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "seller" });

    expect(out.status).toBe("cancelled");
    expect(out.refundedCents).toBe(10_900);
    expect(out.refundRef).toMatch(/^mock_refund_/);
    expect(out.refundedAt).toBeInstanceOf(Date);
    expect(out.cancelledAt).toBeInstanceOf(Date);
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    const l = await listingRow(sale.listing.id);
    expect(l.status).toBe("live");
    expect(l.soldAt).toBeNull();
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");
  });

  it("refunds a real PayPal order in full through PayPal", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });

    const out = await d.cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "seller" });

    expect(paypal.refundCapture).toHaveBeenCalledTimes(1);
    expect(paypal.refundCapture).toHaveBeenCalledWith({
      captureId: order.paymentRef,
      sellerMerchantId: "MERCHANT1",
      reason: expect.stringContaining("couldn't send it"),
      amountCents: null,
      requestId: `cancel-${order.id}`,
    });
    expect(out.refundRef).toBe("REFUND-1");
    expect(out.refundedCents).toBe(10_900);
  });

  it("doesn't let the buyer cancel while the seller still has time to ship", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(1) });
    await expect(d.cancelOrder({ orderId: order.id, actorId: sale.buyer.id, by: "buyer" })).rejects.toThrow(/still has time/);
    expect((await orderRow(order.id)).status).toBe("paid");
  });

  it("lets the buyer cancel once the ship-by date passes, and the listing goes back to drafts", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(3.5), paypal: true });

    const out = await d.cancelOrder({ orderId: order.id, actorId: sale.buyer.id, by: "buyer" });

    expect(out.status).toBe("cancelled");
    expect(paypal.refundCapture).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining("wasn't shipped in time"), amountCents: null, requestId: `cancel-${order.id}` }),
    );
    expect((await listingRow(sale.listing.id)).status).toBe("draft");
  });

  it("puts a lapsed order's listing back in drafts when the sweep calls it off", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(8) });
    const out = await d.cancelOrder({ orderId: order.id, actorId: null, by: "system" });
    expect(out.status).toBe("cancelled");
    expect((await listingRow(sale.listing.id)).status).toBe("draft");
  });

  it("refuses people who aren't on that side of the order", async () => {
    const sale = await createSale();
    const stranger = await createUser();
    const order = await createOrder(sale, { createdAt: daysAgo(5) });
    await expect(d.cancelOrder({ orderId: order.id, actorId: sale.buyer.id, by: "seller" })).rejects.toThrow(/isn't yours/);
    await expect(d.cancelOrder({ orderId: order.id, actorId: stranger.id, by: "buyer" })).rejects.toThrow(/isn't yours/);
    await expect(d.cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "buyer" })).rejects.toThrow(/isn't yours/);
    expect((await orderRow(order.id)).status).toBe("paid");
  });

  it("refuses an order that already shipped or wrapped up", async () => {
    const sale = await createSale();
    const shipped = await shippedOrder(sale);
    await expect(d.cancelOrder({ orderId: shipped.id, actorId: sale.seller.id, by: "seller" })).rejects.toThrow(/already shipped/);

    const sale2 = await createSale();
    const done = await createOrder(sale2, { status: "completed" });
    await expect(d.cancelOrder({ orderId: done.id, actorId: sale2.seller.id, by: "seller" })).rejects.toThrow(/wrapped up/);
    await expect(d.cancelOrder({ orderId: "nope", actorId: sale2.seller.id, by: "seller" })).rejects.toThrow(/isn't here/);
  });

  it("leaves the order as it was when PayPal can't refund", async () => {
    vi.mocked(paypal.refundCapture).mockRejectedValueOnce(new paypal.PayPalError("boom", 500, "INTERNAL"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });

    await expect(d.cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "seller" })).rejects.toThrow(
      /PayPal couldn't make the refund/,
    );
    const row = await orderRow(order.id);
    expect(row.status).toBe("paid");
    expect(row.refundedCents).toBe(0);
    expect((await listingRow(sale.listing.id)).status).toBe("sold");
    expect(webhooks.emitOrderEvent).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("refuses a PayPal order with no capture to refund", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paymentProvider: "paypal", paymentRef: null });
    await expect(d.cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "seller" })).rejects.toThrow(/no PayPal payment/);
  });

  it("settles a live problem on the order as refunded", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(8) });
    const [live] = await db.insert(dispute).values({ orderId: order.id, reason: "not_arrived", source: "paypal" }).returning();

    await d.cancelOrder({ orderId: order.id, actorId: null, by: "system" });

    const row = await disputeRow(live!.id);
    expect(row.status).toBe("refunded");
    expect(row.resolvedAt).toBeInstanceOf(Date);
    const events = await eventsOf(live!.id);
    expect(events.map((e) => [e.side, e.kind])).toEqual([["platform", "refunded"]]);
  });
});

describe("openDispute", () => {
  it("opens a problem on a shipped order with the buyer's words", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale);

    const problem = await d.openDispute({ buyerId: sale.buyer.id, orderId: order.id, reason: "damaged", details: "  Cracked lid " });

    expect(problem.status).toBe("open");
    expect(problem.source).toBe("buyer");
    expect(problem.details).toBe("Cracked lid");
    const events = await eventsOf(problem.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ side: "buyer", kind: "opened", authorId: sale.buyer.id, body: "Cracked lid" });
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.problem");
  });

  it("works on a delivered order too", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { status: "delivered", deliveredAt: daysAgo(1) });
    const problem = await d.openDispute({ buyerId: sale.buyer.id, orderId: order.id, reason: "not_as_described" });
    expect(problem.details).toBeNull();
  });

  it("refuses orders that haven't shipped or are already settled", async () => {
    const sale = await createSale();
    const paid = await createOrder(sale);
    await expect(d.openDispute({ buyerId: sale.buyer.id, orderId: paid.id, reason: "other" })).rejects.toThrow(/hasn't shipped/);

    const s2 = await createSale();
    const done = await createOrder(s2, { status: "completed" });
    await expect(d.openDispute({ buyerId: s2.buyer.id, orderId: done.id, reason: "other" })).rejects.toThrow(/wrapped up/);

    const s3 = await createSale();
    const refunded = await createOrder(s3, { status: "refunded" });
    await expect(d.openDispute({ buyerId: s3.buyer.id, orderId: refunded.id, reason: "other" })).rejects.toThrow(/already settled/);
  });

  it("only lets the buyer report one", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale);
    await expect(d.openDispute({ buyerId: sale.seller.id, orderId: order.id, reason: "other" })).rejects.toThrow(/isn't yours/);
  });

  it("allows one live problem per order, and a new one after the last is closed", async () => {
    const { sale, order, problem } = await withProblem();
    await expect(d.openDispute({ buyerId: sale.buyer.id, orderId: order.id, reason: "other" })).rejects.toThrow(/already reported/);

    await d.closeDispute({ buyerId: sale.buyer.id, disputeId: problem.id });
    const again = await d.openDispute({ buyerId: sale.buyer.id, orderId: order.id, reason: "other" });
    expect(again.id).not.toBe(problem.id);
  });
});

describe("replyToDispute", () => {
  it("records each side's message", async () => {
    const { sale, problem } = await withProblem();
    await d.replyToDispute({ userId: sale.seller.id, disputeId: problem.id, body: " Sorry! Photo? " });
    await d.replyToDispute({ userId: sale.buyer.id, disputeId: problem.id, body: "Here you go" });

    const events = await eventsOf(problem.id);
    expect(events.map((e) => [e.side, e.kind, e.body])).toEqual([
      ["buyer", "opened", "Cracked lid"],
      ["seller", "message", "Sorry! Photo?"],
      ["buyer", "message", "Here you go"],
    ]);
  });

  it("refuses an empty message, a stranger and a settled problem", async () => {
    const { sale, problem } = await withProblem();
    const stranger = await createUser();
    await expect(d.replyToDispute({ userId: sale.buyer.id, disputeId: problem.id, body: "   " })).rejects.toThrow(/Write a message/);
    await expect(d.replyToDispute({ userId: stranger.id, disputeId: problem.id, body: "hi" })).rejects.toThrow(/isn't yours/);
    await d.closeDispute({ buyerId: sale.buyer.id, disputeId: problem.id });
    await expect(d.replyToDispute({ userId: sale.seller.id, disputeId: problem.id, body: "hi" })).rejects.toThrow(/already been settled/);
    await expect(d.replyToDispute({ userId: sale.seller.id, disputeId: "missing", body: "hi" })).rejects.toThrow(/isn't here/);
  });
});

describe("offerPartialRefund", () => {
  it("stores the seller's offer and adds it to the timeline", async () => {
    const { sale, problem } = await withProblem();
    const out = await d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 2_500, body: "For the lid" });
    expect(out.offerCents).toBe(2_500);
    const last = (await eventsOf(problem.id)).at(-1)!;
    expect(last).toMatchObject({ side: "seller", kind: "refund_offered", amountCents: 2_500, body: "For the lid" });
  });

  it("refuses the buyer, nothing, and all of it", async () => {
    const { sale, problem } = await withProblem();
    await expect(d.offerPartialRefund({ sellerId: sale.buyer.id, disputeId: problem.id, amountCents: 100 })).rejects.toThrow(/isn't yours/);
    await expect(d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 0 })).rejects.toThrow(/at least/);
    await expect(d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 10_900 })).rejects.toThrow(
      /Refund in full/,
    );
    expect((await disputeRow(problem.id)).offerCents).toBeNull();
  });
});

describe("answerRefundOffer", () => {
  it("clears the offer and keeps the problem open when the buyer turns it down", async () => {
    const { sale, problem, order } = await withProblem({ paypal: true });
    await d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 2_500 });

    const out = await d.answerRefundOffer({ buyerId: sale.buyer.id, disputeId: problem.id, accept: false });

    expect(out.status).toBe("open");
    expect(out.offerCents).toBeNull();
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "buyer", kind: "offer_declined", amountCents: 2_500 });
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect((await orderRow(order.id)).status).toBe("shipped");
  });

  it("refunds part through PayPal, completes the order and releases the rest when the buyer accepts", async () => {
    const { sale, problem, order } = await withProblem({ paypal: true });
    await d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 2_500 });

    const out = await d.answerRefundOffer({ buyerId: sale.buyer.id, disputeId: problem.id, accept: true });

    expect(out.status).toBe("refunded");
    expect(out.resolvedAt).toBeInstanceOf(Date);
    expect(paypal.refundCapture).toHaveBeenCalledWith({
      captureId: order.paymentRef,
      sellerMerchantId: "MERCHANT1",
      reason: expect.any(String),
      amountCents: 2_500,
      requestId: `partial-${problem.id}`,
    });
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    const row = await orderRow(order.id);
    expect(row).toMatchObject({ status: "completed", refundedCents: 2_500, refundRef: "REFUND-1", payoutRef: "PAYOUT-1" });
    expect(row.deliveredAt).toBeInstanceOf(Date);
    expect(row.completedAt).toBeInstanceOf(Date);
    expect(row.releasedAt).toBeInstanceOf(Date);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "buyer", kind: "refunded", amountCents: 2_500 });
  });

  it("refunds a test order on paper and completes it without a release", async () => {
    const { sale, problem, order } = await withProblem();
    await d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 1_000 });
    await d.answerRefundOffer({ buyerId: sale.buyer.id, disputeId: problem.id, accept: true });

    const row = await orderRow(order.id);
    expect(row.status).toBe("completed");
    expect(row.refundedCents).toBe(1_000);
    expect(row.refundRef).toMatch(/^mock_refund_/);
    expect(row.releasedAt).toBeNull();
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
  });

  it("refuses when there's no offer, or when the seller answers", async () => {
    const { sale, problem } = await withProblem();
    await expect(d.answerRefundOffer({ buyerId: sale.buyer.id, disputeId: problem.id, accept: true })).rejects.toThrow(/no offer/);
    await d.offerPartialRefund({ sellerId: sale.seller.id, disputeId: problem.id, amountCents: 1_000 });
    await expect(d.answerRefundOffer({ buyerId: sale.seller.id, disputeId: problem.id, accept: true })).rejects.toThrow(/isn't yours/);
  });
});

describe("refundInFull", () => {
  it("lets the seller give everything back through PayPal", async () => {
    const { sale, problem, order } = await withProblem({ paypal: true });

    const out = await d.refundInFull({ userId: sale.seller.id, disputeId: problem.id, body: "Sorry about that" });

    expect(paypal.refundCapture).toHaveBeenCalledWith({
      captureId: order.paymentRef,
      sellerMerchantId: "MERCHANT1",
      reason: expect.any(String),
      amountCents: null,
      requestId: `refund-${problem.id}`,
    });
    expect(out).toMatchObject({ status: "refunded", refundedCents: 10_900, refundRef: "REFUND-1" });
    expect((await disputeRow(problem.id)).status).toBe("refunded");
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({
      side: "seller",
      kind: "refunded",
      amountCents: 10_900,
      body: "Sorry about that",
    });
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");
  });

  it("refunds only what's left when part was already given back", async () => {
    const { sale, problem, order } = await withProblem({ paypal: true });
    await db.update(orders).set({ refundedCents: 1_000 }).where(eq(orders.id, order.id));

    const out = await d.refundInFull({ userId: sale.seller.id, disputeId: problem.id });

    expect(paypal.refundCapture).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 9_900, requestId: `refund-${problem.id}` }));
    expect(out.refundedCents).toBe(10_900);
    expect((await eventsOf(problem.id)).at(-1)!.amountCents).toBe(9_900);
  });

  it("refunds a test order on paper", async () => {
    const { sale, problem, order } = await withProblem();
    const out = await d.refundInFull({ userId: sale.seller.id, disputeId: problem.id });
    expect(out.status).toBe("refunded");
    expect(out.refundRef).toMatch(/^mock_refund_/);
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect(order.id).toBe(out.id);
  });

  it("doesn't let the buyer refund themselves", async () => {
    const { sale, problem } = await withProblem();
    await expect(d.refundInFull({ userId: sale.buyer.id, disputeId: problem.id })).rejects.toThrow(/Only the seller/);
    expect((await disputeRow(problem.id)).status).toBe("open");
  });

  it("lets resell.store refund (no user)", async () => {
    const { problem } = await withProblem();
    await d.refundInFull({ userId: null, disputeId: problem.id });
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "platform", kind: "refunded", authorId: null });
  });

  it("refuses once the money went to the seller", async () => {
    const { sale, problem } = await withProblem({ paypal: true, releasedAt: new Date() });
    await expect(d.refundInFull({ userId: sale.seller.id, disputeId: problem.id })).rejects.toThrow(/already went to the seller/);
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });
});

describe("closeDispute", () => {
  it("lets the buyer say it's sorted, and nobody else", async () => {
    const { sale, problem, order } = await withProblem();
    await expect(d.closeDispute({ buyerId: sale.seller.id, disputeId: problem.id })).rejects.toThrow(/isn't yours/);

    const out = await d.closeDispute({ buyerId: sale.buyer.id, disputeId: problem.id, body: "Glued it" });
    expect(out.status).toBe("closed");
    expect(out.resolvedAt).toBeInstanceOf(Date);
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "buyer", kind: "closed", body: "Glued it" });
    expect((await orderRow(order.id)).status).toBe("shipped");
  });
});

describe("escalateDispute", () => {
  it("lets either side escalate once", async () => {
    const { sale, problem } = await withProblem();
    const out = await d.escalateDispute({ userId: sale.seller.id, disputeId: problem.id, body: "Help" });
    expect(out.status).toBe("escalated");
    expect(out.escalatedAt).toBeInstanceOf(Date);
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "seller", kind: "escalated", body: "Help" });

    await expect(d.escalateDispute({ userId: sale.buyer.id, disputeId: problem.id })).rejects.toThrow(/already looking/);
  });

  it("records the sweep stepping in as resell.store", async () => {
    const { problem } = await withProblem();
    await d.escalateDispute({ userId: null, disputeId: problem.id });
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "platform", kind: "escalated", authorId: null });
  });
});

describe("resolveDispute", () => {
  it("refunds the buyer in full when we decide for them", async () => {
    const { problem, order } = await withProblem({ paypal: true });
    await d.escalateDispute({ userId: null, disputeId: problem.id });

    const out = await d.resolveDispute({ disputeId: problem.id, outcome: "refund", note: "Seller didn't show proof" });

    expect(out.status).toBe("refunded");
    expect(paypal.refundCapture).toHaveBeenCalledWith(expect.objectContaining({ amountCents: null, requestId: `refund-${problem.id}` }));
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "platform", kind: "refunded", body: "Seller didn't show proof" });
    expect((await orderRow(order.id)).status).toBe("refunded");
  });

  it("completes the order and releases the money when we decide for the seller", async () => {
    const { problem, order } = await withProblem({ paypal: true });
    await d.escalateDispute({ userId: null, disputeId: problem.id });

    const out = await d.resolveDispute({ disputeId: problem.id, outcome: "release" });

    expect(out).toMatchObject({ status: "completed", payoutRef: "PAYOUT-1" });
    expect(out.releasedAt).toBeInstanceOf(Date);
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect((await disputeRow(problem.id)).status).toBe("closed");
    expect((await eventsOf(problem.id)).at(-1)).toMatchObject({ side: "platform", kind: "closed", body: "Decided for the seller." });
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.completed");
  });

  it("completes a test order without a release", async () => {
    const { problem, order } = await withProblem();
    const out = await d.resolveDispute({ disputeId: problem.id, outcome: "release", note: "Proof of delivery" });
    expect(out.status).toBe("completed");
    expect(out.completedAt).toBeInstanceOf(Date);
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
    expect((await orderRow(order.id)).deliveredAt).toBeInstanceOf(Date);
  });

  it("won't release money the buyer already got back through PayPal", async () => {
    const { problem, order } = await withProblem({ paypal: true });
    // A chargeback recorded by the webhook leaves the problem live
    await db.update(orders).set({ status: "refunded", refundedCents: 10_900 }).where(eq(orders.id, order.id));

    await expect(d.resolveDispute({ disputeId: problem.id, outcome: "release" })).rejects.toThrow(/can't be released/);
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
    expect((await orderRow(order.id)).status).toBe("refunded");
    expect((await disputeRow(problem.id)).status).toBe("open");
  });

  it("won't complete an order that never shipped", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });
    const [live] = await db.insert(dispute).values({ orderId: order.id, reason: "not_arrived", source: "paypal" }).returning();

    await expect(d.resolveDispute({ disputeId: live!.id, outcome: "release" })).rejects.toThrow(/can't be released/);
    expect((await orderRow(order.id)).status).toBe("paid");
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
  });

  it("releases an order completed before a PayPal case was opened on it", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed", completedAt: daysAgo(1), shippedAt: daysAgo(5) });
    const [live] = await db.insert(dispute).values({ orderId: order.id, reason: "other", source: "paypal" }).returning();

    const out = await d.resolveDispute({ disputeId: live!.id, outcome: "release" });
    expect(out.status).toBe("completed");
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
  });

  it("refuses a problem that's already settled", async () => {
    const { sale, problem } = await withProblem();
    await d.closeDispute({ buyerId: sale.buyer.id, disputeId: problem.id });
    await expect(d.resolveDispute({ disputeId: problem.id, outcome: "release" })).rejects.toThrow(/already been settled/);
  });
});

describe("syncPayPalDispute", () => {
  const resource = (captureId: string | undefined, extra: Partial<import("./disputes").PayPalDisputeResource> = {}) => ({
    dispute_id: "PP-D-1",
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    status: "OPEN",
    disputed_transactions: [{}, { seller_transaction_id: captureId }],
    messages: [{ content: "Never came" }],
    ...extra,
  });

  it("ignores disputes that aren't about one of our PayPal orders", async () => {
    const sale = await createSale();
    const mock = await shippedOrder(sale, { paymentRef: "CAP-MOCK" });
    expect(await d.syncPayPalDispute(resource("CAP-UNKNOWN"))).toBeNull();
    expect(await d.syncPayPalDispute(resource(mock.paymentRef!))).toBeNull();
    expect(await d.syncPayPalDispute({ dispute_id: "PP-D-2" })).toBeNull();
    expect(await db.select().from(dispute)).toHaveLength(0);
  });

  it("creates a PayPal problem on the order the first time", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { paypal: true });

    const out = (await d.syncPayPalDispute(resource(order.paymentRef!)))!;

    expect(out).toMatchObject({
      orderId: order.id,
      source: "paypal",
      reason: "not_arrived",
      details: "Never came",
      status: "open",
      providerDisputeId: "PP-D-1",
      resolvedAt: null,
      escalatedAt: null,
    });
    expect((await eventsOf(out.id)).map((e) => [e.side, e.kind, e.body])).toEqual([["buyer", "opened", "Opened in PayPal."]]);
  });

  it("maps reasons, with anything unknown as other", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { paypal: true });
    const out = await d.syncPayPalDispute(resource(order.paymentRef!, { reason: "UNAUTHORISED", messages: undefined }));
    expect(out).toMatchObject({ reason: "other", details: null });

    const s2 = await createSale();
    const o2 = await shippedOrder(s2, { paypal: true });
    const out2 = await d.syncPayPalDispute(
      resource(o2.paymentRef!, { dispute_id: "PP-D-9", reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED" }),
    );
    expect(out2!.reason).toBe("not_as_described");
  });

  it("follows PayPal's review as escalated, once", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { paypal: true });
    const first = (await d.syncPayPalDispute(resource(order.paymentRef!)))!;

    const out = (await d.syncPayPalDispute(resource(order.paymentRef!, { status: "UNDER_REVIEW" })))!;
    expect(out.id).toBe(first.id);
    expect(out.status).toBe("escalated");
    expect(out.escalatedAt).toBeInstanceOf(Date);
    const again = (await d.syncPayPalDispute(resource(order.paymentRef!, { status: "UNDER_REVIEW" })))!;
    expect(again.escalatedAt).toEqual(out.escalatedAt);

    expect((await eventsOf(first.id)).map((e) => [e.side, e.kind, e.body])).toEqual([
      ["buyer", "opened", "Opened in PayPal."],
      ["platform", "escalated", "PayPal: under review."],
    ]);
  });

  it("takes over a problem the buyer already reported here", async () => {
    const { order, problem } = await withProblem({ paypal: true });

    const out = (await d.syncPayPalDispute(resource(order.paymentRef!)))!;

    expect(out.id).toBe(problem.id);
    expect(out.providerDisputeId).toBe("PP-D-1");
    expect(out.status).toBe("open");
    expect(await db.select().from(dispute)).toHaveLength(1);
  });

  it("marks the order refunded when PayPal decides for the buyer", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { paypal: true });
    const first = (await d.syncPayPalDispute(resource(order.paymentRef!)))!;

    const out = (await d.syncPayPalDispute(
      resource(order.paymentRef!, { status: "RESOLVED", dispute_outcome: { outcome_code: "RESOLVED_BUYER_FAVOUR" } }),
    ))!;

    expect(out.status).toBe("refunded");
    expect(out.resolvedAt).toBeInstanceOf(Date);
    const row = await orderRow(order.id);
    expect(row.status).toBe("refunded");
    expect(row.refundedCents).toBe(10_900);
    expect(row.refundedAt).toBeInstanceOf(Date);
    expect((await eventsOf(first.id)).at(-1)).toMatchObject({ side: "platform", kind: "refunded" });
    // PayPal moved the money itself; we don't refund again
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it("closes the problem and leaves the order alone when PayPal decides for the seller", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale, { paypal: true });
    await d.syncPayPalDispute(resource(order.paymentRef!));

    const out = (await d.syncPayPalDispute(
      resource(order.paymentRef!, { status: "RESOLVED", dispute_outcome: { outcome_code: "RESOLVED_SELLER_FAVOUR" } }),
    ))!;

    expect(out.status).toBe("closed");
    const row = await orderRow(order.id);
    expect(row.status).toBe("shipped");
    expect(row.refundedCents).toBe(0);
  });
});

describe("reading", () => {
  it("ordersWithLiveDispute finds only open or escalated problems", async () => {
    const a = await withProblem();
    const b = await withProblem();
    await d.escalateDispute({ userId: null, disputeId: b.problem.id });
    const c = await withProblem();
    await d.closeDispute({ buyerId: c.sale.buyer.id, disputeId: c.problem.id });

    const live = await d.ordersWithLiveDispute([a.order.id, b.order.id, c.order.id]);
    expect([...live].sort()).toEqual([a.order.id, b.order.id].sort());
    expect((await d.ordersWithLiveDispute([])).size).toBe(0);
  });

  it("latestDisputes picks the newest problem per order", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale);
    await db.insert(dispute).values({ orderId: order.id, reason: "damaged", status: "closed", createdAt: daysAgo(2) });
    const [newer] = await db.insert(dispute).values({ orderId: order.id, reason: "other", createdAt: daysAgo(1) }).returning();

    const latest = await d.latestDisputes([order.id, "other-order"]);
    expect(latest.get(order.id)!.id).toBe(newer!.id);
    expect(latest.has("other-order")).toBe(false);
    expect((await d.latestDisputes([])).size).toBe(0);
  });

  it("orderCase shows the buyer and the seller their side, and strangers nothing", async () => {
    const { sale, order, problem } = await withProblem();
    await d.replyToDispute({ userId: sale.seller.id, disputeId: problem.id, body: "Oh no" });
    const stranger = await createUser();

    const buyerView = (await d.orderCase(order.id, sale.buyer.id))!;
    expect(buyerView.side).toBe("buyer");
    expect(buyerView.dispute!.id).toBe(problem.id);
    expect(buyerView.events.map((e) => e.kind)).toEqual(["opened", "message"]);
    expect(buyerView.listing.title).toBe(sale.listing.title);
    expect(buyerView.buyer.id).toBe(sale.buyer.id);

    expect((await d.orderCase(order.id, sale.seller.id))!.side).toBe("seller");
    expect(await d.orderCase(order.id, stranger.id)).toBeNull();
    expect(await d.orderCase("missing", sale.buyer.id)).toBeNull();
  });

  it("orderCase has no problem or events for an order without one", async () => {
    const sale = await createSale();
    const order = await shippedOrder(sale);
    const view = (await d.orderCase(order.id, sale.buyer.id))!;
    expect(view.dispute).toBeNull();
    expect(view.events).toEqual([]);
  });
});
