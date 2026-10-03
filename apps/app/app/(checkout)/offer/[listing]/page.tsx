import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutHeader } from "../../../../components/market/checkout/checkout-header";
import { CheckoutNotice, type CheckoutNoticeKind } from "../../../../components/market/checkout/notice";
import { OfferForm } from "../../../../components/market/checkout/offer-form";
import { agreedCents } from "../../../../lib/server/commerce";
import { toDollars } from "../../../../lib/money";
import { loadForBuying } from "../../load";

export const metadata: Metadata = { title: "Make an offer · resell.store" };

/**
 * P5: offering under asking. Live listings are linked by id. The offer is real
 * (the seller answers it); any deposit is noted but not charged yet.
 */
export default async function Page({ params }: { params: Promise<{ listing: string }> }) {
  const found = await loadForBuying((await params).listing);
  if (!found) notFound();
  const { listing, store, viewer, offer } = found;
  // Already theirs: checkout shows the order
  if (found.order) redirect(`/checkout/${found.row.id}`);

  // Who's looking, and where the listing is at, decide what goes here
  const kind: CheckoutNoticeKind | null = found.isOwner
    ? "own"
    : found.sold
      ? "sold"
      : !found.row.takeOffers
        ? "no-offers"
        : !viewer
          ? "signin-offer"
          : offer?.status === "accepted"
            ? "accepted"
            : null;

  return (
    <>
      <CheckoutHeader
        store={listing.store}
        listing={found.sold && !found.isOwner ? "" : listing.slug}
        title="Make an offer"
      />
      <main>
        {kind ? (
          <CheckoutNotice
            kind={kind}
            listing={listing}
            store={store}
            asking={found.asking}
            shipping={found.shipping.tracked}
            agreed={offer ? toDollars(agreedCents(offer)) : undefined}
            sold={found.sold}
          />
        ) : (
          <OfferForm
            listing={listing}
            store={store}
            live={{
              listingId: found.row.id,
              shipping: found.shipping.tracked,
              hours: found.offerHours,
              current: offer && {
                amount: toDollars(offer.amountCents)!,
                counter: offer.status === "countered" ? (toDollars(offer.counterCents) ?? null) : null,
              },
            }}
          />
        )}
      </main>
    </>
  );
}
