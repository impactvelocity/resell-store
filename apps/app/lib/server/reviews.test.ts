import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, review } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createOrder, createSale, createShop, createUser, daysAgo } from "../../test/factories";
import { CommerceError } from "./commerce";

/*
 * Reviews (reviews.ts) against the test database: who may leave one and when,
 * one per order, editing for 30 days, the seller's reply, moderation, and the
 * public reads (ratings, pages, first names only). Webhook delivery is a spy.
 */

vi.mock("./api/webhooks", async (orig) => ({
  ...(await orig<typeof import("./api/webhooks")>()),
  emitReviewEvent: vi.fn(),
}));

const webhooks = await import("./api/webhooks");
const reviews = await import("./reviews");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

/** A completed order, ready to review. */
async function doneSale(overrides: Parameters<typeof createOrder>[1] = {}) {
  const sale = await createSale();
  const order = await createOrder(sale, { status: "completed", completedAt: new Date(), ...overrides });
  return { ...sale, order };
}

/** Another completed order on the same shop, from a new buyer. */
async function anotherOrder(sale: Awaited<ReturnType<typeof doneSale>>, buyerName = "Sam Second") {
  const buyer = await createUser({ name: buyerName });
  const l = await createListing(sale.shop.id);
  const order = await createOrder({ buyer, shop: sale.shop, listing: l }, { status: "completed", completedAt: new Date() });
  return { buyer, listing: l, order };
}

describe("leaveReview", () => {
  it("saves the buyer's stars and words on a completed order, and tells the seller's server", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5, body: "  Lovely, thank you!  " });
    expect(r).toMatchObject({
      orderId: s.order.id,
      listingId: s.listing.id,
      shopId: s.shop.id,
      buyerId: s.buyer.id,
      rating: 5,
      body: "Lovely, thank you!",
      public: true,
      sellerReply: null,
      hiddenAt: null,
    });
    expect(webhooks.emitReviewEvent).toHaveBeenCalledWith(r.id);
  });

  it("can be private, and the words are optional", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 3, body: "   ", public: false });
    expect(r).toMatchObject({ rating: 3, body: null, public: false });
  });

  it("only lets the order's buyer review it", async () => {
    const s = await doneSale();
    await expect(reviews.leaveReview({ buyerId: s.seller.id, orderId: s.order.id, rating: 5 })).rejects.toThrow(CommerceError);
    await expect(reviews.leaveReview({ buyerId: s.buyer.id, orderId: "nope", rating: 5 })).rejects.toThrow(CommerceError);
    expect(await db.select().from(review)).toHaveLength(0);
  });

  it.each(["paid", "shipped", "delivered", "refunded", "cancelled"] as const)("waits until the order is done (%s)", async (status) => {
    const s = await doneSale({ status, completedAt: null });
    await expect(reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 4 })).rejects.toThrow(/all done/);
  });

  it("allows one review per order, with a friendly message the second time", async () => {
    const s = await doneSale();
    await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await expect(reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 1 })).rejects.toThrow(
      "You've already reviewed this order. You can edit that review instead.",
    );
    const rows = await db.select().from(review);
    expect(rows.map((r) => r.rating)).toEqual([5]);
    expect(webhooks.emitReviewEvent).toHaveBeenCalledTimes(1);
  });

  it("holds the second of two reviews sent at once to one", async () => {
    const s = await doneSale();
    const results = await Promise.allSettled([
      reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 }),
      reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 4 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(review)).toHaveLength(1);
  });

  it.each([0, 6, 4.5, Number.NaN])("wants a whole number of stars from 1 to 5 (%s)", async (rating) => {
    const s = await doneSale();
    await expect(reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating })).rejects.toThrow("Pick from 1 to 5 stars.");
  });

  it("keeps the words to 1000 characters", async () => {
    const s = await doneSale();
    await expect(
      reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5, body: "a".repeat(1001) }),
    ).rejects.toThrow(/under 1000 characters/);
    const ok = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5, body: "a".repeat(1000) });
    expect(ok.body).toHaveLength(1000);
  });
});

describe("editReview", () => {
  it("lets the buyer change the stars, the words and who sees it", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 2, body: "Slow" });
    const edited = await reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, rating: 4, body: "Slow, but lovely", public: false });
    expect(edited).toMatchObject({ rating: 4, body: "Slow, but lovely", public: false });
    // Leaving a field out keeps it
    const again = await reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, public: true });
    expect(again).toMatchObject({ rating: 4, body: "Slow, but lovely", public: true });
    // Clearing the words
    expect((await reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, body: "" })).body).toBeNull();
  });

  it("is only for the buyer who wrote it", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await expect(reviews.editReview({ buyerId: s.seller.id, reviewId: r.id, rating: 1 })).rejects.toThrow(CommerceError);
  });

  it("stops after 30 days", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await db.update(review).set({ createdAt: daysAgo(31) }).where(eq(review.id, r.id));
    await expect(reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, rating: 1 })).rejects.toThrow(/30 days/);
    await db.update(review).set({ createdAt: daysAgo(29) }).where(eq(review.id, r.id));
    expect((await reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, rating: 1 })).rating).toBe(1);
  });

  it("checks the new stars and words like a new review", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await expect(reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, rating: 9 })).rejects.toThrow(/1 to 5/);
    await expect(reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, body: "x".repeat(1001) })).rejects.toThrow(/1000/);
  });

  it("can't touch a review resell.store took down", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 1, body: "rude words" });
    await reviews.hideReview(r.id);
    await expect(reviews.editReview({ buyerId: s.buyer.id, reviewId: r.id, body: "sorry" })).rejects.toThrow(/took this review down/);
  });
});

describe("replyToReview", () => {
  it("lets the shop's owner reply, and change the reply", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    const replied = await reviews.replyToReview({ sellerId: s.seller.id, reviewId: r.id, body: " Thank you! " });
    expect(replied.sellerReply).toBe("Thank you!");
    expect(replied.repliedAt).toBeInstanceOf(Date);
    const changed = await reviews.replyToReview({ sellerId: s.seller.id, reviewId: r.id, body: "Thank you so much!" });
    expect(changed.sellerReply).toBe("Thank you so much!");
    // Still the one reply, from when it was first sent
    expect(changed.repliedAt!.getTime()).toBe(replied.repliedAt!.getTime());
  });

  it("is only for the shop's owner", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await expect(reviews.replyToReview({ sellerId: s.buyer.id, reviewId: r.id, body: "Me again" })).rejects.toThrow(CommerceError);
    const otherSeller = await createUser();
    await createShop(otherSeller.id);
    await expect(reviews.replyToReview({ sellerId: otherSeller.id, reviewId: r.id, body: "Hi" })).rejects.toThrow(CommerceError);
  });

  it("needs words, up to 1000 characters", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await expect(reviews.replyToReview({ sellerId: s.seller.id, reviewId: r.id, body: "  " })).rejects.toThrow(/few words/);
    await expect(reviews.replyToReview({ sellerId: s.seller.id, reviewId: r.id, body: "x".repeat(1001) })).rejects.toThrow(/1000/);
  });
});

describe("reading", () => {
  it("averages a shop's public, shown reviews to one decimal", async () => {
    const s = await doneSale();
    const b = await anotherOrder(s);
    const c = await anotherOrder(s, "Cleo Third");
    const d = await anotherOrder(s, "Dan Fourth");
    await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    await reviews.leaveReview({ buyerId: b.buyer.id, orderId: b.order.id, rating: 4 });
    await reviews.leaveReview({ buyerId: c.buyer.id, orderId: c.order.id, rating: 4 });
    // Private and taken down: neither counts
    await reviews.leaveReview({ buyerId: d.buyer.id, orderId: d.order.id, rating: 1, public: false });
    expect(await reviews.shopRating(s.shop.id)).toEqual({ average: 4.3, count: 3 });
    expect((await reviews.shopRatingBreakdown(s.shop.id)).stars).toEqual({ 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 });

    const [first] = await db.select().from(review).where(eq(review.orderId, s.order.id));
    await reviews.hideReview(first!.id);
    expect(await reviews.shopRating(s.shop.id)).toEqual({ average: 4, count: 2 });
  });

  it("says 0 of 0 for a shop with no reviews", async () => {
    const s = await createSale();
    expect(await reviews.shopRating(s.shop.id)).toEqual({ average: 0, count: 0 });
  });

  it("batches ratings for store cards", async () => {
    const one = await doneSale();
    const two = await doneSale();
    const quiet = await createSale();
    await reviews.leaveReview({ buyerId: one.buyer.id, orderId: one.order.id, rating: 5 });
    await reviews.leaveReview({ buyerId: two.buyer.id, orderId: two.order.id, rating: 2 });
    const map = await reviews.shopRatings([one.shop.id, two.shop.id, quiet.shop.id]);
    expect(map.get(one.shop.id)).toEqual({ average: 5, count: 1 });
    expect(map.get(two.shop.id)).toEqual({ average: 2, count: 1 });
    expect(map.has(quiet.shop.id)).toBe(false);
    expect((await reviews.shopRatings([])).size).toBe(0);
  });

  it("lists public reviews newest first, by first name only, with the seller's reply", async () => {
    const s = await doneSale();
    const b = await anotherOrder(s, "Priya Shah");
    const older = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 4, body: "Good" });
    await db.update(review).set({ createdAt: daysAgo(2) }).where(eq(review.id, older.id));
    const newer = await reviews.leaveReview({ buyerId: b.buyer.id, orderId: b.order.id, rating: 5, body: "Great" });
    await reviews.replyToReview({ sellerId: s.seller.id, reviewId: newer.id, body: "Thanks Priya" });

    const { reviews: list, nextCursor } = await reviews.publicReviews({ shopId: s.shop.id, limit: 10 });
    expect(nextCursor).toBeNull();
    expect(list.map((r) => r.id)).toEqual([newer.id, older.id]);
    expect(list[0]).toMatchObject({
      rating: 5,
      body: "Great",
      buyer: "Priya",
      listing: { id: b.listing.id, title: b.listing.title },
      shop: { slug: s.shop.slug },
      reply: { body: "Thanks Priya" },
    });
    expect(list[1]!.buyer).toBe("Jess");
    // Nothing that could name them more than that
    const text = JSON.stringify(list);
    expect(text).not.toContain("Shah");
    expect(text).not.toContain("@test.dev");
  });

  it("leaves out private and taken-down reviews, and never guesses a name from an email", async () => {
    const s = await doneSale();
    const b = await anotherOrder(s);
    const c = await anotherOrder(s);
    const nameless = await createUser({ name: "", email: "secret.person@test.dev" });
    const l = await createListing(s.shop.id);
    const o = await createOrder({ buyer: nameless, shop: s.shop, listing: l }, { status: "completed" });
    await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5, public: false });
    const hidden = await reviews.leaveReview({ buyerId: b.buyer.id, orderId: b.order.id, rating: 1 });
    await reviews.hideReview(hidden.id);
    await reviews.leaveReview({ buyerId: c.buyer.id, orderId: c.order.id, rating: 4 });
    await reviews.leaveReview({ buyerId: nameless.id, orderId: o.id, rating: 3 });

    const { reviews: list } = await reviews.publicReviews({ shopId: s.shop.id });
    expect(list.map((r) => r.rating).sort()).toEqual([3, 4]);
    expect(list.find((r) => r.rating === 3)!.buyer).toBe("A buyer");
    expect(JSON.stringify(list)).not.toContain("secret");
  });

  it("pages with a cursor, and filters by stars and listing", async () => {
    const s = await doneSale();
    const ids: string[] = [];
    const first = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    ids.push(first.id);
    for (let i = 0; i < 4; i++) {
      const o = await anotherOrder(s, `Buyer${i} Person`);
      const r = await reviews.leaveReview({ buyerId: o.buyer.id, orderId: o.order.id, rating: i % 2 ? 5 : 3 });
      ids.push(r.id);
    }
    // All in the same instant: the id breaks the tie, so nothing is skipped or repeated
    await db.update(review).set({ createdAt: new Date("2026-10-01T12:00:00Z") });

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof reviews.publicReviews>> = await reviews.publicReviews({ shopId: s.shop.id, limit: 2, cursor });
      expect(page.reviews.length).toBeLessThanOrEqual(2);
      seen.push(...page.reviews.map((r) => r.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen.sort()).toEqual([...ids].sort());
    expect(new Set(seen).size).toBe(5);

    const threes = await reviews.publicReviews({ shopId: s.shop.id, rating: 3 });
    expect(threes.reviews.every((r) => r.rating === 3)).toBe(true);
    expect(threes.reviews).toHaveLength(2);

    const one = await reviews.publicReviews({ listingId: s.listing.id });
    expect(one.reviews.map((r) => r.id)).toEqual([first.id]);
  });

  it("gives the seller every review on their shops, private and hidden ones too", async () => {
    const s = await doneSale();
    const b = await anotherOrder(s);
    const other = await doneSale();
    const priv = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 2, public: false });
    const hidden = await reviews.leaveReview({ buyerId: b.buyer.id, orderId: b.order.id, rating: 1 });
    await reviews.hideReview(hidden.id);
    await reviews.leaveReview({ buyerId: other.buyer.id, orderId: other.order.id, rating: 5 });

    const mine = await reviews.sellerReviews(s.seller.id);
    expect(mine.map((r) => r.id).sort()).toEqual([priv.id, hidden.id].sort());
    expect(mine.find((r) => r.id === priv.id)).toMatchObject({ public: false, orderId: s.order.id, hiddenAt: null });
    expect(mine.find((r) => r.id === hidden.id)!.hiddenAt).toBeInstanceOf(Date);
  });

  it("finds the review on an order, and which orders have one", async () => {
    const s = await doneSale();
    const b = await anotherOrder(s);
    expect(await reviews.reviewForOrder(s.order.id)).toBeNull();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 5 });
    expect((await reviews.reviewForOrder(s.order.id))!.id).toBe(r.id);
    expect(await reviews.reviewedOrderIds([s.order.id, b.order.id])).toEqual(new Set([s.order.id]));
  });

  it("shapes a review for the order pages, with how long it can be edited", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 4, body: "Nice" });
    const now = new Date(r.createdAt.getTime() + 2 * 86_400_000);
    const view = reviews.toOrderReview(r, now);
    expect(view).toMatchObject({ rating: 4, body: "Nice", public: true, hidden: false, canEdit: true, reply: null });
    expect(reviews.toOrderReview(r, new Date(r.createdAt.getTime() + 31 * 86_400_000)).canEdit).toBe(false);
  });
});

describe("hideReview", () => {
  it("takes a review down once and keeps it for the record", async () => {
    const s = await doneSale();
    const r = await reviews.leaveReview({ buyerId: s.buyer.id, orderId: s.order.id, rating: 1 });
    const first = await reviews.hideReview(r.id);
    expect(first!.hiddenAt).toBeInstanceOf(Date);
    const again = await reviews.hideReview(r.id);
    expect(again!.hiddenAt!.getTime()).toBe(first!.hiddenAt!.getTime());
    expect(await db.select().from(review)).toHaveLength(1);
    expect(await reviews.hideReview("missing")).toBeNull();
  });
});
