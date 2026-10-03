import "server-only";
import { and, count, db, desc, eq, follow, inArray, isNotNull, listing, ne, shop, sql } from "@repo/db";
import type { StoreTone } from "../mock-market";
import { toDollars } from "../money";
import { coverPhotos } from "./listings";
import { shopPicture, storeToneFor } from "./shops";

/*
 * Following shops: a buyer keeps a list of stores they like, and their Home
 * and account show what's new there. One row per (user, shop).
 */

/** What a Follow button needs from the server: which shop, and where it starts. */
export type FollowState = { shopId: string; following: boolean; own?: boolean };

/** Listed on the store page: live, for everyone, with a path and a price. */
const listedListing = and(
  eq(listing.status, "live"),
  eq(listing.visibility, "everyone"),
  isNotNull(listing.slug),
  isNotNull(listing.priceCents),
);

/** "New" on a followed shop: listed in the last week. */
const NEW_MS = 7 * 24 * 60 * 60 * 1000;

export async function followedShopIds(userId: string) {
  const rows = await db.select({ shopId: follow.shopId }).from(follow).where(eq(follow.userId, userId));
  return new Set(rows.map((r) => r.shopId));
}

export async function isFollowing(userId: string, shopId: string) {
  const [row] = await db
    .select({ shopId: follow.shopId })
    .from(follow)
    .where(and(eq(follow.userId, userId), eq(follow.shopId, shopId)));
  return !!row;
}

export async function followerCount(shopId: string) {
  const [row] = await db.select({ n: count() }).from(follow).where(eq(follow.shopId, shopId));
  return row?.n ?? 0;
}

/**
 * Follow buttons for a list of stores by slug (the public store shape has no
 * id). Signed out, every store starts unfollowed and the click asks to sign in.
 */
export async function followStates(userId: string | null | undefined, slugs: string[]) {
  if (slugs.length === 0) return {} as Record<string, FollowState>;
  const rows = await db
    .select({
      shopId: shop.id,
      slug: shop.slug,
      ownerId: shop.ownerId,
      follower: follow.userId,
    })
    .from(shop)
    .leftJoin(follow, and(eq(follow.shopId, shop.id), eq(follow.userId, userId ?? "")))
    .where(inArray(shop.slug, slugs));
  return Object.fromEntries(
    rows.map((r) => [
      r.slug,
      { shopId: r.shopId, following: !!r.follower, own: !!userId && r.ownerId === userId },
    ]),
  ) as Record<string, FollowState>;
}

export type FollowedListing = {
  id: string;
  slug: string;
  title: string;
  /** Dollars */
  price: number;
  photo: string | null;
};

export type FollowedShop = {
  shopId: string;
  slug: string;
  name: string;
  initial: string;
  tone: StoreTone;
  picture: string | null;
  forSale: number;
  /** Something listed in the last week. */
  hasNew: boolean;
  /** The newest few things on its shelves. */
  newest: FollowedListing[];
};

/**
 * The shops someone follows, most recently followed first, with their newest
 * listings for Home. Private shops drop out (their page would 404) until
 * they open again; the follow itself stays.
 */
export async function listFollowedShops(userId: string, { perShop = 3 } = {}): Promise<FollowedShop[]> {
  const shops = await db
    .select({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      tone: shop.tone,
      pictureFileId: shop.pictureFileId,
      forSale: sql<number>`(select count(*) from ${listing} where ${listing.shopId} = ${shop.id} and ${listedListing})`.mapWith(Number),
    })
    .from(follow)
    .innerJoin(shop, eq(shop.id, follow.shopId))
    .where(and(eq(follow.userId, userId), ne(shop.visibility, "private")))
    .orderBy(desc(follow.createdAt));
  if (shops.length === 0) return [];

  // The newest few per shop, ranked in Postgres so one busy shop can't crowd the rest out
  const ranked = db
    .select({
      id: listing.id,
      shopId: listing.shopId,
      slug: listing.slug,
      title: listing.title,
      name: listing.name,
      priceCents: listing.priceCents,
      publishedAt: listing.publishedAt,
      rank: sql<number>`row_number() over (partition by ${listing.shopId} order by ${listing.publishedAt} desc nulls last, ${listing.createdAt} desc)`
        .mapWith(Number)
        .as("rank"),
    })
    .from(listing)
    .where(and(inArray(listing.shopId, shops.map((s) => s.id)), listedListing))
    .as("ranked");
  const rows = await db.select().from(ranked).where(sql`${ranked.rank} <= ${perShop}`);
  const covers = await coverPhotos(rows.map((r) => r.id));

  return shops.map((s) => {
    const mine = rows
      .filter((r) => r.shopId === s.id)
      .sort((a, b) => a.rank - b.rank);
    return {
      shopId: s.id,
      slug: s.slug,
      name: s.name,
      initial: (s.name.trim()[0] ?? "?").toUpperCase(),
      tone: storeToneFor[s.tone],
      picture: shopPicture(s),
      forSale: s.forSale,
      hasNew: mine.some((r) => !!r.publishedAt && Date.now() - r.publishedAt.getTime() < NEW_MS),
      newest: mine.map((r) => ({
        id: r.id,
        slug: r.slug ?? r.id,
        title: r.title ?? r.name ?? "Untitled",
        price: toDollars(r.priceCents) ?? 0,
        photo: covers.get(r.id) ?? null,
      })),
    };
  });
}

/** Follow or unfollow. Errors are plain sentences a person can act on. */
export class FollowError extends Error {}

export async function setFollowing(userId: string, shopId: string, following: boolean) {
  if (!following) {
    await db.delete(follow).where(and(eq(follow.userId, userId), eq(follow.shopId, shopId)));
    return;
  }
  const [s] = await db
    .select({ ownerId: shop.ownerId, visibility: shop.visibility })
    .from(shop)
    .where(eq(shop.id, shopId));
  if (!s || s.visibility === "private") throw new FollowError("That shop isn't open right now.");
  if (s.ownerId === userId) throw new FollowError("That's your own shop. You'll see everything there anyway.");
  await db.insert(follow).values({ userId, shopId }).onConflictDoNothing();
}
