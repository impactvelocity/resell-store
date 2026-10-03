import { LiveDetails } from "../../../../../components/listing/live-details";
import { loadMessages } from "../../../../../lib/server/listing-chat";
import { reachStep, requireOwnedListing } from "../../../../../lib/server/listings";
import { toDollars } from "../../../../../lib/money";

// C4 Details on the real listing: fields, price, floor and offers.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { listing, shop } = await requireOwnedListing((await params).id);
  await reachStep(listing, "details");
  const messages = await loadMessages(listing.id, "details");

  return (
    <LiveDetails
      listingId={listing.id}
      title={listing.title ?? listing.name ?? "New listing"}
      shopName={shop.name}
      closeHref={`/shops/${shop.slug}`}
      fields={listing.fields}
      price={toDollars(listing.priceCents) ?? null}
      lowest={toDollars(listing.lowestCents) ?? null}
      takeOffers={listing.takeOffers}
      range={listing.findings?.price ?? null}
      initialMessages={messages}
    />
  );
}
