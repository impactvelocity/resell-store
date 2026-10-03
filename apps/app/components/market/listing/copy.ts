import type { ListingDetail } from "../../../lib/mock-listing-detail";
import type { PublicListing, PublicStore } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";

/* Sentences the listing page builds from its data, shared by desktop and mobile. */

/** "Portland", or undefined when a live store hasn't said where it is. */
export const city = (store: PublicStore) => store.location?.split(",")[0]?.trim() || undefined;

/** Pickup only. Prototype listings say so by having no delivery window. */
export const isPickup = (detail: ListingDetail) => detail.pickup ?? detail.arrives === null;

/** "4.9 from 173 buyers, 214 sold" (+ ", Portland" on desktop). New stores just say so. */
export function sellerLine(store: PublicStore, withCity: boolean) {
  const line =
    store.rating != null
      ? `${store.rating.toFixed(1)} from ${store.ratings} buyers, ${store.sold} sold`
      : store.sold > 0
        ? `${store.sold} sold`
        : "New on resell.store";
  const where = city(store);
  return withCity && where ? `${line}, ${where}` : line;
}

/** "plus $12 tracked shipping", or pickup when there's no postage. */
export function shippingLine(listing: PublicListing, store: PublicStore, short = false) {
  if (listing.shipping === null) return "plus shipping";
  if (listing.shipping === 0) {
    const where = city(store);
    return where ? `pickup in ${where}` : "pickup only";
  }
  return `plus ${formatPrice(listing.shipping)}${short ? "" : " tracked"} shipping`;
}

/** "the camera arrives" / "the boots arrive" */
export function arrivesPhrase(detail: ListingDetail) {
  return `the ${detail.noun} ${detail.plural ? "arrive" : "arrives"}`;
}

/** "About this camera" / "About these boots" */
export function aboutHeading(detail: ListingDetail) {
  return `About ${detail.plural ? "these" : "this"} ${detail.noun}`;
}

export function deliveryTitle(detail: ListingDetail, store: PublicStore) {
  if (detail.arrives) return `Arrives ${detail.arrives}`;
  const where = city(store);
  if (isPickup(detail)) return where ? `Pickup in ${where}` : "Pickup only";
  return where ? `Ships from ${where}` : "Tracked shipping";
}

/** The line under the delivery reassurance in the buy box. */
export function deliveryNote(detail: ListingDetail, store: PublicStore) {
  const where = city(store);
  if (detail.arrives)
    return `Ships from ${where} within ${store.shipsIn}, tracked to Vancouver. You get the tracking link as soon as it is posted.`;
  if (isPickup(detail))
    return `Pay here, then pick a time with ${store.owner}. Your money stays held until it is in your hands.`;
  return `${store.owner} ships it tracked${where ? ` from ${where}` : ""}. You get the tracking link as soon as it is posted.`;
}

export function askNote(store: PublicStore) {
  // Live stores have no reply-time history yet, so promise nothing about replies
  if (!store.repliesIn) return `${store.owner} gets your message right away.`;
  const within = store.repliesIn === "1 hour" ? "the hour" : store.repliesIn;
  return `The store's agent answers right away. ${store.owner} follows up within ${within}.`;
}
