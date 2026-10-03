import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../test/db";
import { createListing, createOffer, createOrder, createShop, createUser, daysAgo } from "../../test/factories";
import { createActivity, createFollow, createLike } from "../../test/factories-market";
import { listingStats, PERIODS, sellerStats, shopMiniStats } from "./stats";

/*
 * Stats (B4) and the mini stats on a shop and a listing: views, shares,
 * likes, followers, offers and sales per period against the period before,
 * only for the seller's own shops, with refunded and cancelled orders left
 * out of money and counts.
 */

beforeEach(async () => {
  await resetDb();
});

async function world() {
  const seller = await createUser({ name: "Maya" });
  const buyer = await createUser({ name: "Jess" });
  const a = await createShop(seller.id, { slug: "a" });
  const b = await createShop(seller.id, { slug: "b" });
  const theirs = await createShop((await createUser()).id, { slug: "theirs" });
  const popular = await createListing(a.id, { title: "Popular lamp" });
  const quiet = await createListing(a.id, { title: "Quiet chair" });
  return { seller, buyer, a, b, theirs, popular, quiet };
}

/** A sold listing in `shopId` with an order `ago` days back, published `listedFor` days before that. */
async function sale(
  w: Awaited<ReturnType<typeof world>>,
  shopId: string,
  ago: number,
  listedFor: number,
  order: Parameters<typeof createOrder>[1] = {},
) {
  const l = await createListing(shopId, { publishedAt: daysAgo(ago + listedFor) });
  return createOrder({ buyer: w.buyer, shop: { id: shopId }, listing: l }, { createdAt: daysAgo(ago), ...order });
}

describe("sellerStats", () => {
  it("has every period", async () => {
    const w = await world();
    expect(Object.keys(await sellerStats(w.seller.id))).toEqual(PERIODS);
  });

  it("counts views against the period before, for the seller's shops only", async () => {
    const w = await world();
    for (let i = 0; i < 3; i++) await createActivity({ shopId: w.a.id, listingId: w.popular.id, createdAt: daysAgo(2) });
    await createActivity({ shopId: w.b.id, createdAt: daysAgo(10) });
    await createActivity({ shopId: w.a.id, createdAt: daysAgo(100) });
    await createActivity({ shopId: w.theirs.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, kind: "share", createdAt: daysAgo(1) });

    const stats = await sellerStats(w.seller.id);
    const tile = (p: (typeof PERIODS)[number], label: string) => stats[p].tiles.find((t) => t.label === label)!;
    expect(tile("7d", "Views")).toEqual({ label: "Views", value: "3", note: "2 more than before" });
    expect(tile("30d", "Views")).toEqual({ label: "Views", value: "4", note: "4 more than before" });
    expect(tile("90d", "Views").note).toBe("3 more than before");
    expect(tile("7d", "Shares")).toEqual({ label: "Shares", value: "1", note: "1 more than before" });
  });

  it("narrows to one shop by slug", async () => {
    const w = await world();
    await createActivity({ shopId: w.a.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.b.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.b.id, createdAt: daysAgo(1) });
    const views = async (slug?: string) => (await sellerStats(w.seller.id, slug))["7d"].tiles[0]!.value;
    expect(await views()).toBe("3");
    expect(await views("all")).toBe("3");
    expect(await views("b")).toBe("2");
    expect(await views("theirs")).toBe("0");
  });

  it("is all zeroes for someone with no shops", async () => {
    const nobody = await createUser();
    const stats = await sellerStats(nobody.id);
    expect(stats["30d"]).toMatchObject({ made: 0, change: 0, thingsSold: 0, averageSale: 0, daysToSell: 0, sources: [], mostLooked: [] });
    expect(stats["30d"].tiles[0]).toEqual({ label: "Views", value: "0", note: "None yet" });
  });

  it("adds up what the seller made after fees, leaving out refunded and cancelled orders", async () => {
    const w = await world();
    await sale(w, w.a.id, 1, 4, { sellerNetCents: 9_000 });
    await sale(w, w.a.id, 3, 2, { status: "completed", totalCents: 5_000 }); // no fee figures: the total counts
    await sale(w, w.a.id, 2, 1, { status: "refunded", totalCents: 50_000 });
    await sale(w, w.a.id, 2, 1, { status: "cancelled", totalCents: 50_000 });
    await sale(w, w.a.id, 10, 1, { sellerNetCents: 3_000 }); // the week before
    await sale(w, w.theirs.id, 1, 1, { sellerNetCents: 99_900 }); // someone else's shop

    const week = (await sellerStats(w.seller.id))["7d"];
    expect(week).toMatchObject({ made: 140, change: 110, thingsSold: 2, averageSale: 70, daysToSell: 4 });
    expect(week.tiles.find((t) => t.label === "Sold")).toEqual({ label: "Sold", value: "2", note: "1 more than before" });
    expect(week.weeks).toHaveLength(7);
    expect(week.weeks.reduce((sum, b) => sum + b.value, 0)).toBe(140);
    expect(week.chartTitle).toBe("Earned each day");

    const month = (await sellerStats(w.seller.id))["30d"];
    expect(month).toMatchObject({ made: 170, thingsSold: 3 });
    expect(month.weeks).toHaveLength(5);
  });

  it("charts the year by month so far", async () => {
    const w = await world();
    const stats = await sellerStats(w.seller.id);
    expect(stats.year.weeks).toHaveLength(new Date().getMonth() + 1);
    expect(stats.year.weeks[0]!.label).toBe("Jan");
    expect(stats.year.chartTitle).toBe("Earned each month");
    expect(stats["90d"].weeks).toHaveLength(6);
  });

  it("says a day to sell at minimum when something sold the same day it was listed", async () => {
    const w = await world();
    await sale(w, w.a.id, 1, 0.1);
    expect((await sellerStats(w.seller.id))["7d"].daysToSell).toBe(1);
  });

  it("splits views by where they came from", async () => {
    const w = await world();
    await createActivity({ shopId: w.a.id, source: "search", createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, source: "search", createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, source: "social", createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, source: "qr", createdAt: daysAgo(20) });
    const stats = await sellerStats(w.seller.id);
    expect(stats["7d"].sources).toEqual([
      { label: "Search", percent: 67 },
      { label: "Social", percent: 33 },
    ]);
    expect(stats["30d"].sources).toContainEqual({ label: "QR code", percent: 25 });
  });

  it("lists the most looked-at listings with their likes and offers waiting", async () => {
    const w = await world();
    for (let i = 0; i < 2; i++) await createActivity({ shopId: w.a.id, listingId: w.popular.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, listingId: w.quiet.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, listingId: w.quiet.id, createdAt: daysAgo(20) });
    await createActivity({ shopId: w.a.id, listingId: w.quiet.id, createdAt: daysAgo(20) });
    await createLike(w.buyer.id, w.popular.id);
    await createLike((await createUser()).id, w.popular.id);
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular });
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular }, { status: "declined" });

    const stats = await sellerStats(w.seller.id);
    expect(stats["7d"].mostLooked).toEqual([
      { title: "Popular lamp", note: "2 likes, 1 offer waiting", views: 2, href: `/listings/${w.popular.id}` },
      { title: "Quiet chair", note: "0 likes, no offers waiting", views: 1, href: `/listings/${w.quiet.id}` },
    ]);
    expect(stats["30d"].mostLooked.map((m) => m.title)).toEqual(["Quiet chair", "Popular lamp"]);
  });

  it("shows likes, followers and offers", async () => {
    const w = await world();
    await createLike(w.buyer.id, w.popular.id);
    await createLike(w.buyer.id, w.quiet.id, daysAgo(40));
    await createFollow(w.buyer.id, w.a.id);
    await createFollow((await createUser()).id, w.b.id, daysAgo(40));
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular });
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.quiet }, { status: "paid" });

    const tiles = (await sellerStats(w.seller.id))["7d"].tiles;
    expect(tiles.find((t) => t.label === "Likes")).toEqual({ label: "Likes", value: "1", note: "2 saved right now" });
    expect(tiles.find((t) => t.label === "Shop followers")).toEqual({ label: "Shop followers", value: "2", note: "1 new" });
    expect(tiles.find((t) => t.label === "Offers")).toEqual({ label: "Offers", value: "2", note: "1 turned into sales" });
  });
});

describe("listingStats", () => {
  it("counts views (all time and this week), likes, shares and offers per listing", async () => {
    const w = await world();
    await createActivity({ shopId: w.a.id, listingId: w.popular.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, listingId: w.popular.id, createdAt: daysAgo(10) });
    await createActivity({ shopId: w.a.id, listingId: w.popular.id, kind: "share" });
    await createLike(w.buyer.id, w.popular.id);
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular });
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular }, { expiresAt: daysAgo(1) }); // lapsed: not waiting
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular }, { status: "countered" });

    const stats = await listingStats([w.popular.id, w.quiet.id]);
    expect(stats.get(w.popular.id)).toEqual({ views: 2, views7d: 1, likes: 1, shares: 1, offers: 3, offersWaiting: 1 });
    expect(stats.get(w.quiet.id)).toEqual({ views: 0, views7d: 0, likes: 0, shares: 0, offers: 0, offersWaiting: 0 });
    expect((await listingStats([])).size).toBe(0);
  });
});

describe("shopMiniStats", () => {
  it("sums the week's takings without refunded or cancelled orders", async () => {
    const w = await world();
    await sale(w, w.a.id, 1, 1, { sellerNetCents: 9_000 });
    await sale(w, w.a.id, 2, 1, { totalCents: 4_000 });
    await sale(w, w.a.id, 1, 1, { status: "refunded", sellerNetCents: 50_000 });
    await sale(w, w.a.id, 1, 1, { status: "cancelled", sellerNetCents: 50_000 });
    await sale(w, w.a.id, 9, 1, { sellerNetCents: 7_000 }); // last week
    await sale(w, w.b.id, 1, 1, { sellerNetCents: 1_000 }); // another shop

    expect((await shopMiniStats(w.a.id)).madeWeekCents).toBe(13_000);
  });

  it("counts views, shares, followers, likes and open offers for one shop", async () => {
    const w = await world();
    await createActivity({ shopId: w.a.id, createdAt: daysAgo(1) });
    await createActivity({ shopId: w.a.id, listingId: w.popular.id, createdAt: daysAgo(8) });
    await createActivity({ shopId: w.a.id, kind: "share" });
    await createActivity({ shopId: w.b.id });
    await createFollow(w.buyer.id, w.a.id);
    await createLike(w.buyer.id, w.popular.id);
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.popular });
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.quiet }, { expiresAt: daysAgo(1) });
    await createOffer({ buyer: w.buyer, shop: w.a, listing: w.quiet }, { status: "accepted" });

    expect(await shopMiniStats(w.a.id)).toEqual({
      views: 2,
      views7d: 1,
      shares: 1,
      followers: 1,
      likes: 1,
      offersWaiting: 1,
      madeWeekCents: 0,
    });
  });
});
