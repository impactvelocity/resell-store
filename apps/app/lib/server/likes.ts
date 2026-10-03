import "server-only";
import { and, db, desc, eq, favourite, listing, ne, shop, sql } from "@repo/db";
import type { PublicListing } from "../mock-market";
import { coverPhotos } from "./listings";
import { toPublicListing } from "./market";

/*
 * Likes: the heart on a listing. A buyer saves things they like and finds them
 * again under Saved in their account. One row per (user, listing).
 */

/** Every listing the viewer has liked, for hearts across the marketplace. */
export async function likedListingIds(userId: string) {
  const rows = await db
    .select({ listingId: favourite.listingId })
    .from(favourite)
    .where(eq(favourite.userId, userId));
  return rows.map((r) => r.listingId);
}

/** Like or unlike. Errors are plain sentences a person can act on. */
export class LikeError extends Error {}

export async function setLiked(userId: string, listingId: string, liked: boolean) {
  if (!liked) {
    await db.delete(favourite).where(and(eq(favourite.userId, userId), eq(favourite.listingId, listingId)));
    return;
  }
  const [row] = await db
    .select({ status: listing.status, ownerId: shop.ownerId, visibility: shop.visibility })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(eq(listing.id, listingId));
  if (!row || row.status === "draft" || row.visibility === "private") {
    throw new LikeError("That one isn't up right now.");
  }
  if (row.ownerId === userId) throw new LikeError("That's your own listing. It's safe with you.");
  await db.insert(favourite).values({ userId, listingId }).onConflictDoNothing();
}

/**
 * What someone has liked, as cards: still for sale first, then sold, newest
 * like first. Drafts and private shops drop out (their pages would 404); the
 * like itself stays for when they come back.
 */
export async function listLikedListings(userId: string): Promise<PublicListing[]> {
  const rows = await db
    .select({
      listing,
      shop: { slug: shop.slug, name: shop.name, tone: shop.tone, pictureFileId: shop.pictureFileId },
    })
    .from(favourite)
    .innerJoin(listing, eq(listing.id, favourite.listingId))
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(eq(favourite.userId, userId), ne(listing.status, "draft"), ne(shop.visibility, "private")))
    .orderBy(sql`${listing.status} = 'sold'`, desc(favourite.createdAt));
  const covers = await coverPhotos(rows.map((r) => r.listing.id));
  return rows.map((r) => toPublicListing(r.listing, r.shop, covers.get(r.listing.id)));
}
