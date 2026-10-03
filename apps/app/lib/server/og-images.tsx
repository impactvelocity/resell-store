import "server-only";
import { ListingCard, StoreCard } from "../../components/og/cards";
import { formatCents } from "../money";
import { storeDomain } from "../urls";
import { ogPhoto } from "./og-photos";
import { renderOg, siteImage } from "./og-render";
import { shareableListing, shareableStore } from "./share";

/*
 * The store and listing share images. Anything a signed-out visitor couldn't
 * find on their own (a private shop, a draft, a link-only listing, a typo)
 * gets the plain brand image, so the route never confirms what exists.
 */

export async function storeImage(slug: string) {
  const found = await shareableStore(slug);
  if (!found) return siteImage();
  const { store, items } = found;
  const [picture, ...photos] = await Promise.all([ogPhoto(store.picture), ...items.map((l) => ogPhoto(l.photo))]);
  return renderOg(
    <StoreCard
      name={store.name}
      domain={storeDomain(store.slug)}
      tone={store.tone}
      picture={picture ?? null}
      location={store.location}
      forSale={store.forSale}
      tagline={store.tagline}
      items={items.map((l, i) => ({ title: l.title, sold: l.sold, photo: photos[i] ?? null }))}
    />,
  );
}

export async function listingImage(storeSlug: string, listingSlug: string) {
  const found = await shareableListing(storeSlug, listingSlug);
  if (!found) return siteImage();
  const { store, row, listing, cover } = found;
  const [photo, picture] = await Promise.all([ogPhoto(cover), ogPhoto(store.picture)]);
  return renderOg(
    <ListingCard
      title={listing.title}
      price={formatCents(row.priceCents)}
      sold={row.status === "sold"}
      blurb={row.oneLiner ?? undefined}
      photo={photo}
      shop={{ name: store.name, tone: store.tone, picture }}
    />,
  );
}
