/*
 * The long-form side of a listing for P3/P9: photo views, story, details.
 * The camera is written out in full; every other listing gets a believable
 * page generated from its card data in mock-market.ts.
 */

import type { ArtKey } from "../components/market/art";
import type { Listing, Store } from "./mock-market";

export type PhotoView = { art: ArtKey; caption: string };

export type DetailRow = {
  label: string;
  value: string;
  /** Shown before "See all" on mobile. Falls back to the first five. */
  essential?: boolean;
};

export type ListingDetail = {
  /** What the item is called in running copy: "camera", "boots" */
  noun: string;
  plural?: boolean;
  /** Third breadcrumb step: Shop / Tech / Cameras */
  subcategory?: string;
  subtitle: string;
  photos: PhotoView[];
  description: string[];
  /** Shorter story shown on mobile before "Read the whole story" */
  summary?: string;
  details: DetailRow[];
  listedNote: string;
  /** Delivery window, or null when the item is pickup only */
  arrives: string | null;
};

const camera: ListingDetail = {
  noun: "camera",
  subcategory: "Cameras",
  subtitle: "Made in 1978. Serviced, and tested with a roll of film last week.",
  photos: [
    { art: "camera", caption: "Front, in daylight" },
    { art: "cameraTop", caption: "Top plate and shutter dial" },
    { art: "cameraBack", caption: "Back, film door closed" },
    { art: "cameraLens", caption: "The 50mm lens, clear glass" },
    { art: "cameraCase", caption: "Case, strap and lens cap" },
    { art: "cameraSample", caption: "A frame from the test roll" },
  ],
  description: [
    "This is the camera a lot of people learned on, and it is still one of the easiest ways into film. Fully mechanical feel, a bright viewfinder, and a built-in light meter that tells you when the exposure is right.",
    "I bought it from the original owner's family in Portland. I replaced the light seals and the mirror foam, cleaned the viewfinder, and ran a roll of colour film through it last week. Every shutter speed sounds right and the frames came back evenly exposed. Photo 6 is from that roll.",
    "The honest part: there is a little brassing on the top plate near the shutter dial and a faint mark on the base. Neither affects anything. The lens glass is clear, with no haze, fungus or scratches.",
  ],
  summary:
    "This is the camera a lot of people learned on, and it is still one of the easiest ways into film. I replaced the light seals, cleaned the viewfinder, and ran a roll of colour film through it last week.",
  details: [
    { label: "Year", value: "1978", essential: true },
    { label: "Condition", value: "Excellent, light wear", essential: true },
    { label: "Film", value: "35mm" },
    { label: "Lens", value: "50mm f/1.8, clear glass", essential: true },
    { label: "Shutter", value: "All speeds tested" },
    { label: "Light meter", value: "Working, battery included", essential: true },
    { label: "Light seals", value: "Replaced this year" },
    { label: "Comes with", value: "Strap, lens cap, case" },
    { label: "Flaws", value: "Small brassing on top plate", essential: true },
  ],
  listedNote: "Listed 2 days ago. 14 people are watching.",
  arrives: "October 8 to 10",
};

const written: Record<string, ListingDetail> = {
  "secondshutter/35mm-film-camera": camera,
};

/** How each drawing reads in a sentence ("until the boots arrive"). */
const nouns: Partial<Record<ArtKey, { noun: string; plural?: boolean }>> = {
  dress: { noun: "dress" },
  sweater: { noun: "sweater" },
  tote: { noun: "tote" },
  sunHat: { noun: "hat" },
  boots: { noun: "boots", plural: true },
  stripedTee: { noun: "tee" },
  scarf: { noun: "scarf" },
  mugs: { noun: "mugs", plural: true },
  lens: { noun: "lens" },
  rangefinder: { noun: "camera" },
  lightMeter: { noun: "light meter" },
  filmRolls: { noun: "film", plural: true },
  record: { noun: "record" },
  lamp: { noun: "lamp" },
  card: { noun: "card" },
  chair: { noun: "chair" },
};

/** A stable small number per listing, so generated copy doesn't jump between renders. */
function seed(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

/** Today is October 2; it ships within N days and spends about four in transit. */
function arrivalWindow(shipsIn: string) {
  const days = parseInt(shipsIn, 10);
  if (Number.isNaN(days)) return null;
  const start = 6 + days;
  return `October ${start} to ${start + 2}`;
}

function generated(listing: Listing, store: Store): ListingDetail {
  const { noun, plural } = nouns[listing.art] ?? { noun: "item" };
  const name = listing.fullTitle ?? listing.title;
  const watching = 3 + (seed(listing.slug) % 12);
  return {
    noun,
    plural,
    subcategory: listing.section,
    subtitle: `${listing.short}.`,
    photos: [{ art: listing.art, caption: "Front, in daylight" }],
    description: [
      `${name}, ${listing.short.charAt(0).toLowerCase()}${listing.short.slice(1)}.`,
      store.bio,
      "The photos are of this exact one. Ask if you want measurements or another angle.",
    ],
    details: [
      {
        label: "Category",
        value: listing.section ? `${listing.category}, ${listing.section}` : listing.category,
      },
      { label: "Condition", value: listing.short },
      { label: "Ships from", value: store.location },
      {
        label: "Ships within",
        value: store.shipsIn === "Pickup" ? "Pickup only" : store.shipsIn,
      },
      { label: "Offers", value: listing.openToOffers ? "Welcome" : "Price is firm" },
    ],
    listedNote: `${listing.justListed ? "Listed today" : "Listed last week"}. ${watching} people are watching.`,
    arrives: arrivalWindow(store.shipsIn),
  };
}

export function getListingDetail(listing: Listing, store: Store): ListingDetail {
  return written[`${listing.store}/${listing.slug}`] ?? generated(listing, store);
}
