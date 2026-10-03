import "server-only";
import { and, db, desc, eq, inArray, listing, offer, orders, or, shop, user } from "@repo/db";
import { coverPhotos } from "../../lib/server/listings";
import { toPublicListing, toPublicStore } from "../../lib/server/market";
import { effectiveStatus, OFFER_HOURS, shippingFor } from "../../lib/server/commerce";
import { getCurrentUser } from "../../lib/server/session";
import { toDollars } from "../../lib/money";

/*
 * What P4 checkout and P5 offers need about one listing and the person looking
 * at it. Unlike the store pages, sold listings load too, so a late visitor
 * sees "this one's sold" (and the buyer sees their order) instead of a 404.
 */

export async function loadForBuying(key: string) {
  const rows = await db
    .select({ listing, shop, ownerName: user.name, ownerEmail: user.email })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .innerJoin(user, eq(user.id, shop.ownerId))
    .where(and(or(eq(listing.id, key), eq(listing.slug, key)), inArray(listing.status, ["live", "sold"])))
    .limit(2);
  // Ids first; a bare slug only when it's unambiguous
  const row = rows.find((r) => r.listing.id === key) ?? (rows.length === 1 ? rows[0] : undefined);
  if (!row || row.listing.priceCents == null) return null;

  const viewer = await getCurrentUser();
  const isOwner = !!viewer && viewer.id === row.shop.ownerId;
  // Private shops are nobody's business but the owner's
  if (row.shop.visibility === "private" && !isOwner) return null;

  const covers = await coverPhotos([row.listing.id]);
  const publicListing = toPublicListing(row.listing, row.shop, covers.get(row.listing.id));
  const store = toPublicStore(
    row.shop,
    { name: row.ownerName, email: row.ownerEmail },
    { forSale: 0, sold: 0 },
  );

  // The viewer's own order on it (it's theirs now) and their latest offer
  const [order] = viewer
    ? await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.listingId, row.listing.id),
            eq(orders.buyerId, viewer.id),
            inArray(orders.status, ["paid", "shipped", "delivered", "completed"]),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(1)
    : [];
  const offers = viewer
    ? await db
        .select()
        .from(offer)
        .where(and(eq(offer.listingId, row.listing.id), eq(offer.buyerId, viewer.id)))
        .orderBy(desc(offer.createdAt))
        .limit(5)
    : [];
  const latest = offers
    .map((o) => ({ ...o, status: effectiveStatus(o) }))
    .find((o) => o.status === "open" || o.status === "countered" || o.status === "accepted");

  return {
    row: row.listing,
    listing: publicListing,
    store,
    viewer: viewer && { id: viewer.id, name: viewer.name?.trim() || "", email: viewer.email },
    isOwner,
    sold: row.listing.status === "sold",
    order: order ?? null,
    /** The viewer's open, countered or accepted offer on it, if any. */
    offer: latest ?? null,
    asking: toDollars(row.listing.priceCents)!,
    shipping: {
      tracked: toDollars(shippingFor(row.listing.shippingCents, "tracked"))!,
      express: toDollars(shippingFor(row.listing.shippingCents, "express"))!,
    },
    offerHours: OFFER_HOURS,
  };
}

export type BuyingContext = NonNullable<Awaited<ReturnType<typeof loadForBuying>>>;
