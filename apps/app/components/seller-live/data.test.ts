import { describe, expect, it } from "vitest";
import {
  ago,
  left,
  offerTimeline,
  payoutTotals,
  personName,
  soldOn,
  toSellerOffer,
  toSellerOrder,
  type SellerOrder,
} from "./data";

/*
 * The seller's offers and sales as the client sees them: relative times,
 * the agent's floor price, "closed when it sold", payout totals and the
 * negotiation timeline. Pure functions over hand-built rows.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();

type OfferRow = Parameters<typeof toSellerOffer>[0];
type OrderRow = Parameters<typeof toSellerOrder>[0];

function offerRow(over: Partial<OfferRow["offer"]> = {}, rest: Partial<Omit<OfferRow, "offer">> = {}): OfferRow {
  const createdAt = new Date(now - 2 * HOUR);
  const o = {
    id: "offer_1",
    listingId: "listing_1",
    shopId: "shop_1",
    buyerId: "buyer_1",
    amountCents: 8_000,
    counterCents: null,
    counteredBy: null,
    agentNote: null,
    note: null,
    depositCents: null,
    status: "open",
    expiresAt: new Date(now + 47.5 * HOUR),
    respondedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...over,
  } as OfferRow["offer"];
  return {
    offer: o,
    listing: { id: "listing_1", title: "Yellow dutch oven", slug: "yellow-dutch-oven", priceCents: 10_000, lowestCents: null, status: "live" },
    shop: { id: "shop_1", slug: "maya", name: "Maya's Things", tone: "lemon" },
    buyer: { id: "buyer_1", name: "Jess Buyer", email: "jess@test.dev" },
    photo: null,
    status: o.status,
    ...rest,
  } as OfferRow;
}

function orderRow(over: Partial<OrderRow["order"]> = {}): OrderRow {
  return {
    order: {
      id: "order_1",
      listingId: "listing_1",
      shopId: "shop_1",
      buyerId: "buyer_1",
      offerId: null,
      itemCents: 10_000,
      shippingCents: 900,
      totalCents: 10_900,
      delivery: "tracked",
      payMethod: "paypal",
      shipTo: { name: "Jess", address: "12 Elm St", country: "United States" },
      status: "paid",
      paymentProvider: "mock",
      paymentRef: null,
      payeeMerchantId: null,
      platformFeeCents: null,
      paypalFeeCents: null,
      sellerNetCents: null,
      releasedAt: null,
      payoutRef: null,
      refundedCents: 0,
      refundRef: null,
      refundedAt: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      ...over,
    } as OrderRow["order"],
    listing: { id: "listing_1", title: "Yellow dutch oven", slug: "yellow-dutch-oven", priceCents: 10_000, lowestCents: null, status: "sold" },
    shop: { id: "shop_1", slug: "maya", name: "Maya's Things", tone: "lemon" },
    buyer: { id: "buyer_1", name: "Jess Buyer", email: "jess@test.dev" },
    photo: "/api/files/abc",
  } as OrderRow;
}

describe("ago", () => {
  it("reads as just now, minutes, hours, then days", () => {
    expect(ago(new Date(now - 30_000), now)).toBe("just now");
    expect(ago(new Date(now - MIN), now)).toBe("1 minute ago");
    expect(ago(new Date(now - 5 * MIN), now)).toBe("5 minutes ago");
    expect(ago(new Date(now - HOUR), now)).toBe("1 hour ago");
    expect(ago(new Date(now - 23 * HOUR), now)).toBe("23 hours ago");
    expect(ago(new Date(now - 2 * DAY), now)).toBe("2 days ago");
  });
});

describe("left", () => {
  it("is null once the time has passed", () => {
    expect(left(new Date(now - 1), now)).toBeNull();
    expect(left(new Date(now), now)).toBeNull();
  });

  it("counts minutes under an hour (never zero) and whole hours after", () => {
    expect(left(new Date(now + 20_000), now)).toBe("1 minute left");
    expect(left(new Date(now + 20 * MIN), now)).toBe("20 minutes left");
    expect(left(new Date(now + 47.5 * HOUR), now)).toBe("47 hours left");
    expect(left(new Date(now + HOUR), now)).toBe("1 hour left");
  });
});

describe("soldOn", () => {
  const today = new Date(2026, 9, 3, 1, 0);

  it("says today, yesterday, or the date", () => {
    expect(soldOn(new Date(2026, 9, 3, 0, 5), today)).toBe("Sold today");
    expect(soldOn(new Date(2026, 9, 2, 23, 59), today)).toBe("Sold yesterday");
    expect(soldOn(new Date(2026, 9, 1, 12, 0), today)).toBe("Sold 1 Oct");
  });

  it("treats a time later than now as today", () => {
    expect(soldOn(new Date(2026, 9, 3, 20, 0), today)).toBe("Sold today");
  });
});

describe("personName", () => {
  it("uses the name, or the email's first part when there isn't one", () => {
    expect(personName({ name: "Jess Buyer", email: "j@test.dev" })).toEqual({ name: "Jess Buyer", firstName: "Jess", initial: "J" });
    expect(personName({ name: "  ", email: "sam@test.dev" })).toEqual({ name: "sam", firstName: "sam", initial: "S" });
  });
});

describe("toSellerOffer", () => {
  it("shapes an open offer with time left and the shop's floor price", () => {
    const o = toSellerOffer(offerRow(), 15);
    expect(o).toMatchObject({
      id: "offer_1",
      status: "open",
      amountCents: 8_000,
      askingCents: 10_000,
      lowestCents: 8_500,
      buyer: { firstName: "Jess", initial: "J" },
      listing: { href: "/listings/listing_1", title: "Yellow dutch oven" },
      when: "2 hours ago",
      timeLeft: "47 hours left",
      closedBySale: false,
    });
  });

  it("prefers the listing's own floor and rounds the shop's % to whole dollars", () => {
    const own = offerRow({}, { listing: { id: "l", title: "t", slug: null, priceCents: 10_000, lowestCents: 7_250, status: "live" } });
    expect(toSellerOffer(own, 15).lowestCents).toBe(7_250);
    const odd = offerRow({}, { listing: { id: "l", title: "t", slug: null, priceCents: 9_999, lowestCents: null, status: "live" } });
    expect(toSellerOffer(odd, 15).lowestCents).toBe(8_500);
    expect(toSellerOffer(offerRow()).lowestCents).toBeNull();
  });

  it("has no time left once the offer is finished", () => {
    const row = offerRow({ status: "declined", respondedAt: new Date() });
    expect(toSellerOffer(row).timeLeft).toBeNull();
  });

  it("marks a decline as closed by the sale when it happened with someone else's order", () => {
    const soldAt = new Date(now - HOUR);
    const declined = offerRow({ status: "declined", respondedAt: new Date(soldAt.getTime() + 300) });
    expect(toSellerOffer(declined, 15, { offerId: "other", createdAt: soldAt }).closedBySale).toBe(true);
    // The seller said no long before the sale
    const early = offerRow({ status: "declined", respondedAt: new Date(soldAt.getTime() - 10 * MIN) });
    expect(toSellerOffer(early, 15, { offerId: "other", createdAt: soldAt }).closedBySale).toBe(false);
    // This offer is the one that was paid
    expect(toSellerOffer(declined, 15, { offerId: "offer_1", createdAt: soldAt }).closedBySale).toBe(false);
  });
});

describe("toSellerOrder", () => {
  it("shows a test checkout as paid through test, the seller getting the whole total", () => {
    const o = toSellerOrder(orderRow());
    expect(o).toMatchObject({ paidThrough: "test", youGetCents: 10_900, soldOn: "Sold today", buyer: { name: "Jess Buyer" }, releasedAt: null });
  });

  it("shows a PayPal order with what the seller nets after fees", () => {
    const released = new Date(now - DAY);
    const o = toSellerOrder(orderRow({ paymentProvider: "paypal", sellerNetCents: 9_471, releasedAt: released }));
    expect(o.paidThrough).toBe("paypal");
    expect(o.youGetCents).toBe(9_471);
    expect(o.releasedAt).toBe(released.toISOString());
  });
});

describe("payoutTotals", () => {
  const order = (over: Partial<OrderRow["order"]>): SellerOrder => toSellerOrder(orderRow(over));

  it("splits released from held, and leaves refunded and cancelled out", () => {
    const totals = payoutTotals([
      order({ paymentProvider: "paypal", sellerNetCents: 9_000, releasedAt: new Date() }), // released
      order({ paymentProvider: "paypal", sellerNetCents: 4_000, status: "completed" }), // completed but not released yet: held
      order({ status: "completed", totalCents: 2_000 }), // a completed test order counts as paid out
      order({ status: "shipped", totalCents: 3_000 }), // held
      order({ status: "refunded", totalCents: 50_000 }),
      order({ status: "cancelled", totalCents: 50_000 }),
    ]);
    expect(totals).toEqual({ releasedCents: 11_000, heldCents: 7_000, sales: 4 });
  });

  it("is all zero with no orders", () => {
    expect(payoutTotals([])).toEqual({ releasedCents: 0, heldCents: 0, sales: 0 });
  });
});

describe("offerTimeline", () => {
  it("tells an offer the agent countered and the buyer took, then paid", () => {
    const offer = toSellerOffer(
      offerRow({ status: "paid", note: "Would you take $80?", counterCents: 9_000, counteredBy: "agent", respondedAt: new Date(now - HOUR) }),
    );
    const order = toSellerOrder(orderRow({ totalCents: 9_900 }));
    const rows = offerTimeline(offer, order);
    expect(rows.map((r) => r.who)).toEqual(["buyer", "agent", "buyer", "buyer"]);
    expect(rows[0]!.text).toBe("Offered $80: “Would you take $80?”");
    expect(rows[1]!.text).toContain("Countered at $90 for you");
    expect(rows[2]!.text).toBe("Took your counter.");
    expect(rows[3]!.text).toContain("Paid $99 with shipping");
  });

  it("says it's waiting on payment after a plain accept", () => {
    const offer = toSellerOffer(offerRow({ status: "accepted", respondedAt: new Date(now - HOUR) }));
    const rows = offerTimeline(offer, null);
    expect(rows.map((r) => r.text)).toEqual(["Offered $80.", "Accepted.", "Hasn't paid yet, 47 hours left."]);
  });

  it("ends declined, withdrawn and expired offers in plain words", () => {
    const end = (over: Partial<OfferRow["offer"]>) => offerTimeline(toSellerOffer(offerRow(over)), null).at(-1)!.text;
    expect(end({ status: "declined", respondedAt: new Date() })).toBe("Said no.");
    expect(end({ status: "declined", counterCents: 9_500, respondedAt: new Date() })).toBe("Turned down your counter.");
    expect(end({ status: "withdrawn" })).toBe("Jess took the offer back.");
    expect(end({ status: "expired" })).toBe("Nobody answered in time, so it ran out.");
    expect(end({ status: "expired", counterCents: 9_500 })).toBe("Didn't answer in time, so it ran out.");
  });

  it("shows cents only when there are some", () => {
    const offer = toSellerOffer(offerRow({ amountCents: 8_050 }));
    expect(offerTimeline(offer, null)[0]!.text).toBe("Offered $80.50.");
  });
});
