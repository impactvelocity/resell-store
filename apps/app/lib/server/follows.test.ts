import { beforeEach, describe, expect, it } from "vitest";
import { db, follow } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser, daysAgo } from "../../test/factories";
import { createFollow, createPhoto } from "../../test/factories-market";
import {
  FollowError,
  followedShopIds,
  followerCount,
  followStates,
  isFollowing,
  listFollowedShops,
  setFollowing,
} from "./follows";

/*
 * Following shops: one row per person and shop, so following twice or
 * unfollowing twice changes nothing; you can't follow your own or a private
 * shop; and Home's list of followed shops with their newest listings.
 */

beforeEach(async () => {
  await resetDb();
});

async function shopAndFan(overrides: Parameters<typeof createShop>[1] = {}) {
  const owner = await createUser();
  const s = await createShop(owner.id, overrides);
  const fan = await createUser();
  return { owner, shop: s, fan };
}

describe("setFollowing", () => {
  it("follows once, however many times it's clicked", async () => {
    const { shop, fan } = await shopAndFan();
    await setFollowing(fan.id, shop.id, true);
    await setFollowing(fan.id, shop.id, true);
    expect(await db.select().from(follow)).toHaveLength(1);
    expect(await isFollowing(fan.id, shop.id)).toBe(true);
    expect(await followerCount(shop.id)).toBe(1);
  });

  it("unfollows, and unfollowing again is fine", async () => {
    const { shop, fan } = await shopAndFan();
    await setFollowing(fan.id, shop.id, true);
    await setFollowing(fan.id, shop.id, false);
    await setFollowing(fan.id, shop.id, false);
    expect(await isFollowing(fan.id, shop.id)).toBe(false);
    expect(await followerCount(shop.id)).toBe(0);
  });

  it("won't follow your own shop, a private one, or one that doesn't exist", async () => {
    const { owner, shop } = await shopAndFan();
    await expect(setFollowing(owner.id, shop.id, true)).rejects.toThrow(FollowError);
    await expect(setFollowing(owner.id, shop.id, true)).rejects.toThrow("That's your own shop.");

    const { shop: closed, fan } = await shopAndFan({ visibility: "private" });
    await expect(setFollowing(fan.id, closed.id, true)).rejects.toThrow("That shop isn't open right now.");
    await expect(setFollowing(fan.id, "nope", true)).rejects.toThrow("That shop isn't open right now.");
    expect(await db.select().from(follow)).toHaveLength(0);
  });

  it("lets people follow a link-only shop", async () => {
    const { shop, fan } = await shopAndFan({ visibility: "link" });
    await setFollowing(fan.id, shop.id, true);
    expect(await isFollowing(fan.id, shop.id)).toBe(true);
  });
});

describe("followedShopIds and followerCount", () => {
  it("counts per shop and lists per person", async () => {
    const { shop: a, fan } = await shopAndFan();
    const { shop: b } = await shopAndFan();
    const other = await createUser();
    await createFollow(fan.id, a.id);
    await createFollow(fan.id, b.id);
    await createFollow(other.id, a.id);
    expect(await followedShopIds(fan.id)).toEqual(new Set([a.id, b.id]));
    expect(await followerCount(a.id)).toBe(2);
    expect(await followerCount(b.id)).toBe(1);
    expect(await followedShopIds(other.id)).toEqual(new Set([a.id]));
  });
});

describe("followStates", () => {
  it("gives each store's button its starting state, by slug", async () => {
    const { owner, shop: a, fan } = await shopAndFan({ slug: "a" });
    const { shop: b } = await shopAndFan({ slug: "b" });
    await createFollow(fan.id, a.id);

    expect(await followStates(fan.id, ["a", "b", "missing"])).toEqual({
      a: { shopId: a.id, following: true, own: false },
      b: { shopId: b.id, following: false, own: false },
    });
    expect((await followStates(owner.id, ["a"])).a).toEqual({ shopId: a.id, following: false, own: true });
  });

  it("starts everything unfollowed when signed out", async () => {
    const { shop, fan } = await shopAndFan({ slug: "a" });
    await createFollow(fan.id, shop.id);
    expect(await followStates(null, ["a"])).toEqual({ a: { shopId: shop.id, following: false, own: false } });
    expect(await followStates(fan.id, [])).toEqual({});
  });
});

describe("listFollowedShops", () => {
  it("lists followed shops, latest follow first, with their newest few listed things", async () => {
    const fan = await createUser();
    const { shop: older } = await shopAndFan({ slug: "older", name: "older shop" });
    const { shop: newer } = await shopAndFan({ slug: "newer", name: "Newer" });
    await createFollow(fan.id, older.id, daysAgo(5));
    await createFollow(fan.id, newer.id, daysAgo(1));

    const l1 = await createListing(older.id, { title: "One", publishedAt: daysAgo(30) });
    const l2 = await createListing(older.id, { title: "Two", publishedAt: daysAgo(20) });
    const l3 = await createListing(older.id, { title: "Three", publishedAt: daysAgo(10) });
    await createListing(older.id, { title: "Four", publishedAt: daysAgo(9), priceCents: 2_550 });
    await createListing(older.id, { title: "Hidden", visibility: "link" });
    await createListing(older.id, { title: "Sold", status: "sold" });
    await createPhoto(l3.id, { url: "https://x.com/3.jpg" });

    const list = await listFollowedShops(fan.id);
    expect(list.map((s) => s.slug)).toEqual(["newer", "older"]);
    expect(list[0]).toMatchObject({ forSale: 0, newest: [], hasNew: false, initial: "N" });

    const o = list[1]!;
    expect(o).toMatchObject({ name: "older shop", initial: "O", forSale: 4, hasNew: false, tone: "lemon", picture: null });
    expect(o.newest.map((l) => l.title)).toEqual(["Four", "Three", "Two"]);
    expect(o.newest[0]!.price).toBe(25.5);
    expect(o.newest[1]!.photo).toBe("https://x.com/3.jpg");
    expect(o.newest.map((l) => l.id)).not.toContain(l1.id);
    expect(l2.id).toBe(o.newest[2]!.id);

    expect((await listFollowedShops(fan.id, { perShop: 1 }))[1]!.newest).toHaveLength(1);
  });

  it("flags a shop with something listed this week", async () => {
    const { shop, fan } = await shopAndFan();
    await createFollow(fan.id, shop.id);
    await createListing(shop.id, { publishedAt: daysAgo(2) });
    expect((await listFollowedShops(fan.id))[0]!.hasNew).toBe(true);
  });

  it("drops private shops but keeps the follow for when they reopen", async () => {
    const { shop, fan } = await shopAndFan({ visibility: "private" });
    await createFollow(fan.id, shop.id);
    expect(await listFollowedShops(fan.id)).toEqual([]);
    expect(await isFollowing(fan.id, shop.id)).toBe(true);
  });

  it("is empty when following nobody", async () => {
    expect(await listFollowedShops((await createUser()).id)).toEqual([]);
  });
});
