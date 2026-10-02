import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutHeader } from "../../../../components/market/checkout/checkout-header";
import { OfferForm } from "../../../../components/market/checkout/offer-form";
import { findListing, getStore } from "../../../../lib/mock-market";

export const metadata: Metadata = { title: "Make an offer · resell.store" };

/** P5: offering under asking, with an optional deposit, e.g. /offer/35mm-film-camera. */
export default async function OfferPage({ params }: { params: Promise<{ listing: string }> }) {
  const listing = findListing((await params).listing);
  const store = listing && getStore(listing.store);
  if (!listing || !store) notFound();

  return (
    <>
      <CheckoutHeader store={store.slug} listing={listing.slug} title="Make an offer" />
      <main>
        <OfferForm listing={listing} store={store} />
      </main>
    </>
  );
}
