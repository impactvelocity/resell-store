import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, dispute, eq, listing, orders, paypalAccount, paypalEvent } from "@repo/db";
import { resetDb } from "../../test/db";
import { createOrder, createSale, createUser, daysAgo } from "../../test/factories";
import { clearEmails, emailsTo, sentEmails } from "../../test/mail";

/*
 * PayPal webhook handling (paypal-webhook.ts): events are stored once and a
 * redelivery is a no-op, a failed one is retried, and each event type moves
 * the order (or seller account) the right way. PayPal itself is mocked.
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
vi.mock("./paypal-sellers", async (orig) => ({
  ...(await orig<typeof import("./paypal-sellers")>()),
  syncPayPalAccount: vi.fn(async () => null),
}));

const webhooks = await import("./api/webhooks");
const sellers = await import("./paypal-sellers");
const paypal = await import("./paypal");
const { cancelOrder } = await import("./disputes");
const hook = await import("./paypal-webhook");

type Sale = Awaited<ReturnType<typeof createSale>>;

beforeEach(async () => {
  await resetDb();
  clearEmails();
  vi.clearAllMocks();
});

let seq = 0;
const event = (event_type: string, resource: Record<string, unknown>): import("./paypal-webhook").PayPalEvent => ({
  id: `WH-${++seq}-${crypto.randomUUID().slice(0, 6)}`,
  event_type,
  resource,
});
const orderRow = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;
const refundLinks = (captureId: string) => [
  { rel: "self", href: `https://api.sandbox.paypal.com/v2/payments/refunds/R1` },
  { rel: "up", href: `https://api.sandbox.paypal.com/v2/payments/captures/${captureId}` },
];
const shipped = (sale: Sale, extra: Parameters<typeof createOrder>[1] = {}) =>
  createOrder(sale, { paypal: true, createdAt: daysAgo(4), status: "shipped", shippedAt: daysAgo(2), ...extra });

describe("recording events", () => {
  it("stores a new event and says it needs handling", async () => {
    const e = event("PAYMENT.CAPTURE.COMPLETED", { id: "CAP-1" });
    expect(await hook.recordPayPalEvent(e)).toBe(true);
    const [row] = await db.select().from(paypalEvent).where(eq(paypalEvent.id, e.id));
    expect(row).toMatchObject({ type: "PAYMENT.CAPTURE.COMPLETED", resourceId: "CAP-1", processedAt: null });
    expect(row!.payload).toEqual(e);
  });

  it("treats a redelivery of a handled event as a duplicate", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });
    const e = event("PAYMENT.CAPTURE.COMPLETED", { id: order.paymentRef });

    expect(await hook.processPayPalEvent(e)).toBe("capture completed");
    expect(await hook.processPayPalEvent(e)).toBe("duplicate");
    expect(await hook.recordPayPalEvent(e)).toBe(false);
    const rows = await db.select().from(paypalEvent);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.processedAt).toBeInstanceOf(Date);
  });

  it("stores the error when handling fails, and handles it again next time", async () => {
    const seller = await createUser();
    vi.mocked(sellers.syncPayPalAccount).mockRejectedValueOnce(new Error("PayPal timed out"));
    const e = event("MERCHANT.ONBOARDING.COMPLETED", { tracking_id: seller.id });

    await expect(hook.processPayPalEvent(e)).rejects.toThrow("PayPal timed out");
    let [row] = await db.select().from(paypalEvent).where(eq(paypalEvent.id, e.id));
    expect(row).toMatchObject({ error: "PayPal timed out", processedAt: null });

    expect(await hook.processPayPalEvent(e)).toBe("seller synced");
    [row] = await db.select().from(paypalEvent).where(eq(paypalEvent.id, e.id));
    expect(row!.error).toBeNull();
    expect(row!.processedAt).toBeInstanceOf(Date);
  });

  it("ignores event types it doesn't handle", async () => {
    expect(await hook.processPayPalEvent(event("BILLING.PLAN.CREATED", {}))).toBe("ignored");
    expect(await hook.processPayPalEvent({ id: "WH-bare", event_type: "PAYMENT.CAPTURE.COMPLETED" })).toBe("not ours");
  });
});

describe("captureIdFromRefund", () => {
  it("reads the capture id from the refund's up link", () => {
    expect(hook.captureIdFromRefund({ links: refundLinks("CAP-42") })).toBe("CAP-42");
    expect(hook.captureIdFromRefund({ links: [{ rel: "up", href: "https://x/v2/payments/captures/CAP-7?x=1" }] })).toBe("CAP-7");
  });

  it("is null without one", () => {
    expect(hook.captureIdFromRefund({})).toBeNull();
    expect(hook.captureIdFromRefund({ links: [{ rel: "self", href: "https://x/v2/payments/captures/CAP-1" }] })).toBeNull();
    expect(hook.captureIdFromRefund({ links: [{ rel: "up", href: "https://x/v2/checkout/orders/O-1" }] })).toBeNull();
  });
});

describe("PAYMENT.CAPTURE.COMPLETED", () => {
  it("only recognises captures for PayPal orders", async () => {
    const sale = await createSale();
    const mock = await createOrder(sale, { paymentRef: "CAP-MOCK" });
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.COMPLETED", { id: "CAP-NOPE" }))).toBe("not ours");
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.COMPLETED", { id: mock.paymentRef }))).toBe("not ours");
  });
});

describe("PAYMENT.CAPTURE.DENIED / DECLINED", () => {
  it("cancels a paid order and puts the listing back on sale", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.DENIED", { id: order.paymentRef }))).toBe("order cancelled");
    const row = await orderRow(order.id);
    expect(row.status).toBe("cancelled");
    expect(row.cancelledAt).toBeInstanceOf(Date);
    const [l] = await db.select().from(listing).where(eq(listing.id, sale.listing.id));
    expect(l!.status).toBe("live");
    expect(l!.soldAt).toBeNull();

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.DECLINED", { id: order.paymentRef }))).toBe("already moved on");
  });

  it("leaves an order that already shipped", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.DECLINED", { id: order.paymentRef }))).toBe("already moved on");
    expect((await orderRow(order.id)).status).toBe("shipped");
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.DECLINED", { id: "CAP-NOPE" }))).toBe("not ours");
  });
});

describe("PAYMENT.CAPTURE.REFUNDED", () => {
  it("records a full refund made in PayPal and tells both sides", async () => {
    const sale = await createSale();
    const order = await shipped(sale);

    const outcome = await hook.handlePayPalEvent(
      event("PAYMENT.CAPTURE.REFUNDED", {
        id: "RF-1",
        amount: { value: "109.00" },
        seller_payable_breakdown: { total_refunded_amount: { value: "109.00" } },
        links: refundLinks(order.paymentRef!),
      }),
    );

    expect(outcome).toBe("order refunded");
    const row = await orderRow(order.id);
    expect(row).toMatchObject({ status: "refunded", refundedCents: 10_900, refundRef: "RF-1" });
    expect(row.refundedAt).toBeInstanceOf(Date);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Refunded \$109: /)]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^Refunded \$109 to Jess/)]);
  });

  it("records a part refund without changing the order's state", async () => {
    const sale = await createSale();
    const order = await shipped(sale);

    const outcome = await hook.handlePayPalEvent(
      event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-2", amount: { value: "20.50" }, links: refundLinks(order.paymentRef!) }),
    );

    expect(outcome).toBe("part refund recorded");
    const row = await orderRow(order.id);
    expect(row).toMatchObject({ status: "shipped", refundedCents: 2_050, refundRef: "RF-2" });
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Refunded \$20\.50: /)]);
  });

  it("adds up part refunds and never records more than was paid", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    const links = refundLinks(order.paymentRef!);
    await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-a", amount: { value: "50.00" }, links }));
    expect((await orderRow(order.id)).refundedCents).toBe(5_000);

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-b", amount: { value: "80.00" }, links }))).toBe(
      "order refunded",
    );
    expect(await orderRow(order.id)).toMatchObject({ refundedCents: 10_900, status: "refunded" });
  });

  it("does nothing for a refund we already recorded ourselves", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });
    await cancelOrder({ orderId: order.id, actorId: sale.seller.id, by: "seller" });
    clearEmails();
    vi.clearAllMocks();

    const outcome = await hook.handlePayPalEvent(
      event("PAYMENT.CAPTURE.REFUNDED", {
        id: "REFUND-1",
        seller_payable_breakdown: { total_refunded_amount: { value: "109.00" } },
        links: refundLinks(order.paymentRef!),
      }),
    );

    expect(outcome).toBe("already recorded");
    expect((await orderRow(order.id)).status).toBe("cancelled");
    expect(sentEmails).toEqual([]);
    expect(webhooks.emitOrderEvent).not.toHaveBeenCalled();
  });

  it("keeps a cancelled order cancelled when a later refund completes it", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "cancelled", refundedCents: 0 });
    await hook.handlePayPalEvent(
      event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-3", amount: { value: "109.00" }, links: refundLinks(order.paymentRef!) }),
    );
    expect(await orderRow(order.id)).toMatchObject({ status: "cancelled", refundedCents: 10_900 });
  });

  it("ignores refunds for captures that aren't ours", async () => {
    expect(
      await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-x", amount: { value: "1.00" }, links: refundLinks("CAP-NOPE") })),
    ).toBe("not ours");
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REFUNDED", { id: "RF-y" }))).toBe("not ours");
  });
});

describe("PAYMENT.CAPTURE.REVERSED", () => {
  it("marks the order refunded in full, once", async () => {
    const sale = await createSale();
    const order = await shipped(sale);

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REVERSED", { id: order.paymentRef }))).toBe("order reversed");
    expect(await orderRow(order.id)).toMatchObject({ status: "refunded", refundedCents: 10_900 });
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REVERSED", { id: order.paymentRef }))).toBe("already recorded");
    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REVERSED", { id: "CAP-NOPE" }))).toBe("not ours");
  });
});

describe("CUSTOMER.DISPUTE.*", () => {
  const disputeResource = (captureId: string, extra: Record<string, unknown> = {}) => ({
    dispute_id: "PP-D-100",
    reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    status: "OPEN",
    disputed_transactions: [{ seller_transaction_id: captureId }],
    ...extra,
  });

  it("opens a problem and tells the seller when PayPal opens a case", async () => {
    const sale = await createSale();
    const order = await shipped(sale);

    expect(await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", disputeResource(order.paymentRef!)))).toBe("dispute open");

    const [d] = await db.select().from(dispute).where(eq(dispute.orderId, order.id));
    expect(d).toMatchObject({ source: "paypal", status: "open", providerDisputeId: "PP-D-100", reason: "not_as_described" });
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringContaining("reported a problem")]);
    expect(emailsTo(sale.buyer.email)).toEqual([]);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.problem");
  });

  it("tells both sides when PayPal starts reviewing it, and stays quiet when nothing changed", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", disputeResource(order.paymentRef!)));
    clearEmails();

    expect(await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.UPDATED", disputeResource(order.paymentRef!)))).toBe("dispute open");
    expect(sentEmails).toEqual([]);

    expect(
      await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.UPDATED", disputeResource(order.paymentRef!, { status: "UNDER_REVIEW" }))),
    ).toBe("dispute escalated");
    // PayPal is the one reviewing, so the copy says so and support isn't asked to decide
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^PayPal is reviewing/)]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^PayPal is reviewing/)]);
  });

  it("marks the order refunded and tells both sides when PayPal decides for the buyer", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", disputeResource(order.paymentRef!)));
    clearEmails();
    vi.clearAllMocks();

    const outcome = await hook.handlePayPalEvent(
      event(
        "CUSTOMER.DISPUTE.RESOLVED",
        disputeResource(order.paymentRef!, { status: "RESOLVED", dispute_outcome: { outcome_code: "RESOLVED_BUYER_FAVOUR" } }),
      ),
    );

    expect(outcome).toBe("dispute refunded");
    expect(await orderRow(order.id)).toMatchObject({ status: "refunded", refundedCents: 10_900 });
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.refunded");
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Refunded \$109: /)]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^Refunded \$109 to /)]);
  });

  it("closes the problem and tells the buyer when PayPal decides for the seller", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", disputeResource(order.paymentRef!)));
    clearEmails();

    const outcome = await hook.handlePayPalEvent(
      event(
        "CUSTOMER.DISPUTE.RESOLVED",
        disputeResource(order.paymentRef!, { status: "RESOLVED", dispute_outcome: { outcome_code: "RESOLVED_SELLER_FAVOUR" } }),
      ),
    );

    expect(outcome).toBe("dispute closed");
    expect((await orderRow(order.id)).status).toBe("shipped");
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Sorted: /)]);
  });

  it("skips disputes with no id or about someone else's payment", async () => {
    expect(await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", { status: "OPEN" }))).toBe("no dispute id");
    expect(await hook.handlePayPalEvent(event("CUSTOMER.DISPUTE.CREATED", disputeResource("CAP-NOPE")))).toBe("not ours");
    expect(sentEmails).toEqual([]);
  });
});

describe("MERCHANT.ONBOARDING.COMPLETED", () => {
  it("syncs the seller PayPal knows by our user id", async () => {
    const seller = await createUser();
    expect(await hook.handlePayPalEvent(event("MERCHANT.ONBOARDING.COMPLETED", { tracking_id: seller.id }))).toBe("seller synced");
    expect(sellers.syncPayPalAccount).toHaveBeenCalledWith(seller.id);
  });

  it("ignores unknown or missing tracking ids", async () => {
    expect(await hook.handlePayPalEvent(event("MERCHANT.ONBOARDING.COMPLETED", { tracking_id: "nobody" }))).toBe("not ours");
    expect(await hook.handlePayPalEvent(event("MERCHANT.ONBOARDING.COMPLETED", {}))).toBe("no tracking id");
    expect(sellers.syncPayPalAccount).not.toHaveBeenCalled();
  });
});

describe("MERCHANT.PARTNER-CONSENT.REVOKED", () => {
  it("stops a seller's own account taking payments, but leaves demo links alone", async () => {
    const own = await createUser();
    const demo = await createUser();
    await db.insert(paypalAccount).values([
      { userId: own.id, merchantId: "M-OWN", paymentsReceivable: true, permissions: ["partnerfee"] },
      { userId: demo.id, merchantId: "M-DEMO", paymentsReceivable: true, permissions: ["partnerfee"], demo: true },
    ]);

    expect(await hook.handlePayPalEvent(event("MERCHANT.PARTNER-CONSENT.REVOKED", { merchant_id: "M-OWN" }))).toBe("seller disconnected");
    expect(await hook.handlePayPalEvent(event("MERCHANT.PARTNER-CONSENT.REVOKED", { merchant_id: "M-DEMO" }))).toBe("not ours");
    expect(await hook.handlePayPalEvent(event("MERCHANT.PARTNER-CONSENT.REVOKED", {}))).toBe("no merchant id");

    const [a] = await db.select().from(paypalAccount).where(eq(paypalAccount.userId, own.id));
    expect(a).toMatchObject({ paymentsReceivable: false, permissions: [] });
    const [b] = await db.select().from(paypalAccount).where(eq(paypalAccount.userId, demo.id));
    expect(b).toMatchObject({ paymentsReceivable: true, permissions: ["partnerfee"] });
  });
});

describe("PAYMENT.REFERENCED-PAYOUT-ITEM.*", () => {
  it("records a completed payout once", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed" });

    const e = { reference_id: order.paymentRef, item_id: "ITEM-9" };
    expect(await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED", e))).toBe("payout recorded");
    const row = await orderRow(order.id);
    expect(row.releasedAt).toBeInstanceOf(Date);
    expect(row.payoutRef).toBe("ITEM-9");
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "payout.sent");

    expect(await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED", e))).toBe("already recorded");
    expect(webhooks.emitOrderEvent).toHaveBeenCalledTimes(1);
    expect(await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED", { reference_id: "CAP-NOPE" }))).toBe(
      "not ours",
    );
  });

  it("clears a failed payout so the sweep releases it again", async () => {
    const { dueReleases } = await import("./sweeps");
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed", releasedAt: new Date(), payoutRef: "ITEM-1" });
    expect(await dueReleases()).toEqual([]);

    expect(await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED", { reference_id: order.paymentRef }))).toBe(
      "payout failed, will retry",
    );
    expect(await orderRow(order.id)).toMatchObject({ releasedAt: null, payoutRef: "failed:1" });
    expect(await dueReleases()).toEqual([order.id]);
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
    expect(await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED", { reference_id: "CAP-NOPE" }))).toBe("not ours");
  });
});

describe("money back in PayPal while there's a problem here", () => {
  it("settles a live problem when PayPal refunds everything", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await db.insert(dispute).values({ orderId: order.id, reason: "damaged" });

    await hook.handlePayPalEvent(
      event("PAYMENT.CAPTURE.REFUNDED", {
        id: "R-ALL",
        links: refundLinks(order.paymentRef!),
        seller_payable_breakdown: { total_refunded_amount: { value: "109.00" } },
      }),
    );
    const [d] = await db.select().from(dispute).where(eq(dispute.orderId, order.id));
    expect(d!.status).toBe("refunded");
    expect((await orderRow(order.id)).status).toBe("refunded");
  });

  it("settles a live problem on a chargeback", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await db.insert(dispute).values({ orderId: order.id, reason: "not_arrived", status: "escalated" });

    expect(await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REVERSED", { id: order.paymentRef }))).toBe("order reversed");
    const [d] = await db.select().from(dispute).where(eq(dispute.orderId, order.id));
    expect(d!.status).toBe("refunded");
  });

  it("cancels an unshipped order refunded in PayPal and puts the listing back in drafts", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true });

    await hook.handlePayPalEvent(event("PAYMENT.CAPTURE.REVERSED", { id: order.paymentRef }));
    const row = await orderRow(order.id);
    expect(row.status).toBe("cancelled");
    expect(row.cancelledAt).toBeInstanceOf(Date);
    const [l] = await db.select().from(listing).where(eq(listing.id, sale.listing.id));
    expect(l!.status).toBe("draft");
  });
});

describe("a PayPal case about a problem reported here", () => {
  it("takes it over: PayPal's source, one dispute, and the seller hears it's with PayPal", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    const [mine] = await db.insert(dispute).values({ orderId: order.id, reason: "damaged" }).returning();

    await hook.handlePayPalEvent(
      event("CUSTOMER.DISPUTE.CREATED", {
        dispute_id: "PP-D-9",
        status: "WAITING_FOR_SELLER_RESPONSE",
        reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
        disputed_transactions: [{ seller_transaction_id: order.paymentRef }],
      }),
    );
    const rows = await db.select().from(dispute).where(eq(dispute.orderId, order.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: mine!.id, source: "paypal", providerDisputeId: "PP-D-9", status: "open" });
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringContaining("reported a problem")]);
  });

  it("records only what PayPal gave back when it decides for the buyer with a part refund", async () => {
    const sale = await createSale();
    const order = await shipped(sale);
    await hook.handlePayPalEvent(
      event("CUSTOMER.DISPUTE.RESOLVED", {
        dispute_id: "PP-D-10",
        status: "RESOLVED",
        dispute_outcome: { outcome_code: "RESOLVED_BUYER_FAVOUR", amount_refunded: { value: "30.00" } },
        disputed_transactions: [{ seller_transaction_id: order.paymentRef }],
      }),
    );
    const row = await orderRow(order.id);
    expect(row.refundedCents).toBe(3000);
    expect(row.status).toBe("shipped");
  });
});

describe("retrying a failed release", () => {
  it("counts failures and asks PayPal afresh on the next release", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed", completedAt: new Date(), releasedAt: new Date() });
    await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED", { reference_id: order.paymentRef }));
    await hook.handlePayPalEvent(event("PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED", { reference_id: order.paymentRef }));
    expect((await orderRow(order.id)).payoutRef).toBe("failed:2");

    const { releaseOrder } = await import("./commerce");
    await releaseOrder(await orderRow(order.id));
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 2);
  });
});
