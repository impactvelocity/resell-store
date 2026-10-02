/*
 * Checkout and offer data for P4/P5/P10. Front-end only: the buyer, their
 * address and the agent connection are made up. Every amount is derived from
 * the listing, so any listing slug works.
 */

import type { ArtKey } from "../components/market/art";
import type { Listing } from "./mock-market";

export const buyer = {
  name: "Maya Rivera",
  email: "maya@example.com",
  address: "2418 Alder Street, Apt 3, Vancouver, BC V6H 1S5",
  country: "Canada",
};

/** The buyer's connected assistant and the spending limit they gave it. */
export const agent = {
  name: "Claude",
  connected: true,
  limit: 200,
};

export type DeliveryId = "tracked" | "express";

export type DeliveryOption = {
  id: DeliveryId;
  label: string;
  arrives: string;
  price: number;
};

/** Tracked costs what the listing says; express is a flat step up. */
export function deliveryOptions(listing: Listing): DeliveryOption[] {
  return [
    { id: "tracked", label: "Tracked", arrives: "October 8 to 10", price: listing.shipping },
    { id: "express", label: "Express", arrives: "October 5 to 6", price: listing.shipping + 12 },
  ];
}

export type PayMethod = "paypal" | "later" | "card" | "agent";

/** Pay Later splits the total into this many payments, two weeks apart. */
export const payLaterInstalments = 4;

/** Deposit amounts offered on P5. Only those below the offer are shown. */
export const depositOptions = [10, 20, 40];

/** How long an offer stays open. */
export const offerHours = 48;

/** What to call the thing in sentences ("until the camera is in your hands"). */
const nouns: Partial<Record<ArtKey, { one: string; plural?: boolean }>> = {
  camera: { one: "camera" },
  rangefinder: { one: "camera" },
  lens: { one: "lens" },
  lightMeter: { one: "light meter" },
  filmRolls: { one: "film" },
  dress: { one: "dress" },
  sweater: { one: "sweater" },
  tote: { one: "tote" },
  sunHat: { one: "hat" },
  boots: { one: "boots", plural: true },
  stripedTee: { one: "tee" },
  scarf: { one: "scarf" },
  mugs: { one: "mugs", plural: true },
  record: { one: "record" },
  lamp: { one: "lamp" },
  card: { one: "card" },
  chair: { one: "chair" },
};

export function itemNoun(listing: Listing) {
  const n = nouns[listing.art] ?? { one: "item" };
  return {
    noun: n.one,
    label: capitalise(n.one),
    is: n.plural ? "are" : "is",
    arrives: n.plural ? "arrive" : "arrives",
    ships: n.plural ? "ship" : "ships",
  };
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A sensible opening offer: about 14% under asking, to the nearest $5. */
export function suggestedOffer(price: number) {
  const n = Math.round((price * 0.86) / 5) * 5;
  return Math.max(1, Math.min(n, price - 1));
}

/** "$152" when whole, "$38.50" otherwise. */
export function shortPrice(n: number) {
  return Number.isInteger(n)
    ? `$${n.toLocaleString("en-US")}`
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "1 hour" → "within the hour", "3 hours" → "within 3 hours". */
export function answersWithin(repliesIn: string) {
  return repliesIn === "1 hour" ? "within the hour" : `within ${repliesIn}`;
}
