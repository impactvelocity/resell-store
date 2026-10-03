import "server-only";
import type { Metadata } from "next";
import { isShareableListing, isShareableShop, listingShare, storeShare } from "../og";
import { coverPhotos } from "./listings";
import { getPublicListing, getPublicStore, storeShelf, storeSold } from "./market";

/*
 * Data for share previews. Everything here is what a signed-out visitor may
 * see, then narrowed further: private shops, drafts and link-only listings
 * never show up in a preview or a share image (link-only means "whoever I
 * send it to", not "anyone the link gets forwarded to").
 */

/**
 * A store as it may appear in a share image: the store and up to `photos`
 * things, listed ones first, topped up from what it sold (its public Sold tab).
 */
export async function shareableStore(slug: string, photos = 3) {
  const found = await getPublicStore(slug, null);
  if (!found || !isShareableShop(found.shop)) return null;
  const listed = (await storeShelf(found.shop, { limit: photos })).map((l) => ({
    title: l.title,
    photo: l.photo,
    sold: false,
  }));
  const sold =
    listed.length < photos
      ? (await storeSold(found.shop, photos - listed.length)).map((l) => ({ title: l.title, photo: l.photo, sold: true }))
      : [];
  return { store: found.store, shop: found.shop, items: [...listed, ...sold] };
}

/** A listing as it may appear in a share image, with its cover photo URL. */
export async function shareableListing(storeSlug: string, listingSlug: string) {
  const found = await getPublicListing(storeSlug, listingSlug, null);
  if (!found || !isShareableShop(found.shop) || !isShareableListing(found.row)) return null;
  const cover = (await coverPhotos([found.row.id])).get(found.row.id);
  return { store: found.store, shop: found.shop, row: found.row, listing: found.listing, cover };
}

/**
 * generateMetadata for a store's home page. The viewer's own view sets the
 * <title> (an owner sees their private shop's name); the share tags only come
 * when the store may be shared.
 */
export async function storePageMetadata(slug: string, viewerId?: string | null): Promise<Metadata> {
  const seen = await getPublicStore(slug, viewerId);
  if (!seen) return { title: "resell.store" };
  if (!isShareableShop(seen.shop)) {
    return { title: `${seen.store.name} · resell.store`, robots: { index: false, follow: false } };
  }
  return storeShare(seen.store);
}

/** generateMetadata for a listing page, on the same terms as storePageMetadata. */
export async function listingPageMetadata(
  storeSlug: string,
  listingSlug: string,
  viewerId?: string | null,
): Promise<Metadata> {
  const seen = await getPublicListing(storeSlug, listingSlug, viewerId);
  if (!seen) return { title: "resell.store" };
  const title = `${seen.listing.fullTitle ?? seen.listing.title} · ${seen.store.name}`;
  if (!isShareableShop(seen.shop) || !isShareableListing(seen.row)) {
    return { title, robots: { index: false, follow: false } };
  }
  return listingShare(
    {
      slug: seen.row.slug!,
      title: seen.listing.title,
      fullTitle: seen.listing.fullTitle,
      oneLiner: seen.row.oneLiner,
      description: seen.row.description,
      priceCents: seen.row.priceCents,
      sold: seen.row.status === "sold",
    },
    seen.store,
  );
}
