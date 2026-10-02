import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "../../../../components/market/listing/listing-view";
import { getListingDetail } from "../../../../lib/mock-listing-detail";
import { getListing, getStore, storeListings } from "../../../../lib/mock-market";

/* P3 (desktop) and P9 (mobile): maya.resell.store/linen-wrap-dress */

type Props = { params: Promise<{ store: string; listing: string }> };

function load(storeSlug: string, slug: string) {
  const store = getStore(storeSlug);
  const listing = store && getListing(store.slug, slug);
  return store && listing ? { store, listing } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store, listing } = await params;
  const found = load(store, listing);
  if (!found) return { title: "resell.store" };
  return {
    title: `${found.listing.fullTitle ?? found.listing.title} · ${found.store.name}`,
  };
}

export default async function ListingPage({ params }: Props) {
  const found = load((await params).store, (await params).listing);
  if (!found) notFound();
  const { store, listing } = found;

  const more = storeListings(store.slug)
    .filter((l) => l.slug !== listing.slug)
    .slice(0, 4);

  return (
    <ListingView
      listing={listing}
      store={store}
      detail={getListingDetail(listing, store)}
      more={more}
    />
  );
}
