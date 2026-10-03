import { notFound } from "next/navigation";
import { LiveListingManage } from "../../../../components/listing-live/listing-manage";
import { sellerOffers, sellerOrders } from "../../../../components/seller-live/data";
import { getOwnedListing, listPhotos, toWorkspaceListing } from "../../../../lib/server/listings";
import { listSellerThreads } from "../../../../lib/server/messages";
import { requireUser } from "../../../../lib/server/session";
import { listingStats } from "../../../../lib/server/stats";

/* C9 Listing / Manage, with how it's doing, the offers and questions on it, and the sale once it's bought. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const row = await getOwnedListing(user.id, (await params).id);
  if (!row) notFound();
  const [photos, offers, orders, stats, threads] = await Promise.all([
    listPhotos(row.listing.id),
    sellerOffers(user.id, { listingId: row.listing.id }),
    sellerOrders(user.id),
    listingStats([row.listing.id]),
    listSellerThreads(user.id),
  ]);
  const order =
    orders.find((o) => o.listing.id === row.listing.id && o.status !== "refunded" && o.status !== "cancelled") ??
    null;
  return (
    <LiveListingManage
      listing={toWorkspaceListing(row.listing, row.shop)}
      photos={photos}
      offers={offers}
      order={order}
      stats={stats.get(row.listing.id) ?? null}
      questions={threads.filter((t) => t.listing?.id === row.listing.id)}
    />
  );
}
