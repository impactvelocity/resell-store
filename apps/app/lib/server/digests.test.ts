import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, eq, follow, message, offer, orders, review, thread, user } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createOffer, createOrder, createSale, createShop, createUser, daysAgo } from "../../test/factories";
import { clearEmails, emailsTo } from "../../test/mail";

/*
 * The roll-up emails (digests.ts): new listings from followed shops for
 * people who opted in, the seller's evening agent summary, and review
 * requests two days after an order's done. Each goes once.
 */

vi.mock("./api/webhooks", async (orig) => ({
  ...(await orig<typeof import("./api/webhooks")>()),
  emitOrderEvent: vi.fn(),
  emitOfferEvent: vi.fn(),
}));

const digests = await import("./digests");
const { claimNotice } = await import("./sweeps");

beforeEach(async () => {
  await resetDb();
  clearEmails();
});

const evening = new Date("2026-10-03T02:00:00Z");

describe("wants", () => {
  it("uses the settings screen's defaults for switches nobody has set", () => {
    expect(digests.wants(null, "follow")).toBe(false);
    expect(digests.wants(null, "agent")).toBe(true);
    expect(digests.wants({ follow: true }, "follow")).toBe(true);
    expect(digests.wants({ agent: false }, "agent")).toBe(false);
  });
});

describe("sendFollowDigests", () => {
  async function setup(prefs: Record<string, boolean> | null) {
    const fan = await createUser({ notifyPrefs: prefs });
    const seller = await createUser();
    const s = await createShop(seller.id, { name: "Maya's Closet" });
    await db.insert(follow).values({ userId: fan.id, shopId: s.id });
    return { fan, shop: s };
  }

  it("emails new listings from followed shops to people who turned it on, once", async () => {
    const { fan, shop } = await setup({ follow: true });
    await createListing(shop.id, { title: "Linen dress", publishedAt: new Date(Date.now() - 60_000) });
    await createListing(shop.id, { title: "Old thing", publishedAt: daysAgo(3) });

    expect(await digests.sendFollowDigests()).toBe(1);
    expect(emailsTo(fan.email)).toEqual(["New at Maya's Closet: Linen dress"]);
    expect(await digests.sendFollowDigests()).toBe(0);
  });

  it("leaves people who didn't turn it on alone", async () => {
    const { fan, shop } = await setup(null);
    await createListing(shop.id, { publishedAt: new Date() });
    expect(await digests.sendFollowDigests()).toBe(0);
    expect(emailsTo(fan.email)).toEqual([]);
  });

  it("never mentions drafts or link-only listings", async () => {
    const { shop } = await setup({ follow: true });
    await createListing(shop.id, { status: "draft", publishedAt: new Date() });
    await createListing(shop.id, { visibility: "link", publishedAt: new Date() });
    expect(await digests.sendFollowDigests()).toBe(0);
  });

  it("only sends what's new since the last one", async () => {
    const { fan, shop } = await setup({ follow: true });
    await createListing(shop.id, { title: "First", publishedAt: new Date(Date.now() - 120_000) });
    await digests.sendFollowDigests();
    await createListing(shop.id, { title: "Second", publishedAt: new Date(Date.now() - 10_000) });
    await digests.sendFollowDigests();
    expect(emailsTo(fan.email)).toEqual(["New at Maya's Closet: First", "New at Maya's Closet: Second"]);
    const [row] = await db.select().from(user).where(eq(user.id, fan.id));
    expect(row!.followMailedAt).toBeInstanceOf(Date);
  });
});

describe("agent summary", () => {
  it("rolls up what the agent did and what's waiting on the seller", async () => {
    const sale = await createSale();
    const now = new Date();
    const [t] = await db
      .insert(thread)
      .values({ shopId: sale.shop.id, buyerId: sale.buyer.id, listingId: sale.listing.id, needsSeller: true, lastPreview: "Ships to Canada?" })
      .returning();
    await db.insert(message).values([
      { threadId: t!.id, side: "buyer", authorId: sale.buyer.id, body: "Is it real cast iron?", createdAt: new Date(now.getTime() - 120_000) },
      { threadId: t!.id, side: "seller", body: "Yes, it is.", byAgent: true, createdAt: new Date(now.getTime() - 60_000) },
    ]);
    await createOffer(sale, { status: "countered", counterCents: 9_000, counteredBy: "agent", respondedAt: now });
    await createOffer(sale, { amountCents: 9_500, agentNote: "I'd take it." });

    const props = await digests.agentSummaryFor(sale.seller.id, new Date(now.getTime() + 1000));
    expect(props!.summary).toBe("I answered 1 question and countered 1 offer. 2 things are waiting on you.");
    expect(props!.handled.map((h) => h.text)).toEqual([
      expect.stringMatching(/^Answered Jess about Thing number/),
      expect.stringMatching(/^Countered Jess at \$90 on/),
    ]);
    expect(props!.needsYou.map((n) => n.title)).toEqual(["Jess offered $95", expect.stringMatching(/^Jess asked about/)]);
    expect(props!.stats).toEqual([
      { label: "Views", value: "0" },
      { label: "Questions", value: "1" },
      { label: "Offers", value: "2" },
    ]);
  });

  it("is nothing on a quiet day", async () => {
    const sale = await createSale();
    expect(await digests.agentSummaryFor(sale.seller.id)).toBeNull();
  });

  it("goes once a day after the summary hour, and not to sellers who turned it off", async () => {
    const sale = await createSale();
    await createOffer(sale, { expiresAt: new Date(evening.getTime() + 3600_000) });
    const quiet = await createSale();
    await db.update(user).set({ notifyPrefs: { agent: false } }).where(eq(user.id, quiet.seller.id));
    await createOffer(quiet, { expiresAt: new Date(evening.getTime() + 3600_000) });

    expect(await digests.sendAgentSummaries(claimNotice, new Date("2026-10-03T00:30:00Z"))).toBe(0);
    expect(await digests.sendAgentSummaries(claimNotice, evening)).toBe(1);
    expect(await digests.sendAgentSummaries(claimNotice, evening)).toBe(0);
    expect(emailsTo(sale.seller.email)).toEqual([expect.stringMatching(/^Your \w+day: 1 thing needs you$/)]);
    expect(emailsTo(quiet.seller.email)).toEqual([]);
  });
});

describe("requestReviews", () => {
  it("asks two days after it's done, once, and not if they already reviewed", async () => {
    const a = await createSale();
    const done = await createOrder(a, { status: "completed", completedAt: daysAgo(2.5) });
    const b = await createSale();
    const reviewed = await createOrder(b, { status: "completed", completedAt: daysAgo(3) });
    await db.insert(review).values({ orderId: reviewed.id, listingId: b.listing.id, shopId: b.shop.id, buyerId: b.buyer.id, rating: 5 });
    const c = await createSale();
    await createOrder(c, { status: "completed", completedAt: daysAgo(1) });

    expect(await digests.requestReviews(claimNotice)).toBe(1);
    expect(await digests.requestReviews(claimNotice)).toBe(0);
    expect(emailsTo(a.buyer.email)).toEqual([expect.stringMatching(/^How was/)]);
    expect(emailsTo(b.buyer.email)).toEqual([]);
    const [row] = await db.select().from(orders).where(eq(orders.id, done.id));
    expect(row!.status).toBe("completed");
    expect(await db.select().from(offer)).toEqual([]);
  });
});
