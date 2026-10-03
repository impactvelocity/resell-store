import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, favourite, listing as listingTable, shop as shopTable } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser, daysAgo } from "../../test/factories";
import { createLike, createPhoto } from "../../test/factories-market";
import { likedListingIds, LikeError, listLikedListings, setLiked } from "./likes";

/*
 * Likes (the heart): one per person and listing, never your own, never a
 * draft or a private shop's; Saved lists live things first, then sold.
 */

beforeEach(async () => {
  await resetDb();
});

async function listingAndFan(listing: Parameters<typeof createListing>[1] = {}, shop: Parameters<typeof createShop>[1] = {}) {
  const owner = await createUser();
  const s = await createShop(owner.id, shop);
  const l = await createListing(s.id, listing);
  const fan = await createUser();
  return { owner, shop: s, listing: l, fan };
}

describe("setLiked", () => {
  it("likes once however many times it's tapped, and unlikes", async () => {
    const { listing, fan } = await listingAndFan();
    await setLiked(fan.id, listing.id, true);
    await setLiked(fan.id, listing.id, true);
    expect(await db.select().from(favourite)).toHaveLength(1);
    expect(await likedListingIds(fan.id)).toEqual([listing.id]);

    await setLiked(fan.id, listing.id, false);
    await setLiked(fan.id, listing.id, false);
    expect(await likedListingIds(fan.id)).toEqual([]);
  });

  it("lets people like sold and link-only listings", async () => {
    const sold = await listingAndFan({ status: "sold" });
    await setLiked(sold.fan.id, sold.listing.id, true);
    const link = await listingAndFan({ visibility: "link" });
    await setLiked(link.fan.id, link.listing.id, true);
    expect(await db.select().from(favourite)).toHaveLength(2);
  });

  it("refuses drafts, private shops, missing listings and your own", async () => {
    const draft = await listingAndFan({ status: "draft" });
    await expect(setLiked(draft.fan.id, draft.listing.id, true)).rejects.toThrow(LikeError);
    await expect(setLiked(draft.fan.id, draft.listing.id, true)).rejects.toThrow("That one isn't up right now.");
    const priv = await listingAndFan({}, { visibility: "private" });
    await expect(setLiked(priv.fan.id, priv.listing.id, true)).rejects.toThrow("That one isn't up right now.");
    await expect(setLiked(priv.fan.id, "nope", true)).rejects.toThrow("That one isn't up right now.");
    const own = await listingAndFan();
    await expect(setLiked(own.owner.id, own.listing.id, true)).rejects.toThrow("That's your own listing.");
    expect(await db.select().from(favourite)).toHaveLength(0);
  });
});

describe("listLikedListings", () => {
  it("shows still-for-sale first, then sold, newest like first, as cards", async () => {
    const owner = await createUser();
    const s = await createShop(owner.id, { slug: "maya" });
    const fan = await createUser();
    const oldLive = await createListing(s.id, { title: "Old like" });
    const newLive = await createListing(s.id, { title: "New like" });
    const sold = await createListing(s.id, { title: "Sold one", status: "sold" });
    await createLike(fan.id, oldLive.id, daysAgo(3));
    await createLike(fan.id, sold.id, daysAgo(0));
    await createLike(fan.id, newLive.id, daysAgo(1));
    await createPhoto(newLive.id, { url: "https://x.com/n.jpg" });

    const cards = await listLikedListings(fan.id);
    expect(cards.map((c) => c.title)).toEqual(["New like", "Old like", "Sold one"]);
    expect(cards[0]).toMatchObject({ store: "maya", photo: "https://x.com/n.jpg", sold: false });
    expect(cards[2]!.sold).toBe(true);
  });

  it("hides likes on listings that went back to draft or shops that went private, but keeps them", async () => {
    const { listing, fan } = await listingAndFan();
    const other = await listingAndFan();
    await createLike(fan.id, listing.id);
    await createLike(fan.id, other.listing.id);
    await db.update(listingTable).set({ status: "draft" }).where(eq(listingTable.id, listing.id));
    await db.update(shopTable).set({ visibility: "private" }).where(eq(shopTable.id, other.shop.id));

    expect(await listLikedListings(fan.id)).toEqual([]);
    expect((await likedListingIds(fan.id)).sort()).toEqual([listing.id, other.listing.id].sort());
  });
});
