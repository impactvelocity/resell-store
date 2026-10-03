import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, dispute, disputeEvent, eq, listing, notice, offer, orders } from "@repo/db";
import { resetDb } from "../../test/db";
import { createOffer, createOrder, createSale, daysAgo } from "../../test/factories";
import { clearEmails, emailsTo, sentEmails } from "../../test/mail";

/*
 * The timed sweeps (sweeps.ts) against the test database: what each one
 * picks up, that running it twice does nothing extra, and who gets told.
 * PayPal and outgoing API webhooks are mocked.
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
const sweeps = await import("./sweeps");

beforeEach(async () => {
  await resetDb();
  clearEmails();
  vi.clearAllMocks();
});

describe("expireOffers", () => {
  it("expires lapsed offers once and tells both sides", async () => {
    const sale = await createSale();
    const lapsed = await createOffer(sale, { expiresAt: new Date(Date.now() - 1000) });
    const fresh = await createOffer(sale, { status: "withdrawn" });

    expect(await sweeps.expireOffers()).toBe(1);
    expect(await sweeps.expireOffers()).toBe(0);

    const [row] = await db.select().from(offer).where(eq(offer.id, lapsed.id));
    expect(row!.status).toBe("expired");
    const [untouched] = await db.select().from(offer).where(eq(offer.id, fresh.id));
    expect(untouched!.status).toBe("withdrawn");
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringContaining("ran out")]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringContaining("ran out")]);
  });
});

describe("remindShipping", () => {
  it("nudges the seller and tells the buyer once the ship-by date passes, only once", async () => {
    const sale = await createSale();
    await createOrder(sale, { createdAt: daysAgo(3.5) });

    expect(await sweeps.remindShipping()).toBe(1);
    expect(await sweeps.remindShipping()).toBe(0);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^Did you ship/)]);
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringContaining("hasn't shipped yet")]);
  });

  it("doesn't remind about an order that already shipped", async () => {
    const sale = await createSale();
    await createOrder(sale, { createdAt: daysAgo(4), status: "shipped", shippedAt: daysAgo(1) });
    expect(await sweeps.remindShipping()).toBe(0);
    expect(await db.select().from(notice)).toHaveLength(0);
  });
});

describe("releaseDue", () => {
  it("completes and pays out an order whose check window closed", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });

    expect(await sweeps.dueReleases()).toEqual([order.id]);
    expect(await sweeps.releaseDue(order.id)).toBe(true);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.status).toBe("completed");
    expect(row!.releasedAt).toBeInstanceOf(Date);
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^You've been paid/)]);
  });

  it("holds the money while there's a live problem", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });
    await db.insert(dispute).values({ orderId: order.id, reason: "damaged" });

    expect(await sweeps.dueReleases()).toEqual([]);
    expect(await sweeps.releaseDue(order.id)).toBe(false);
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
  });

  it("throws when PayPal won't release, so the workflow retries", async () => {
    vi.mocked(paypal.releaseToSeller).mockRejectedValueOnce(new Error("PayPal down"));
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });
    await expect(sweeps.releaseDue(order.id)).rejects.toThrow(/retry/);
    // Completed, still owed: picked up again next time
    expect(await sweeps.dueReleases()).toEqual([order.id]);
  });
});

const HOUR = 60 * 60 * 1000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR);
const orderRow = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;

describe("claimNotice", () => {
  it("claims a reminder once per kind and order", async () => {
    expect(await sweeps.claimNotice("order.ship-reminder", "o1")).toBe(true);
    expect(await sweeps.claimNotice("order.ship-reminder", "o1")).toBe(false);
    expect(await sweeps.claimNotice("order.arrival-check", "o1")).toBe(true);
    expect(await sweeps.claimNotice("order.ship-reminder", "o2")).toBe(true);
  });
});

describe("expireOffers, other states", () => {
  it("tells only the seller when their counter ran out", async () => {
    const sale = await createSale();
    await createOffer(sale, { status: "countered", counterCents: 9_000, expiresAt: new Date(Date.now() - 1000) });

    expect(await sweeps.expireOffers()).toBe(1);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringContaining("didn't answer your counter")]);
    expect(emailsTo(sale.buyer.email)).toEqual([]);
    expect(webhooks.emitOfferEvent).toHaveBeenCalledWith(expect.any(String), "offer.updated");
  });

  it("tells both sides when an accepted offer wasn't paid", async () => {
    const sale = await createSale();
    await createOffer(sale, { status: "accepted", expiresAt: new Date(Date.now() - 1000) });

    expect(await sweeps.expireOffers()).toBe(1);
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringContaining("lapsed")]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringContaining("didn't pay")]);
  });

  it("leaves offers that haven't run out", async () => {
    const sale = await createSale();
    await createOffer(sale, { expiresAt: inHours(1) });
    expect(await sweeps.expireOffers()).toBe(0);
    expect(sentEmails).toEqual([]);
  });
});

describe("remindOffers", () => {
  it("reminds the seller about an open offer 12 hours before it runs out, once", async () => {
    const sale = await createSale();
    await createOffer(sale, { expiresAt: inHours(6) });

    expect(await sweeps.remindOffers()).toBe(1);
    expect(await sweeps.remindOffers()).toBe(0);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/offer runs out soon$/)]);
    expect(emailsTo(sale.buyer.email)).toEqual([]);
  });

  it("reminds the buyer about a counter or an accepted offer to pay for", async () => {
    const sale = await createSale();
    await createOffer(sale, { status: "countered", counterCents: 9_000, expiresAt: inHours(3) });
    const sale2 = await createSale();
    await createOffer(sale2, { status: "accepted", expiresAt: inHours(3) });

    expect(await sweeps.remindOffers()).toBe(2);
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringContaining("counter runs out soon")]);
    expect(emailsTo(sale2.buyer.email)).toEqual([expect.stringMatching(/^Pay for /)]);
    expect(emailsTo(sale.seller.email)).toEqual([]);
  });

  it("doesn't remind outside the 12-hour window", async () => {
    const sale = await createSale();
    await createOffer(sale, { expiresAt: inHours(13) });
    await createOffer(sale, { expiresAt: new Date(Date.now() - 1000) });
    await createOffer(sale, { status: "declined", expiresAt: inHours(2) });
    expect(await sweeps.remindOffers()).toBe(0);
  });

  it("reminds again when the offer moves to someone else's turn", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { expiresAt: inHours(6) });
    expect(await sweeps.remindOffers()).toBe(1);

    await db.update(offer).set({ status: "countered", counterCents: 9_000 }).where(eq(offer.id, o.id));
    expect(await sweeps.remindOffers()).toBe(1);
    expect(await sweeps.remindOffers()).toBe(0);
    expect(emailsTo(sale.buyer.email)).toHaveLength(1);
  });
});

describe("remindShipping, timing", () => {
  it("waits for the ship-by date and stops once it's due to be cancelled", async () => {
    const sale = await createSale();
    await createOrder(sale, { createdAt: daysAgo(2) });
    const sale2 = await createSale();
    await createOrder(sale2, { createdAt: daysAgo(8) });
    expect(await sweeps.remindShipping()).toBe(0);
  });
});

describe("cancelUnshipped", () => {
  it("finds orders that never shipped within 7 days", async () => {
    const sale = await createSale();
    const late = await createOrder(sale, { createdAt: daysAgo(7.5) });
    const sale2 = await createSale();
    await createOrder(sale2, { createdAt: daysAgo(5) });
    const sale3 = await createSale();
    await createOrder(sale3, { createdAt: daysAgo(9), status: "shipped", shippedAt: daysAgo(8) });

    expect(await sweeps.dueCancellations()).toEqual([late.id]);
  });

  it("cancels a test order, refunds it, drafts the listing and tells both sides", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(8) });

    expect(await sweeps.cancelUnshipped(order.id)).toBe(true);
    expect(await sweeps.cancelUnshipped(order.id)).toBe(false);

    const row = await orderRow(order.id);
    expect(row.status).toBe("cancelled");
    expect(row.refundedCents).toBe(10_900);
    const [l] = await db.select().from(listing).where(eq(listing.id, sale.listing.id));
    expect(l!.status).toBe("draft");
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Refunded: /)]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^Cancelled: /)]);
  });

  it("refunds a PayPal order in full through PayPal", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(8) });
    expect(await sweeps.cancelUnshipped(order.id)).toBe(true);
    expect(paypal.refundCapture).toHaveBeenCalledWith(
      expect.objectContaining({ captureId: order.paymentRef, amountCents: null, requestId: `cancel-${order.id}` }),
    );
  });

  it("does nothing to an order that isn't due yet", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(5) });
    expect(await sweeps.cancelUnshipped(order.id)).toBe(false);
    expect(await sweeps.cancelUnshipped("missing")).toBe(false);
    expect((await orderRow(order.id)).status).toBe("paid");
  });

  it("throws when the refund fails, leaving the order to retry", async () => {
    vi.mocked(paypal.refundCapture).mockRejectedValueOnce(new paypal.PayPalError("down", 503));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(8) });

    await expect(sweeps.cancelUnshipped(order.id)).rejects.toThrow(/couldn't make the refund/);
    expect((await orderRow(order.id)).status).toBe("paid");
    expect(await sweeps.dueCancellations()).toEqual([order.id]);
    expect(sentEmails).toEqual([]);
    errors.mockRestore();
  });
});

describe("checkArrivals", () => {
  it("asks the buyer a week after shipping, once", async () => {
    const sale = await createSale();
    await createOrder(sale, { createdAt: daysAgo(9), status: "shipped", shippedAt: daysAgo(7.5) });

    expect(await sweeps.checkArrivals()).toBe(1);
    expect(await sweeps.checkArrivals()).toBe(0);
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^Did .* arrive\?$/)]);
    expect(emailsTo(sale.seller.email)).toEqual([]);
  });

  it("doesn't ask before a week, after the release time, or while there's a problem", async () => {
    const early = await createSale();
    await createOrder(early, { createdAt: daysAgo(6), status: "shipped", shippedAt: daysAgo(5) });
    // Released 13 days after shipping (10 assumed in transit + 3 to check)
    const late = await createSale();
    await createOrder(late, { createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });
    // Delivered early: release (delivered + 3 days) comes before the week is up
    const delivered = await createSale();
    await createOrder(delivered, { createdAt: daysAgo(9), status: "delivered", shippedAt: daysAgo(8), deliveredAt: daysAgo(6) });
    const held = await createSale();
    const heldOrder = await createOrder(held, { createdAt: daysAgo(9), status: "shipped", shippedAt: daysAgo(7.5) });
    await db.insert(dispute).values({ orderId: heldOrder.id, reason: "not_arrived" });

    expect(await sweeps.checkArrivals()).toBe(0);
    expect(sentEmails).toEqual([]);
  });
});

describe("dueReleases", () => {
  it("picks up delivered orders past the check window and unreleased completed PayPal orders", async () => {
    const s1 = await createSale();
    const delivered = await createOrder(s1, { createdAt: daysAgo(8), status: "delivered", shippedAt: daysAgo(6), deliveredAt: daysAgo(4) });
    const s2 = await createSale();
    await createOrder(s2, { createdAt: daysAgo(6), status: "shipped", shippedAt: daysAgo(5) });
    const s3 = await createSale();
    const unreleased = await createOrder(s3, { paypal: true, status: "completed", completedAt: daysAgo(1) });
    const s4 = await createSale();
    await createOrder(s4, { paypal: true, status: "completed", releasedAt: daysAgo(1) });
    const s5 = await createSale();
    await createOrder(s5, { status: "completed" });
    const s6 = await createSale();
    await createOrder(s6, { createdAt: daysAgo(30), status: "paid" });

    expect((await sweeps.dueReleases()).sort()).toEqual([delivered.id, unreleased.id].sort());
  });

  it("releases by PayPal's hold limit even if the buyer's window is still open", async () => {
    const sale = await createSale();
    // Shipped very late: the normal release (shipped + 13 days) is 8 days off, but day 27 after payment has passed
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(27.5), status: "shipped", shippedAt: daysAgo(5) });
    expect(await sweeps.dueReleases()).toEqual([order.id]);
  });
});

describe("releaseDue, more cases", () => {
  it("completes a test order without PayPal and still says they've been paid", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });

    expect(await sweeps.releaseDue(order.id)).toBe(true);
    const row = await orderRow(order.id);
    expect(row.status).toBe("completed");
    expect(row.deliveredAt).toBeInstanceOf(Date);
    expect(row.releasedAt).toBeNull();
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.completed");
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^You've been paid/)]);
  });

  it("does nothing before the release time", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(6), status: "shipped", shippedAt: daysAgo(5) });
    expect(await sweeps.releaseDue(order.id)).toBe(false);
    expect((await orderRow(order.id)).status).toBe("shipped");
    expect(await sweeps.releaseDue("missing")).toBe(false);
  });

  it("retries the release of a completed PayPal order, and only emails once", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "completed", completedAt: daysAgo(1) });

    expect(await sweeps.releaseDue(order.id)).toBe(true);
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    const row = await orderRow(order.id);
    expect(row.releasedAt).toBeInstanceOf(Date);
    expect(row.payoutRef).toBe("PAYOUT-1");
    expect(await sweeps.dueReleases()).toEqual([]);

    // Run again: no second release, no second email
    expect(await sweeps.releaseDue(order.id)).toBe(true);
    expect(paypal.releaseToSeller).toHaveBeenCalledTimes(1);
    expect(emailsTo(sale.seller.email)).toHaveLength(1);
  });

  it("leaves refunded and cancelled orders alone", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, createdAt: daysAgo(15), status: "refunded", shippedAt: daysAgo(14) });
    expect(await sweeps.releaseDue(order.id)).toBe(false);
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
  });
});

describe("escalateQuiet", () => {
  async function problem(opts: { age: number; source?: "buyer" | "paypal"; status?: "open" | "escalated" }) {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(opts.age + 5), status: "shipped", shippedAt: daysAgo(opts.age + 3) });
    const [d] = await db
      .insert(dispute)
      .values({
        orderId: order.id,
        reason: "damaged",
        createdAt: daysAgo(opts.age),
        source: opts.source ?? "buyer",
        status: opts.status ?? "open",
        escalatedAt: opts.status === "escalated" ? daysAgo(1) : null,
      })
      .returning();
    await db.insert(disputeEvent).values({ disputeId: d!.id, side: "buyer", authorId: sale.buyer.id, kind: "opened", createdAt: daysAgo(opts.age) });
    return { sale, order, dispute: d! };
  }

  it("hands a problem the seller never answered to resell.store and tells both sides", async () => {
    const { sale, dispute: d } = await problem({ age: 4 });

    expect(await sweeps.escalateQuiet()).toBe(1);
    expect(await sweeps.escalateQuiet()).toBe(0);

    const [row] = await db.select().from(dispute).where(eq(dispute.id, d.id));
    expect(row!.status).toBe("escalated");
    expect(row!.escalatedAt).toBeInstanceOf(Date);
    const events = await db.select().from(disputeEvent).where(eq(disputeEvent.disputeId, d.id)).orderBy(disputeEvent.createdAt);
    expect(events.at(-1)).toMatchObject({ side: "platform", kind: "escalated", body: "The seller didn't answer in time." });
    expect(emailsTo(sale.buyer.email)).toEqual([expect.stringMatching(/^resell\.store is looking at/)]);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^resell\.store is looking at/)]);
  });

  it("leaves problems the seller answered, young ones, PayPal ones and escalated ones", async () => {
    const answered = await problem({ age: 4 });
    await db.insert(disputeEvent).values({ disputeId: answered.dispute.id, side: "seller", kind: "message", body: "Looking into it" });
    await problem({ age: 2 });
    await problem({ age: 5, source: "paypal" });
    await problem({ age: 5, status: "escalated" });

    expect(await sweeps.escalateQuiet()).toBe(0);
    expect(sentEmails).toEqual([]);
  });
});

describe("runSweeps", () => {
  it("runs every sweep once and counts what each did", async () => {
    const s1 = await createSale();
    await createOffer(s1, { expiresAt: new Date(Date.now() - 1000) });
    const s2 = await createSale();
    await createOffer(s2, { expiresAt: inHours(2) });
    const s3 = await createSale();
    await createOrder(s3, { createdAt: daysAgo(3.5) });
    const s4 = await createSale();
    await createOrder(s4, { createdAt: daysAgo(8) });
    const s5 = await createSale();
    await createOrder(s5, { createdAt: daysAgo(9), status: "shipped", shippedAt: daysAgo(7.5) });
    const s6 = await createSale();
    await createOrder(s6, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });

    expect(await sweeps.runSweeps()).toEqual({
      offersExpired: 1,
      offerReminders: 1,
      shipReminders: 1,
      cancelled: 1,
      arrivalChecks: 1,
      released: 1,
      escalated: 0,
      followDigests: 0,
      // The open offer is waiting on its seller: summarised if it's past the evening hour (UTC) when this runs
      agentSummaries: expect.any(Number),
      reviewRequests: 0,
      webhooks: { retried: 0, delivered: 0, gaveUp: 0, turnedOff: 0, activityPruned: 0 },
    });
    // A second pass finds nothing new
    expect(await sweeps.runSweeps()).toEqual({
      offersExpired: 0,
      offerReminders: 0,
      shipReminders: 0,
      cancelled: 0,
      arrivalChecks: 0,
      released: 0,
      escalated: 0,
      followDigests: 0,
      agentSummaries: 0,
      reviewRequests: 0,
      webhooks: { retried: 0, delivered: 0, gaveUp: 0, turnedOff: 0, activityPruned: 0 },
    });
  });

  it("keeps going when one order fails", async () => {
    vi.mocked(paypal.releaseToSeller).mockRejectedValueOnce(new Error("PayPal down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const s1 = await createSale();
    await createOrder(s1, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });
    const s2 = await createSale();
    await createOrder(s2, { paypal: true, createdAt: daysAgo(16), status: "shipped", shippedAt: daysAgo(15) });

    const result = await sweeps.runSweeps();
    expect(result.released).toBe(1);
    expect(paypal.releaseToSeller).toHaveBeenCalledTimes(2);
    errors.mockRestore();
  });
});
