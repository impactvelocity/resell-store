import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, demoState, eq, favourite, listing, message, offer, orders, thread } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createOrder, createShop, createUser, daysAgo } from "../../test/factories";

/*
 * The shared demo accounts (demo.ts): what they're kept from, and the reset
 * that takes away what they added since the baseline.
 */

vi.hoisted(() => {
  process.env.DEMO = "true";
  process.env.DEMO_SELLER_EMAIL = "demo.seller@example.com";
  process.env.DEMO_BUYER_EMAIL = "demo.buyer@example.com";
  process.env.DEMO_MAX_DRAFTS = "2";
});

const demo = await import("./demo");

beforeEach(resetDb);

const listingRow = async (id: string) => (await db.select().from(listing).where(eq(listing.id, id)))[0];

/** The seed's world as it was an hour ago: a demo seller and buyer, an example store, a real one. */
async function world() {
  const baseline = daysAgo(1 / 24);
  await db.insert(demoState).values({ key: "baseline", at: baseline });
  const old = { createdAt: daysAgo(3) };
  const seller = await createUser({ id: "seed_dana", email: "demo.seller@example.com", ...old });
  const buyer = await createUser({ id: "seed_ava", email: "demo.buyer@example.com", ...old });
  const sellerShop = await createShop(seller.id, old);
  const example = await createShop((await createUser({ id: "seed_priya", ...old })).id, old);
  const real = await createShop((await createUser(old)).id, old);
  const exampleListing = await createListing(example.id, old);
  const ownLive = await createListing(sellerShop.id, old);
  return { baseline, seller, buyer, sellerShop, example, real, exampleListing, ownLive };
}

describe("who is a demo account", () => {
  it("knows the demo addresses, in any case", () => {
    expect(demo.isDemoUser({ email: "Demo.Seller@example.com" })).toBe(true);
    expect(demo.isDemoUser({ email: "someone@example.com" })).toBe(false);
    expect(demo.demoBlocked({ email: "demo.buyer@example.com" }, "review")).toBe(demo.demoMessages.review);
    expect(demo.demoBlocked({ email: "someone@example.com" }, "review")).toBeNull();
  });
});

describe("guards", () => {
  it("lets the demo seller change only drafts started since the baseline", async () => {
    const w = await world();
    const oldDraft = await createListing(w.sellerShop.id, { status: "draft", createdAt: daysAgo(2) });
    const newDraft = await createListing(w.sellerShop.id, { status: "draft" });
    expect(await demo.demoListingBlocked(w.seller, w.ownLive)).toBe(demo.demoMessages.listing);
    expect(await demo.demoListingBlocked(w.seller, oldDraft)).toBe(demo.demoMessages.listing);
    expect(await demo.demoListingBlocked(w.seller, newDraft)).toBeNull();
    // Anyone else, anything goes
    const someone = await createUser();
    expect(await demo.demoListingBlocked(someone, w.ownLive)).toBeNull();
  });

  it("caps the drafts the demo seller starts between resets", async () => {
    const w = await world();
    expect(await demo.demoDraftsBlocked(w.seller)).toBeNull();
    await createListing(w.sellerShop.id, { status: "draft" });
    await createListing(w.sellerShop.id, { status: "draft" });
    expect(await demo.demoDraftsBlocked(w.seller)).toBe(demo.demoMessages.drafts);
  });

  it("keeps the demo buyer to the example stores", async () => {
    const w = await world();
    const realListing = await createListing(w.real.id);
    await expect(demo.assertDemoMayTrade(w.buyer, { listingId: w.exampleListing.id })).resolves.toBeUndefined();
    await expect(demo.assertDemoMayTrade(w.buyer, { shopSlug: w.sellerShop.slug })).resolves.toBeUndefined();
    await expect(demo.assertDemoMayTrade(w.buyer, { listingId: realListing.id })).rejects.toThrow(
      demo.demoMessages.trade,
    );
    await expect(demo.assertDemoMayTrade(w.buyer, { shopSlug: w.real.slug })).rejects.toThrow(demo.demoMessages.trade);
    // A real buyer can shop anywhere
    await expect(demo.assertDemoMayTrade(await createUser(), { shopSlug: w.real.slug })).resolves.toBeUndefined();
  });
});

describe("marketplace during the demo", () => {
  it("keeps new stores off it, but leaves link-only, private and already-public stores alone", () => {
    expect(demo.demoPublicBlocked("public")).toBe(demo.demoMessages.public);
    expect(demo.demoPublicBlocked("public", "link")).toBe(demo.demoMessages.public);
    expect(demo.demoPublicBlocked("link")).toBeNull();
    expect(demo.demoPublicBlocked("private", "public")).toBeNull();
    expect(demo.demoPublicBlocked("public", "public")).toBeNull();
    expect(demo.demoPublicBlocked(undefined, "link")).toBeNull();
  });
});

describe("resetDemo", () => {
  it("removes what the demo added and puts back what it bought", async () => {
    const w = await world();
    // From before the baseline: stays
    const oldOrderListing = await createListing(w.example.id, { status: "sold", createdAt: daysAgo(3) });
    const oldOrder = await createOrder(
      { buyer: w.buyer, shop: w.example, listing: oldOrderListing },
      { status: "completed", createdAt: daysAgo(2) },
    );
    const [oldThread] = await db
      .insert(thread)
      .values({ shopId: w.example.id, buyerId: w.buyer.id, lastPreview: "Is it still there?", createdAt: daysAgo(2) })
      .returning();
    await db.insert(message).values({
      threadId: oldThread!.id,
      authorId: w.buyer.id,
      side: "buyer",
      body: "Is it still there?",
      createdAt: daysAgo(2),
    });

    // During the demo
    await db.update(listing).set({ status: "sold", soldAt: new Date() }).where(eq(listing.id, w.exampleListing.id));
    await createOrder({ buyer: w.buyer, shop: w.example, listing: w.exampleListing }, { status: "paid" });
    await db.insert(offer).values({
      listingId: w.ownLive.id,
      shopId: w.sellerShop.id,
      buyerId: w.buyer.id,
      amountCents: 5_000,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await db.insert(message).values({ threadId: oldThread!.id, authorId: w.buyer.id, side: "buyer", body: "Junk" });
    await db.update(thread).set({ lastPreview: "Junk" }).where(eq(thread.id, oldThread!.id));
    await db
      .insert(thread)
      .values({ shopId: w.example.id, buyerId: w.buyer.id, listingId: w.exampleListing.id, lastPreview: "New" });
    await db.insert(favourite).values({ userId: w.buyer.id, listingId: w.exampleListing.id });
    const draft = await createListing(w.sellerShop.id, { status: "draft" });

    const result = await demo.resetDemo();
    expect(result).toMatchObject({ orders: 1, listings: 1, threads: 1, messages: 1 });

    // Bought during the demo: for sale again; the old sale stays sold
    expect(await listingRow(w.exampleListing.id)).toMatchObject({ status: "live", soldAt: null });
    expect(await listingRow(oldOrderListing.id)).toMatchObject({ status: "sold" });
    expect((await db.select().from(orders)).map((o) => o.id)).toEqual([oldOrder.id]);
    expect(await listingRow(draft.id)).toBeUndefined();
    expect(await listingRow(w.ownLive.id)).toBeDefined();
    expect(await db.select().from(offer)).toEqual([]);
    expect(await db.select().from(favourite)).toEqual([]);
    const threads = await db.select().from(thread);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ id: oldThread!.id, lastPreview: "Is it still there?" });
    expect(await db.select().from(message)).toHaveLength(1);
  });

  it("only runs again once the last reset is old enough", async () => {
    await world();
    expect(await demo.resetDemoIfDue()).not.toBeNull();
    expect(await demo.resetDemoIfDue()).toBeNull();
    await db
      .update(demoState)
      .set({ at: new Date(Date.now() - (demo.demoResetMinutes + 1) * 60_000) })
      .where(eq(demoState.key, "reset"));
    expect(await demo.resetDemoIfDue()).not.toBeNull();
  });

  it("starts a baseline on first use", async () => {
    expect(await demo.demoBaseline()).toBeNull();
    const at = await demo.ensureDemoBaseline();
    expect(await demo.ensureDemoBaseline()).toEqual(at);
    await demo.clearDemoBaseline();
    expect(await demo.demoBaseline()).toBeNull();
  });
});
