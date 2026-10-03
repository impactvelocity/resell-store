import { formatPrice } from "../listing-live/format";
import type { SellerOffer, SellerOrder } from "./data";

/*
 * Plain helpers for the seller's offers and sales. No "use client", so server
 * components (the inbox) and client components can both call them.
 */

export const money = (cents: number | null | undefined) => formatPrice(cents) ?? "$0";

/** How the money works, said once wherever a sale or an offer is about to happen. */
export const PAYMENT_NOTE = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  ? "PayPal holds the buyer's money until they have it."
  : "Test checkout: no money moves yet. PayPal is next.";

/* ---------- Offer maths ---------- */

/** "Above your lowest" / "At your lowest" / "Under your lowest", or null without one. */
export function versusLowest(amountCents: number, lowestCents: number | null) {
  if (lowestCents == null) return null;
  if (amountCents > lowestCents) return { label: "Above your lowest", good: true };
  if (amountCents === lowestCents) return { label: "At your lowest", good: true };
  return { label: "Under your lowest", good: false };
}

/** "$15 under your $110 price." */
export function versusAsking(amountCents: number, askingCents: number | null) {
  if (askingCents == null) return null;
  const gap = askingCents - amountCents;
  return gap > 0 ? `${money(gap)} under your ${money(askingCents)} price` : `Your price is ${money(askingCents)}`;
}

/** Whole-dollar range a counter can sit in: above their offer, under the price. */
export function counterRange(offer: Pick<SellerOffer, "amountCents" | "askingCents" | "lowestCents">) {
  if (offer.askingCents == null) return null;
  const min = Math.floor(offer.amountCents / 100) + 1;
  const max = Math.ceil(offer.askingCents / 100) - 1;
  if (min > max) return null;
  const lowest = offer.lowestCents != null ? Math.round(offer.lowestCents / 100) : null;
  const mid = Math.round((min + max) / 2);
  const start = Math.min(max, Math.max(min, lowest != null && lowest > mid ? lowest : mid));
  return { min, max, start, step: max - min >= 20 ? 5 : 1 };
}

/** What happened to an offer, in a line. */
export function offerNote(offer: SellerOffer) {
  const who = offer.buyer.firstName;
  switch (offer.status) {
    case "countered":
      return `${offer.counteredBy === "agent" ? "Your agent" : "You"} countered at ${money(offer.counterCents)}. ${offer.timeLeft ? `${who} has ${offer.timeLeft.replace(" left", "")} to answer.` : ""}`.trim();
    case "accepted":
      return `Waiting for ${who} to pay${offer.counterCents ? ` ${money(offer.counterCents)}` : ""}.${offer.timeLeft ? ` ${offer.timeLeft}.` : ""}`;
    case "paid":
      return `${who} paid. It's a sale.`;
    case "declined":
      if (offer.closedBySale) return "Closed on its own when it sold.";
      return offer.counterCents
        ? `${who} turned down ${offer.counteredBy === "agent" ? "your agent's" : "your"} ${money(offer.counterCents)} counter.`
        : "You said no.";
    case "withdrawn":
      return `${who} took it back.`;
    case "expired":
      return "Nobody answered in time, so it ran out.";
    default:
      return offer.note ?? `${offer.when}.`;
  }
}

/** Where an order is going, in a line: "Sam Lee, United States". */
export function shipToLine(order: Pick<SellerOrder, "shipTo">) {
  return [order.shipTo.name, order.shipTo.country].filter(Boolean).join(", ");
}
