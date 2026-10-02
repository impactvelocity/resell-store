import type { ListingDetail } from "../../../lib/mock-listing-detail";
import type { Listing, Store } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";

/* Sentences the listing page builds from its data, shared by desktop and mobile. */

export const city = (store: Store) => store.location.split(",")[0]!;

/** "4.9 from 173 buyers, 214 sold" (+ ", Portland" on desktop) */
export function sellerLine(store: Store, withCity: boolean) {
  const line = `${store.rating.toFixed(1)} from ${store.ratings} buyers, ${store.sold} sold`;
  return withCity ? `${line}, ${city(store)}` : line;
}

/** "plus $12 tracked shipping", or pickup when there's no postage. */
export function shippingLine(listing: Listing, store: Store, short = false) {
  if (listing.shipping === 0) return `pickup in ${city(store)}`;
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

export function deliveryTitle(detail: ListingDetail, store: Store) {
  return detail.arrives ? `Arrives ${detail.arrives}` : `Pickup in ${city(store)}`;
}

export function askNote(store: Store) {
  const within = store.repliesIn === "1 hour" ? "the hour" : store.repliesIn;
  return `The store's agent answers right away. ${store.owner} follows up within ${within}.`;
}
