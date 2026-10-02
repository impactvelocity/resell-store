import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "../../../../components/market/checkout/checkout-form";
import { CheckoutHeader } from "../../../../components/market/checkout/checkout-header";
import { findListing, getStore } from "../../../../lib/mock-market";

export const metadata: Metadata = { title: "Checkout · resell.store" };

/** P4 (desktop) and P10 (phone): buying one listing, e.g. /checkout/35mm-film-camera. */
export default async function CheckoutPage({ params }: { params: Promise<{ listing: string }> }) {
  const listing = findListing((await params).listing);
  const store = listing && getStore(listing.store);
  if (!listing || !store) notFound();

  return (
    <>
      <CheckoutHeader store={store.slug} listing={listing.slug} title="Checkout" />
      <main>
        <CheckoutForm listing={listing} store={store} />
      </main>
    </>
  );
}
