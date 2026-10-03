import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkout, db, dispute, disputeEvent, eq, listing, offer, orders, paypalAccount, shop } from "@repo/db";
import { resetDb } from "../../test/db";
import { createOffer, createOrder, createSale, createShop, createListing, createUser, daysAgo, shipTo } from "../../test/factories";

/*
 * Buying and offers (commerce.ts) against the test database: the order
 * transaction and its one-sale-per-listing guarantee, the offer state machine,
 * the two PayPal checkout steps, shipping, "it's all good" and releasing the
 * held money, and the list readers. PayPal is mocked (createOrder,
 * captureOrder, refundCapture, releaseToSeller, demoSellerId), webhook events
 * are spies, and the shop's negotiator agent never runs.
 */

vi.mock("./paypal", async (orig) => ({
  ...(await orig<typeof import("./paypal")>()),
  createOrder: vi.fn(),
  captureOrder: vi.fn(),
  refundCapture: vi.fn(),
  releaseToSeller: vi.fn(),
  demoSellerId: vi.fn(),
}));
// Not a partial mock: api/webhooks imports commerce, so loading the real one here would hand commerce the unmocked emitters
vi.mock("./api/webhooks", () => ({
  emitOfferEvent: vi.fn(),
  emitOrderEvent: vi.fn(),
  emitQuestion: vi.fn(),
}));
vi.mock("./later", () => ({ runAfterResponse: vi.fn() }));
vi.mock("./negotiator", () => ({ negotiate: vi.fn(async () => {}) }));

const paypal = vi.mocked(await import("./paypal"));
const webhooks = vi.mocked(await import("./api/webhooks"));
const later = vi.mocked(await import("./later"));
const negotiator = vi.mocked(await import("./negotiator"));
const commerce = await import("./commerce");
const { CommerceError } = commerce;

const HOUR = 3600_000;

const completedCapture = {
  id: "CAP-1",
  status: "COMPLETED",
  totalCents: 10_900,
  paypalFeeCents: 429,
  platformFeeCents: 1000,
  sellerNetCents: 9471,
};

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  paypal.demoSellerId.mockReturnValue(null);
  paypal.createOrder.mockResolvedValue({ id: "ORDER-1", approveUrl: "https://paypal.test/approve/ORDER-1" });
  paypal.captureOrder.mockResolvedValue(completedCapture);
  paypal.refundCapture.mockResolvedValue({ id: "REFUND-1", status: "COMPLETED", amountCents: null });
  paypal.releaseToSeller.mockResolvedValue({ payoutRef: "PAYOUT-1", status: "SUCCESS" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const buy = (sale: { buyer: { id: string }; listing: { id: string } }, extra: Partial<Parameters<typeof commerce.placeOrder>[0]> = {}) => ({
  buyerId: sale.buyer.id,
  listingId: sale.listing.id,
  delivery: "tracked" as const,
  payMethod: "paypal" as const,
  shipTo,
  ...extra,
});

const getListing = async (id: string) => (await db.select().from(listing).where(eq(listing.id, id)))[0]!;
const getOffer = async (id: string) => (await db.select().from(offer).where(eq(offer.id, id)))[0]!;
const getOrder = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;
const allOrders = () => db.select().from(orders);

/** Roughly `hours` from now (within a minute). */
const expectHoursFromNow = (date: Date | null, hours: number) => {
  expect(date).toBeInstanceOf(Date);
  expect(Math.abs(date!.getTime() - (Date.now() + hours * HOUR))).toBeLessThan(60_000);
};

describe("pricing helpers", () => {
  it("charges the listing's shipping, $9 when unset, and $12 more for express", () => {
    expect(commerce.shippingFor(500, "tracked")).toBe(500);
    expect(commerce.shippingFor(500, "express")).toBe(1700);
    expect(commerce.shippingFor(null, "tracked")).toBe(900);
    expect(commerce.shippingFor(null, "express")).toBe(2100);
    expect(commerce.shippingFor(0, "tracked")).toBe(0);
  });

  it("lapses open, countered and accepted offers at expiresAt, and leaves finished ones alone", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + HOUR);
    for (const status of ["open", "countered", "accepted"] as const) {
      expect(commerce.effectiveStatus({ status, expiresAt: past })).toBe("expired");
      expect(commerce.effectiveStatus({ status, expiresAt: future })).toBe(status);
    }
    for (const status of ["declined", "withdrawn", "paid", "expired"] as const)
      expect(commerce.effectiveStatus({ status, expiresAt: past })).toBe(status);
  });

  it("agrees on the counter when there was one, else the offer", () => {
    expect(commerce.agreedCents({ amountCents: 8000, counterCents: null })).toBe(8000);
    expect(commerce.agreedCents({ amountCents: 8000, counterCents: 9000 })).toBe(9000);
  });
});

describe("placeOrder", () => {
  it("writes the order, marks the listing sold and tells webhooks", async () => {
    const sale = await createSale();
    const order = await commerce.placeOrder(buy(sale));

    expect(order).toMatchObject({
      listingId: sale.listing.id,
      shopId: sale.shop.id,
      buyerId: sale.buyer.id,
      offerId: null,
      itemCents: 10_000,
      shippingCents: 900,
      totalCents: 10_900,
      delivery: "tracked",
      payMethod: "paypal",
      shipTo,
      status: "paid",
      paymentProvider: "mock",
      payeeMerchantId: null,
      platformFeeCents: null,
    });
    expect(order.paymentRef).toMatch(/^mock_/);
    const l = await getListing(sale.listing.id);
    expect(l.status).toBe("sold");
    expect(l.soldAt).toBeInstanceOf(Date);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "listing.sold");
  });

  it("adds express shipping, and hands the final amounts to the payment", async () => {
    const sale = await createSale();
    const pay = vi.fn(async () => ({ provider: "test", ref: "T-1", platformFeeCents: 1000, sellerNetCents: 9000 }));
    const order = await commerce.placeOrder(buy(sale, { delivery: "express", payMethod: "card" }), pay);

    expect(pay).toHaveBeenCalledWith({ itemCents: 10_000, shippingCents: 2100, totalCents: 12_100 });
    expect(order).toMatchObject({ shippingCents: 2100, totalCents: 12_100, payMethod: "card", paymentProvider: "test", paymentRef: "T-1", platformFeeCents: 1000, sellerNetCents: 9000, paypalFeeCents: null });
  });

  it("charges an accepted offer's agreed price, marks it paid and declines everyone else's", async () => {
    const sale = await createSale();
    const mine = await createOffer(sale, { status: "accepted", amountCents: 7000, counterCents: 8500 });
    const other = await createUser();
    const theirs = await createOffer({ ...sale, buyer: other }, { status: "open" });
    const theirCounter = await createOffer({ ...sale, buyer: other }, { status: "countered", counterCents: 9000 });
    const gone = await createOffer({ ...sale, buyer: other }, { status: "withdrawn" });

    const order = await commerce.placeOrder(buy(sale, { offerId: mine.id }));

    expect(order.offerId).toBe(mine.id);
    expect(order.itemCents).toBe(8500);
    expect(order.totalCents).toBe(9400);
    expect((await getOffer(mine.id)).status).toBe("paid");
    for (const o of [theirs, theirCounter]) {
      const row = await getOffer(o.id);
      expect(row.status).toBe("declined");
      expect(row.respondedAt).toBeInstanceOf(Date);
    }
    expect((await getOffer(gone.id)).status).toBe("withdrawn");
  });

  it("declines open offers on it when someone buys at the full price", async () => {
    const sale = await createSale();
    const other = await createUser();
    const theirs = await createOffer({ ...sale, buyer: other });
    await commerce.placeOrder(buy(sale));
    expect((await getOffer(theirs.id)).status).toBe("declined");
  });

  it("refuses an offer that isn't accepted, has lapsed, or is someone else's", async () => {
    const sale = await createSale();
    const open = await createOffer(sale, { status: "open" });
    const lapsed = await createOffer(sale, { status: "accepted", expiresAt: new Date(Date.now() - 1000) });
    const other = await createUser();
    const theirs = await createOffer({ ...sale, buyer: other }, { status: "accepted" });

    for (const o of [open, lapsed, theirs])
      await expect(commerce.placeOrder(buy(sale, { offerId: o.id }))).rejects.toThrow("isn't open for paying");
    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(sale.listing.id)).status).toBe("live");
  });

  it("refuses your own listing, a sold one, a missing one, and one with no price", async () => {
    const sale = await createSale();
    await expect(commerce.placeOrder(buy({ buyer: sale.seller, listing: sale.listing }))).rejects.toThrow("your own listing");

    const sold = await createListing(sale.shop.id, { status: "sold" });
    await expect(commerce.placeOrder(buy({ buyer: sale.buyer, listing: sold }))).rejects.toThrow("someone just bought");

    await expect(commerce.placeOrder(buy({ buyer: sale.buyer, listing: { id: "nope" } }))).rejects.toThrow("isn't here any more");

    const unpriced = await createListing(sale.shop.id, { priceCents: null });
    const error = await commerce.placeOrder(buy({ buyer: sale.buyer, listing: unpriced })).catch((e) => e);
    expect(error).toBeInstanceOf(CommerceError);
    expect(error.message).toContain("doesn't have a price");

    expect(await allOrders()).toHaveLength(0);
    expect(webhooks.emitOrderEvent).not.toHaveBeenCalled();
  });

  it("writes nothing when the payment throws", async () => {
    const sale = await createSale();
    const mine = await createOffer(sale, { status: "accepted" });
    const other = await createUser();
    const theirs = await createOffer({ ...sale, buyer: other });

    await expect(
      commerce.placeOrder(buy(sale, { offerId: mine.id }), async () => {
        throw new Error("card declined");
      }),
    ).rejects.toThrow("card declined");

    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(sale.listing.id)).status).toBe("live");
    expect((await getOffer(mine.id)).status).toBe("accepted");
    expect((await getOffer(theirs.id)).status).toBe("open");
    expect(webhooks.emitOrderEvent).not.toHaveBeenCalled();
  });

  it("sells a listing once when two buyers check out at the same moment", async () => {
    const sale = await createSale();
    const second = await createUser();
    // A slow payment holds the lock, so the other buyer has to wait for it
    const slowPay = async () => {
      await new Promise((r) => setTimeout(r, 150));
      return { provider: "mock", ref: `slow_${crypto.randomUUID()}` };
    };

    const results = await Promise.allSettled([
      commerce.placeOrder(buy(sale), slowPay),
      commerce.placeOrder(buy({ buyer: second, listing: sale.listing }), slowPay),
    ]);

    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0]!.reason).toBeInstanceOf(CommerceError);
    expect(lost[0]!.reason.message).toContain("someone just bought");
    expect(await allOrders()).toHaveLength(1);
  });

  it("can't hold two live orders for one listing, even written directly", async () => {
    const sale = await createSale();
    const first = await createOrder(sale);
    await expect(createOrder(sale)).rejects.toThrow();

    // Once the first is refunded the listing can sell again
    await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, first.id));
    await expect(createOrder(sale)).resolves.toBeTruthy();
  });
});

describe("makeOffer", () => {
  it("opens an offer for 48 hours, tells webhooks and lets the shop's agent look at it", async () => {
    const sale = await createSale();
    const created = await commerce.makeOffer({
      buyerId: sale.buyer.id,
      listingId: sale.listing.id,
      amountCents: 8000,
      note: "  Would you take 80?  ",
      depositCents: 1000,
    });

    expect(created).toMatchObject({
      listingId: sale.listing.id,
      shopId: sale.shop.id,
      buyerId: sale.buyer.id,
      amountCents: 8000,
      note: "Would you take 80?",
      depositCents: 1000,
      status: "open",
      counterCents: null,
    });
    expectHoursFromNow(created.expiresAt, 48);
    expect(webhooks.emitOfferEvent).toHaveBeenCalledWith(created.id, "offer.received");

    expect(later.runAfterResponse).toHaveBeenCalledTimes(1);
    await later.runAfterResponse.mock.calls[0]![0]();
    expect(negotiator.negotiate).toHaveBeenCalledWith(created.id);
  });

  it("stores a blank note and zero deposit as nothing", async () => {
    const sale = await createSale();
    const created = await commerce.makeOffer({ buyerId: sale.buyer.id, listingId: sale.listing.id, amountCents: 5000, note: "   ", depositCents: 0 });
    expect(created.note).toBeNull();
    expect(created.depositCents).toBeNull();
  });

  it("refuses offers under $1, at or over the asking price, and deposits that aren't less than the offer", async () => {
    const sale = await createSale();
    const offerOf = (amountCents: number, depositCents?: number) =>
      commerce.makeOffer({ buyerId: sale.buyer.id, listingId: sale.listing.id, amountCents, depositCents });

    await expect(offerOf(99)).rejects.toThrow("Offers start at $1");
    await expect(offerOf(10_000)).rejects.toThrow("That's the asking price");
    await expect(offerOf(12_000)).rejects.toThrow("That's the asking price");
    await expect(offerOf(5000, 5000)).rejects.toThrow("deposit has to be less");
    await expect(offerOf(5000, 6000)).rejects.toThrow("deposit has to be less");
    await expect(offerOf(100)).resolves.toMatchObject({ amountCents: 100 });
    await expect(offerOf(9999, 9998)).resolves.toMatchObject({ amountCents: 9999 });
  });

  it("refuses when the seller isn't taking offers, it's your own, or it's not live", async () => {
    const sale = await createSale();
    const closed = await createListing(sale.shop.id, { takeOffers: false });
    await expect(commerce.makeOffer({ buyerId: sale.buyer.id, listingId: closed.id, amountCents: 5000 })).rejects.toThrow("isn't taking offers");
    await expect(commerce.makeOffer({ buyerId: sale.seller.id, listingId: sale.listing.id, amountCents: 5000 })).rejects.toThrow("your own listing");
    const sold = await createListing(sale.shop.id, { status: "sold" });
    await expect(commerce.makeOffer({ buyerId: sale.buyer.id, listingId: sold.id, amountCents: 5000 })).rejects.toThrow("isn't for sale any more");
    await expect(commerce.makeOffer({ buyerId: sale.buyer.id, listingId: "nope", amountCents: 5000 })).rejects.toThrow("isn't for sale any more");
    expect(await db.select().from(offer)).toHaveLength(0);
    expect(webhooks.emitOfferEvent).not.toHaveBeenCalled();
    expect(later.runAfterResponse).not.toHaveBeenCalled();
  });

  it("replaces the buyer's open or countered offer, but nobody else's and not an accepted one", async () => {
    const sale = await createSale();
    const open = await createOffer(sale, { status: "open" });
    const countered = await createOffer(sale, { status: "countered", counterCents: 9000 });
    const accepted = await createOffer(sale, { status: "accepted" });
    const other = await createUser();
    const theirs = await createOffer({ ...sale, buyer: other });
    const elsewhere = await createListing(sale.shop.id);
    const mineElsewhere = await createOffer({ ...sale, listing: elsewhere });

    const created = await commerce.makeOffer({ buyerId: sale.buyer.id, listingId: sale.listing.id, amountCents: 8500 });

    expect((await getOffer(open.id)).status).toBe("withdrawn");
    expect((await getOffer(countered.id)).status).toBe("withdrawn");
    expect((await getOffer(accepted.id)).status).toBe("accepted");
    expect((await getOffer(theirs.id)).status).toBe("open");
    expect((await getOffer(mineElsewhere.id)).status).toBe("open");
    expect((await getOffer(created.id)).status).toBe("open");
  });
});

describe("respondToOffer", () => {
  it("accepts, giving the buyer 48 hours to pay", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { expiresAt: new Date(Date.now() + HOUR) });
    const updated = await commerce.respondToOffer({ sellerId: sale.seller.id, offerId: o.id, action: "accept" });
    expect(updated.status).toBe("accepted");
    expect(updated.respondedAt).toBeInstanceOf(Date);
    expectHoursFromNow(updated.expiresAt, 48);
  });

  it("declines", async () => {
    const sale = await createSale();
    const o = await createOffer(sale);
    const updated = await commerce.respondToOffer({ sellerId: sale.seller.id, offerId: o.id, action: "decline" });
    expect(updated.status).toBe("declined");
    expect(updated.respondedAt).toBeInstanceOf(Date);
  });

  it("counters between their offer and the asking price", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { amountCents: 8000 });
    const respond = (counterCents?: number) =>
      commerce.respondToOffer({ sellerId: sale.seller.id, offerId: o.id, action: "counter", counterCents });

    await expect(respond(8000)).rejects.toThrow("between their offer and your price");
    await expect(respond(7000)).rejects.toThrow("between their offer and your price");
    await expect(respond(10_000)).rejects.toThrow("between their offer and your price");
    await expect(respond()).rejects.toThrow("between their offer and your price");
    expect((await getOffer(o.id)).status).toBe("open");

    const updated = await respond(9000);
    expect(updated).toMatchObject({ status: "countered", counterCents: 9000, counteredBy: "seller" });
    expectHoursFromNow(updated.expiresAt, 48);
  });

  it("only lets the shop's owner answer", async () => {
    const sale = await createSale();
    const o = await createOffer(sale);
    await expect(commerce.respondToOffer({ sellerId: sale.buyer.id, offerId: o.id, action: "accept" })).rejects.toThrow("isn't yours to answer");
    await expect(commerce.respondToOffer({ sellerId: sale.seller.id, offerId: "nope", action: "accept" })).rejects.toThrow("isn't yours to answer");
  });

  it("refuses an offer that was already answered or ran out, or a listing that's gone", async () => {
    const sale = await createSale();
    const countered = await createOffer(sale, { status: "countered", counterCents: 9000 });
    const lapsed = await createOffer(sale, { expiresAt: new Date(Date.now() - 1000) });
    for (const o of [countered, lapsed])
      await expect(commerce.respondToOffer({ sellerId: sale.seller.id, offerId: o.id, action: "accept" })).rejects.toThrow("already been answered or ran out");

    const open = await createOffer(sale);
    await db.update(listing).set({ status: "sold" }).where(eq(listing.id, sale.listing.id));
    await expect(commerce.respondToOffer({ sellerId: sale.seller.id, offerId: open.id, action: "accept" })).rejects.toThrow("isn't for sale any more");
  });
});

describe("buyerRespond", () => {
  it("accepts a counter, with 48 hours to pay, and tells webhooks", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { status: "countered", counterCents: 9000 });
    const updated = await commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: o.id, action: "accept-counter" });
    expect(updated.status).toBe("accepted");
    expect(updated.counterCents).toBe(9000);
    expectHoursFromNow(updated.expiresAt, 48);
    expect(webhooks.emitOfferEvent).toHaveBeenCalledWith(o.id, "offer.updated");
  });

  it("declines a counter", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { status: "countered", counterCents: 9000 });
    expect((await commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: o.id, action: "decline-counter" })).status).toBe("declined");
  });

  it("takes back an open or countered offer, but not an accepted one", async () => {
    const sale = await createSale();
    const open = await createOffer(sale);
    const countered = await createOffer(sale, { status: "countered", counterCents: 9000 });
    const accepted = await createOffer(sale, { status: "accepted" });
    expect((await commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: open.id, action: "withdraw" })).status).toBe("withdrawn");
    expect((await commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: countered.id, action: "withdraw" })).status).toBe("withdrawn");
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: accepted.id, action: "withdraw" })).rejects.toThrow("too late");
    expect((await getOffer(accepted.id)).status).toBe("accepted");
  });

  it("has nothing to answer without a live counter", async () => {
    const sale = await createSale();
    const open = await createOffer(sale);
    const lapsed = await createOffer(sale, { status: "countered", counterCents: 9000, expiresAt: new Date(Date.now() - 1000) });
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: open.id, action: "accept-counter" })).rejects.toThrow("no counter");
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: lapsed.id, action: "accept-counter" })).rejects.toThrow("no counter");
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: lapsed.id, action: "decline-counter" })).rejects.toThrow("no counter");
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: lapsed.id, action: "withdraw" })).rejects.toThrow("too late");
    expect(webhooks.emitOfferEvent).not.toHaveBeenCalled();
  });

  it("only lets the buyer answer", async () => {
    const sale = await createSale();
    const o = await createOffer(sale, { status: "countered", counterCents: 9000 });
    await expect(commerce.buyerRespond({ buyerId: sale.seller.id, offerId: o.id, action: "accept-counter" })).rejects.toThrow("isn't yours");
    await expect(commerce.buyerRespond({ buyerId: sale.buyer.id, offerId: "nope", action: "withdraw" })).rejects.toThrow("isn't yours");
  });
});

describe("startCheckout", () => {
  const urls = { returnUrl: "http://localhost:5689/checkout/return", cancelUrl: "http://localhost:5689/checkout/cancel" };

  async function connect(userId: string, paymentsReceivable = true) {
    await db.insert(paypalAccount).values({ userId, merchantId: "SELLER-MERCHANT", paymentsReceivable });
  }

  it("creates the PayPal order to the seller's connected account and remembers the checkout", async () => {
    const sale = await createSale({ listing: { title: "Linen wrap dress" } });
    await connect(sale.seller.id);

    const result = await commerce.startCheckout({ ...buy(sale, { delivery: "express", payMethod: "card" }), ...urls });

    expect(result).toEqual({ approveUrl: "https://paypal.test/approve/ORDER-1" });
    const [row] = await db.select().from(checkout);
    expect(row).toMatchObject({
      providerOrderId: "ORDER-1",
      buyerId: sale.buyer.id,
      listingId: sale.listing.id,
      offerId: null,
      delivery: "express",
      payMethod: "card",
      shipTo,
      itemCents: 10_000,
      shippingCents: 2100,
      totalCents: 12_100,
      platformFeeCents: 1000,
      payeeMerchantId: "SELLER-MERCHANT",
      status: "created",
    });
    expect(paypal.createOrder).toHaveBeenCalledWith({
      reference: row!.id,
      itemName: "Linen wrap dress",
      itemCents: 10_000,
      shippingCents: 2100,
      platformFeeCents: 1000,
      payeeMerchantId: "SELLER-MERCHANT",
      method: "card",
      ...urls,
    });
    // Nothing is bought yet
    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(sale.listing.id)).status).toBe("live");
  });

  it("prices an accepted offer and falls back to the listing's name", async () => {
    const sale = await createSale({ listing: { title: null, name: "Wrap dress" } });
    await connect(sale.seller.id);
    const o = await createOffer(sale, { status: "accepted", amountCents: 8000 });

    await commerce.startCheckout({ ...buy(sale, { offerId: o.id }), ...urls });

    const [row] = await db.select().from(checkout);
    expect(row).toMatchObject({ offerId: o.id, itemCents: 8000, totalCents: 8900, platformFeeCents: 800 });
    expect(paypal.createOrder).toHaveBeenCalledWith(expect.objectContaining({ itemName: "Wrap dress", itemCents: 8000 }));
  });

  it("pays the sandbox demo seller when the seller's PayPal can't take payments", async () => {
    const sale = await createSale();
    paypal.demoSellerId.mockReturnValue("DEMO-SELLER");

    await commerce.startCheckout({ ...buy(sale), ...urls });
    expect(paypal.createOrder).toHaveBeenCalledWith(expect.objectContaining({ payeeMerchantId: "DEMO-SELLER" }));

    await resetDb();
    const other = await createSale();
    await connect(other.seller.id, false);
    await commerce.startCheckout({ ...buy(other), ...urls });
    expect(paypal.createOrder).toHaveBeenLastCalledWith(expect.objectContaining({ payeeMerchantId: "DEMO-SELLER" }));
  });

  it("refuses when the seller can't be paid, without asking PayPal", async () => {
    const sale = await createSale();
    await expect(commerce.startCheckout({ ...buy(sale), ...urls })).rejects.toThrow("hasn't connected PayPal yet");

    await connect(sale.seller.id, false);
    const error = await commerce.startCheckout({ ...buy(sale), ...urls }).catch((e) => e);
    expect(error).toBeInstanceOf(CommerceError);
    expect(error.message).toContain("isn't ready to take payments");

    expect(paypal.createOrder).not.toHaveBeenCalled();
    expect(await db.select().from(checkout)).toHaveLength(0);
  });

  it("refuses what placeOrder would: own listing, sold, unaccepted offer", async () => {
    const sale = await createSale();
    await connect(sale.seller.id);
    await expect(commerce.startCheckout({ ...buy({ buyer: sale.seller, listing: sale.listing }), ...urls })).rejects.toThrow("your own listing");
    const open = await createOffer(sale);
    await expect(commerce.startCheckout({ ...buy(sale, { offerId: open.id }), ...urls })).rejects.toThrow("isn't open for paying");
    await db.update(listing).set({ status: "sold" }).where(eq(listing.id, sale.listing.id));
    await expect(commerce.startCheckout({ ...buy(sale), ...urls })).rejects.toThrow("someone just bought");
    expect(paypal.createOrder).not.toHaveBeenCalled();
  });
});

describe("finishCheckout", () => {
  /** A seller with connected PayPal, and a buyer who has been sent to PayPal (order ORDER-1). */
  async function started(opts: { offer?: boolean } = {}) {
    const sale = await createSale();
    await db.insert(paypalAccount).values({ userId: sale.seller.id, merchantId: "SELLER-MERCHANT", paymentsReceivable: true });
    const o = opts.offer ? await createOffer(sale, { status: "accepted", amountCents: 8000 }) : null;
    await commerce.startCheckout({ ...buy(sale, { offerId: o?.id }), returnUrl: "http://r", cancelUrl: "http://c" });
    const [row] = await db.select().from(checkout);
    return { ...sale, checkout: row!, offer: o };
  }
  const getCheckout = async (id: string) => (await db.select().from(checkout).where(eq(checkout.id, id)))[0]!;

  it("captures the payment and places the order with PayPal's fees", async () => {
    const s = await started();
    const result = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id });

    expect(result.already).toBe(false);
    expect(result.listingId).toBe(s.listing.id);
    expect(paypal.captureOrder).toHaveBeenCalledWith("ORDER-1", `capture-${s.checkout.id}`);
    expect(result.order).toMatchObject({
      buyerId: s.buyer.id,
      itemCents: 10_000,
      totalCents: 10_900,
      paymentProvider: "paypal",
      paymentRef: "CAP-1",
      payeeMerchantId: "SELLER-MERCHANT",
      platformFeeCents: 1000,
      paypalFeeCents: 429,
      sellerNetCents: 9471,
      status: "paid",
    });
    const row = await getCheckout(s.checkout.id);
    expect(row.status).toBe("completed");
    expect(row.orderId).toBe(result.order!.id);
    expect((await getListing(s.listing.id)).status).toBe("sold");
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(result.order!.id, "listing.sold");
  });

  it("pays for an accepted offer and marks it paid", async () => {
    const s = await started({ offer: true });
    const result = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id });
    expect(result.order).toMatchObject({ offerId: s.offer!.id, itemCents: 8000 });
    expect((await getOffer(s.offer!.id)).status).toBe("paid");
  });

  it("uses the platform fee it worked out when PayPal doesn't report one (pending capture)", async () => {
    const s = await started();
    paypal.captureOrder.mockResolvedValue({ id: "CAP-2", status: "PENDING", totalCents: 10_900, paypalFeeCents: null, platformFeeCents: null, sellerNetCents: null });
    const result = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: null });
    expect(result.order).toMatchObject({ paymentRef: "CAP-2", platformFeeCents: s.checkout.platformFeeCents, paypalFeeCents: null, sellerNetCents: null });
  });

  it("is safe to run twice: a refresh doesn't capture again", async () => {
    const s = await started();
    await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id });
    const again = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id });
    expect(again).toEqual({ order: null, listingId: s.listing.id, already: true });
    expect(paypal.captureOrder).toHaveBeenCalledTimes(1);
    expect(await allOrders()).toHaveLength(1);
  });

  it("refuses an unknown checkout, someone else's, or one that already failed", async () => {
    const s = await started();
    await expect(commerce.finishCheckout({ providerOrderId: "NOPE", viewerId: s.buyer.id })).rejects.toThrow("couldn't find that checkout");
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.seller.id })).rejects.toThrow("isn't yours");
    await db.update(checkout).set({ status: "failed" }).where(eq(checkout.id, s.checkout.id));
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow("didn't go through");
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it("doesn't charge when the price changed while they were in PayPal", async () => {
    const s = await started();
    await db.update(listing).set({ priceCents: 12_000 }).where(eq(listing.id, s.listing.id));

    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow("price changed");

    expect(paypal.captureOrder).not.toHaveBeenCalled();
    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect((await getCheckout(s.checkout.id)).status).toBe("failed");
    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(s.listing.id)).status).toBe("live");
  });

  it("doesn't charge when the accepted offer lapsed while they were away", async () => {
    const s = await started({ offer: true });
    await db.update(offer).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(offer.id, s.offer!.id));
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow("isn't open for paying");
    expect(paypal.captureOrder).not.toHaveBeenCalled();
    expect((await getCheckout(s.checkout.id)).status).toBe("failed");
  });

  it("doesn't charge when someone else bought it first", async () => {
    const s = await started();
    const other = await createUser();
    await commerce.placeOrder(buy({ buyer: other, listing: s.listing }));
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow("someone just bought");
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it("tells the buyer when PayPal declined their way to pay", async () => {
    const s = await started();
    paypal.captureOrder.mockRejectedValue(new paypal.PayPalError("declined", 422, "INSTRUMENT_DECLINED", "dbg-1"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id }).catch((e) => e);
    expect(error).toBeInstanceOf(CommerceError);
    expect(error.message).toBe("PayPal declined that way to pay. Try again with another one.");
    expect((await getCheckout(s.checkout.id)).status).toBe("failed");
    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(s.listing.id)).status).toBe("live");
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it("says nothing was charged on any other PayPal error", async () => {
    const s = await started();
    paypal.captureOrder.mockRejectedValue(new paypal.PayPalError("not approved", 422, "ORDER_NOT_APPROVED"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow(
      "PayPal couldn't take the payment. Nothing was charged.",
    );
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it("refuses a capture PayPal didn't complete", async () => {
    const s = await started();
    paypal.captureOrder.mockResolvedValue({ ...completedCapture, status: "DECLINED" });
    await expect(commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id })).rejects.toThrow("didn't take the payment");
    expect(await allOrders()).toHaveLength(0);
    expect((await getCheckout(s.checkout.id)).status).toBe("failed");
  });

  it("gives the money straight back when the capture went through but the order couldn't be written", async () => {
    const s = await started();
    // A fee too big for the column makes the order insert fail after the capture
    paypal.captureOrder.mockResolvedValue({ ...completedCapture, paypalFeeCents: 2 ** 40 });

    const error = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id }).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(CommerceError);
    expect(paypal.refundCapture).toHaveBeenCalledWith({
      captureId: "CAP-1",
      sellerMerchantId: "SELLER-MERCHANT",
      reason: expect.stringContaining("money back"),
    });
    expect(await allOrders()).toHaveLength(0);
    expect((await getListing(s.listing.id)).status).toBe("live");
    expect((await getCheckout(s.checkout.id)).status).toBe("failed");
  });

  it("still reports the original failure when the refund fails too", async () => {
    const s = await started();
    paypal.captureOrder.mockResolvedValue({ ...completedCapture, paypalFeeCents: 2 ** 40 });
    paypal.refundCapture.mockRejectedValue(new Error("PayPal is down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = await commerce.finishCheckout({ providerOrderId: "ORDER-1", viewerId: s.buyer.id }).catch((e) => e);
    expect(error.message).not.toContain("PayPal is down");
    expect(logged).toHaveBeenCalledWith("Refund after a failed order also failed", "CAP-1", expect.any(Error));
  });
});

describe("markShipped", () => {
  it("marks a paid order shipped with its tracking number", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);
    const updated = await commerce.markShipped({ sellerId: sale.seller.id, orderId: order.id, trackingNumber: "  1Z999  " });
    expect(updated.status).toBe("shipped");
    expect(updated.shippedAt).toBeInstanceOf(Date);
    expect(updated.trackingNumber).toBe("1Z999");
  });

  it("stores a blank tracking number as nothing", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);
    expect((await commerce.markShipped({ sellerId: sale.seller.id, orderId: order.id, trackingNumber: "  " })).trackingNumber).toBeNull();
  });

  it("only lets the seller ship it, and only once", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);
    await expect(commerce.markShipped({ sellerId: sale.buyer.id, orderId: order.id })).rejects.toThrow("isn't yours");
    await expect(commerce.markShipped({ sellerId: sale.seller.id, orderId: "nope" })).rejects.toThrow("isn't yours");
    await commerce.markShipped({ sellerId: sale.seller.id, orderId: order.id });
    await expect(commerce.markShipped({ sellerId: sale.seller.id, orderId: order.id })).rejects.toThrow("already shipped");
  });
});

describe("confirmReceived", () => {
  it("completes the order and releases the held money to the seller", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "shipped", shippedAt: daysAgo(2) });

    const result = await commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id });

    expect(result.status).toBe("completed");
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.deliveredAt).toBeInstanceOf(Date);
    expect(result.releasedAt).toBeInstanceOf(Date);
    expect(result.payoutRef).toBe("PAYOUT-1");
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "order.completed");
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "payout.sent");
  });

  it("keeps the delivery date it already had", async () => {
    const sale = await createSale();
    const deliveredAt = daysAgo(1);
    const order = await createOrder(sale, { status: "delivered", shippedAt: daysAgo(3), deliveredAt });
    const result = await commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id });
    expect(result.status).toBe("completed");
    expect(result.deliveredAt!.getTime()).toBe(deliveredAt.getTime());
    // A test checkout has no money to release
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
    expect(result.releasedAt).toBeNull();
  });

  it("closes a live problem the buyer reported, logs it, and then releases", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "shipped", shippedAt: daysAgo(2) });
    const [old] = await db.insert(dispute).values({ orderId: order.id, reason: "other", status: "closed" }).returning();
    const [live] = await db.insert(dispute).values({ orderId: order.id, reason: "damaged", status: "escalated", offerCents: 2000 }).returning();

    const result = await commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id });

    const [closed] = await db.select().from(dispute).where(eq(dispute.id, live!.id));
    expect(closed).toMatchObject({ status: "closed", offerCents: null });
    expect(closed!.resolvedAt).toBeInstanceOf(Date);
    const events = await db.select().from(disputeEvent);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ disputeId: live!.id, side: "buyer", authorId: sale.buyer.id, kind: "closed", body: "It's all good." });
    expect((await db.select().from(dispute).where(eq(dispute.id, old!.id)))[0]!.resolvedAt).toBeNull();
    expect(result.releasedAt).toBeInstanceOf(Date);
    expect(paypal.releaseToSeller).toHaveBeenCalledTimes(1);
  });

  it("still completes when PayPal won't release, leaving it for a retry", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "shipped", shippedAt: daysAgo(2) });
    paypal.releaseToSeller.mockRejectedValue(new paypal.PayPalError("nope", 422, "ACCOUNT_RESTRICTED"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id });
    expect(result.status).toBe("completed");
    expect(result.releasedAt).toBeNull();
    expect((await getOrder(order.id)).status).toBe("completed");
  });

  it("refuses someone else's order, one that hasn't shipped, and one that's wrapped up", async () => {
    const sale = await createSale();
    const order = await createOrder(sale);
    await expect(commerce.confirmReceived({ buyerId: sale.seller.id, orderId: order.id })).rejects.toThrow("isn't yours");
    await expect(commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id })).rejects.toThrow("hasn't shipped yet");
    for (const status of ["completed", "refunded", "cancelled"] as const) {
      await db.update(orders).set({ status }).where(eq(orders.id, order.id));
      await expect(commerce.confirmReceived({ buyerId: sale.buyer.id, orderId: order.id })).rejects.toThrow("already wrapped up");
    }
  });
});

describe("releaseOrder", () => {
  async function completed(overrides: Parameters<typeof createOrder>[1] = {}) {
    const sale = await createSale();
    return createOrder(sale, { paypal: true, status: "completed", completedAt: new Date(), ...overrides });
  }

  it("releases a completed PayPal order and records the payout", async () => {
    const order = await completed();
    const updated = await commerce.releaseOrder(order);
    expect(updated!.releasedAt).toBeInstanceOf(Date);
    expect(updated!.payoutRef).toBe("PAYOUT-1");
    expect(paypal.releaseToSeller).toHaveBeenCalledWith(order.paymentRef, 0);
    expect(webhooks.emitOrderEvent).toHaveBeenCalledWith(order.id, "payout.sent");
  });

  it("does nothing for a test checkout, one already released, or one not completed", async () => {
    const sale = await createSale();
    const mock = await createOrder(sale, { status: "completed" });
    expect(await commerce.releaseOrder(mock)).toBeNull();

    for (const order of [
      await completed({ releasedAt: new Date(), payoutRef: "OLD" }),
      await completed({ status: "shipped" }),
      await completed({ status: "refunded" }),
      await completed({ paymentRef: null }),
    ])
      expect(await commerce.releaseOrder(order)).toBeNull();
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();
  });

  it("holds the money while there's a live problem, but not for a finished one", async () => {
    const order = await completed();
    await db.insert(dispute).values({ orderId: order.id, reason: "damaged", status: "open" });
    expect(await commerce.releaseOrder(order)).toBeNull();
    expect(paypal.releaseToSeller).not.toHaveBeenCalled();

    await db.update(dispute).set({ status: "closed" }).where(eq(dispute.orderId, order.id));
    expect(await commerce.releaseOrder(order)).not.toBeNull();
  });

  it("returns null and leaves it unreleased when PayPal errors", async () => {
    const order = await completed();
    paypal.releaseToSeller.mockRejectedValue(new Error("timeout"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await commerce.releaseOrder(order)).toBeNull();
    expect((await getOrder(order.id)).releasedAt).toBeNull();
    expect(logged).toHaveBeenCalled();
    expect(webhooks.emitOrderEvent).not.toHaveBeenCalled();
  });
});

describe("reading", () => {
  it("finds the buyer's accepted, unexpired offer on a listing", async () => {
    const sale = await createSale();
    expect(await commerce.acceptedOfferFor(sale.buyer.id, sale.listing.id)).toBeNull();

    await createOffer(sale, { status: "open" });
    await createOffer(sale, { status: "accepted", respondedAt: daysAgo(3), expiresAt: new Date(Date.now() - 1000) });
    const other = await createUser();
    await createOffer({ ...sale, buyer: other }, { status: "accepted", respondedAt: new Date() });
    expect(await commerce.acceptedOfferFor(sale.buyer.id, sale.listing.id)).toBeNull();

    const good = await createOffer(sale, { status: "accepted", amountCents: 7000, respondedAt: daysAgo(1) });
    expect((await commerce.acceptedOfferFor(sale.buyer.id, sale.listing.id))?.id).toBe(good.id);
  });

  it("remembers the last address the buyer shipped to", async () => {
    const sale = await createSale();
    expect(await commerce.lastShipTo(sale.buyer.id)).toBeNull();
    await createOrder(sale, { createdAt: daysAgo(5), shipTo: { name: "Old", address: "1 Old Rd", country: "United States" } });
    const second = await createListing(sale.shop.id);
    const newer = { name: "New", address: "2 New Rd", country: "Canada" };
    await createOrder({ ...sale, listing: second }, { createdAt: daysAgo(1), shipTo: newer });
    expect(await commerce.lastShipTo(sale.buyer.id)).toEqual(newer);
  });

  it("lists a buyer's orders newest first, with the listing and shop", async () => {
    const sale = await createSale({ listing: { title: null, name: "Old coat" } });
    const older = await createOrder(sale, { createdAt: daysAgo(3) });
    const second = await createListing(sale.shop.id, { title: "New boots" });
    const newer = await createOrder({ ...sale, listing: second }, { createdAt: daysAgo(1) });
    // Someone else's order isn't in it
    const other = await createSale();
    await createOrder(other);

    const rows = await commerce.listBuyerOrders(sale.buyer.id);
    expect(rows.map((r) => r.order.id)).toEqual([newer.id, older.id]);
    expect(rows[0]!.listing).toMatchObject({ id: second.id, title: "New boots", status: "sold" });
    expect(rows[1]!.listing.title).toBe("Old coat");
    expect(rows[0]!.shop).toMatchObject({ id: sale.shop.id, slug: sale.shop.slug, name: sale.shop.name });
    expect(rows[0]!.photo).toBeNull();
  });

  it("lists a seller's orders across their shops, with the buyer", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(2) });
    const secondShop = await createShop(sale.seller.id);
    const l2 = await createListing(secondShop.id);
    const order2 = await createOrder({ buyer: sale.buyer, shop: secondShop, listing: l2 }, { createdAt: daysAgo(1) });
    const other = await createSale();
    await createOrder(other);

    const rows = await commerce.listSellerOrders(sale.seller.id);
    expect(rows.map((r) => r.order.id)).toEqual([order2.id, order.id]);
    expect(rows[0]!.buyer).toEqual({ id: sale.buyer.id, name: sale.buyer.name, email: sale.buyer.email });
    expect(await commerce.listSellerOrders(sale.buyer.id)).toEqual([]);
  });

  it("lists a buyer's offers newest first with their status as of now", async () => {
    const sale = await createSale();
    const lapsed = await createOffer(sale, { createdAt: daysAgo(3), expiresAt: new Date(Date.now() - 1000) });
    const live = await createOffer(sale, { createdAt: daysAgo(1), status: "countered", counterCents: 9000 });

    const rows = await commerce.listBuyerOffers(sale.buyer.id);
    expect(rows.map((r) => [r.offer.id, r.status])).toEqual([
      [live.id, "countered"],
      [lapsed.id, "expired"],
    ]);
    expect(rows[0]!.offer.status).toBe("countered");
    expect(rows[1]!.offer.status).toBe("open");
    expect(rows[0]!.listing.id).toBe(sale.listing.id);
  });

  it("lists offers on a seller's listings, optionally one listing, with the buyer", async () => {
    const sale = await createSale();
    const second = await createListing(sale.shop.id);
    const a = await createOffer(sale, { createdAt: daysAgo(2) });
    const b = await createOffer({ ...sale, listing: second }, { createdAt: daysAgo(1), expiresAt: new Date(Date.now() - 1000) });
    const other = await createSale();
    await createOffer(other);

    const all = await commerce.listSellerOffers(sale.seller.id);
    expect(all.map((r) => [r.offer.id, r.status])).toEqual([
      [b.id, "expired"],
      [a.id, "open"],
    ]);
    expect(all[0]!.buyer).toMatchObject({ id: sale.buyer.id, email: sale.buyer.email });

    const one = await commerce.listSellerOffers(sale.seller.id, { listingId: sale.listing.id });
    expect(one.map((r) => r.offer.id)).toEqual([a.id]);
    expect(await commerce.listSellerOffers(sale.buyer.id)).toEqual([]);
  });
});

describe("paused shops", () => {
  it("can't be bought from, even with a direct checkout", async () => {
    const sale = await createSale();
    await db.update(shop).set({ paused: true }).where(eq(shop.id, sale.shop.id));
    await expect(commerce.placeOrder({ buyerId: sale.buyer.id, listingId: sale.listing.id, delivery: "tracked", payMethod: "paypal", shipTo })).rejects.toThrow(
      /taking a break/,
    );
  });
});
