import "server-only";
import { createElement, type ReactElement } from "react";
import {
  OfferReceivedEmail,
  offerReceivedSubject,
  OfferUpdateEmail,
  offerUpdateSubject,
  render,
  ShippedEmail,
  shippedSubject,
  SoldEmail,
  soldSubject,
  toPlainText,
} from "@repo/email";
import { db, eq, listing, offer, orders, shop, user } from "@repo/db";
import { siteUrl, storeUrl } from "../urls";
import { coverPhotos } from "./listings";
import { sendEmail } from "./email";

/*
 * Emails after commerce actions. Called after the action has succeeded and
 * never throws: a failed email is logged, the sale or offer stands. Test
 * accounts (@example.com) never get mail; what would have gone is logged.
 *
 *   seller: offer received, sold
 *   buyer:  offer accepted / countered / declined, shipped
 */

export const dollars = (cents: number) => cents / 100;

export function firstName(p: { name: string | null; email: string }) {
  return (p.name?.trim() || p.email.split("@")[0]!).split(/\s+/)[0]!;
}

/** Emails need absolute image links; uploads are served from /api/files/{id}. */
export function absolute(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http") ? url : siteUrl(url);
}

/** "Saturday, 2:11 pm" */
export function when(date: Date) {
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day}, ${time}`;
}

export async function deliver(to: string, subject: string, react: ReactElement) {
  if (to.toLowerCase().endsWith("@example.com")) {
    // Test accounts: show what would have gone, never send it
    const text = toPlainText(await render(react));
    console.info(`\n[email] not sent (test address) to ${to}: ${subject}\n${text}\n`);
    return;
  }
  await sendEmail({ to, subject, react });
}

/** Runs one notification, logging instead of throwing. */
export async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[email] ${label} failed`, error);
  }
}

export async function loadOffer(offerId: string) {
  const [row] = await db
    .select({ offer, listing, shop, buyer: user })
    .from(offer)
    .innerJoin(listing, eq(listing.id, offer.listingId))
    .innerJoin(shop, eq(shop.id, offer.shopId))
    .innerJoin(user, eq(user.id, offer.buyerId))
    .where(eq(offer.id, offerId));
  if (!row) return null;
  const [seller] = await db.select().from(user).where(eq(user.id, row.shop.ownerId));
  const photo = (await coverPhotos([row.listing.id])).get(row.listing.id);
  const title = row.listing.title ?? row.listing.name ?? "Your listing";
  return { ...row, seller: seller!, item: { title, imageUrl: absolute(photo) } };
}

export async function loadOrder(orderId: string) {
  const [row] = await db
    .select({ order: orders, listing, shop, buyer: user })
    .from(orders)
    .innerJoin(listing, eq(listing.id, orders.listingId))
    .innerJoin(shop, eq(shop.id, orders.shopId))
    .innerJoin(user, eq(user.id, orders.buyerId))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const [seller] = await db.select().from(user).where(eq(user.id, row.shop.ownerId));
  const photo = (await coverPhotos([row.listing.id])).get(row.listing.id);
  const title = row.listing.title ?? row.listing.name ?? "Your order";
  return { ...row, seller: seller!, item: { title, imageUrl: absolute(photo) } };
}

/** Seller: someone made an offer. */
export function notifyOfferReceived(offerId: string) {
  return safely("offer received", async () => {
    const row = await loadOffer(offerId);
    if (!row) return;
    const price = row.listing.priceCents ?? 0;
    const lowest =
      row.listing.lowestCents ?? Math.round((price * (100 - row.shop.lowestPercent)) / 100 / 100) * 100;
    const props = {
      buyer: firstName(row.buyer),
      amount: dollars(row.offer.amountCents),
      asking: dollars(price),
      lowest: dollars(lowest),
      hold: row.offer.depositCents ? dollars(row.offer.depositCents) : null,
      listing: row.item,
      expires: when(row.offer.expiresAt),
      offerUrl: siteUrl(`/offers/${row.offer.id}`),
    };
    await deliver(row.seller.email, offerReceivedSubject(props), createElement(OfferReceivedEmail, props));
  });
}

/** Buyer: the seller accepted, countered or declined. */
export function notifyOfferAnswered(offerId: string) {
  return safely("offer update", async () => {
    const row = await loadOffer(offerId);
    if (!row) return;
    const status = row.offer.status;
    if (status !== "accepted" && status !== "countered" && status !== "declined") return;
    const listingUrl = row.listing.slug ? storeUrl(row.shop.slug, `/${row.listing.slug}`) : siteUrl("/account");
    const url = {
      accepted: siteUrl(`/checkout/${row.listing.id}`),
      countered: siteUrl("/account"),
      declined: listingUrl,
    }[status];
    const props = {
      status,
      shop: row.shop.name,
      // Once accepted, the amount is what was agreed (their offer, or the counter)
      amount: dollars(status === "accepted" ? (row.offer.counterCents ?? row.offer.amountCents) : row.offer.amountCents),
      counter: row.offer.counterCents != null ? dollars(row.offer.counterCents) : null,
      hold: row.offer.depositCents ? dollars(row.offer.depositCents) : null,
      listing: row.item,
      deadline: status === "declined" ? null : when(row.offer.expiresAt),
      url,
    };
    await deliver(row.buyer.email, offerUpdateSubject(props), createElement(OfferUpdateEmail, props));
  });
}

/** Seller: it sold. "You get" is the sale less our fee and PayPal's (none on a test checkout). */
export function notifySold(orderId: string) {
  return safely("sold", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const shipBy = new Date(row.order.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const props = {
      buyer: firstName(row.buyer),
      listing: row.item,
      price: dollars(row.order.itemCents),
      deductions: [
        ...(row.order.shippingCents
          ? [{ label: "Shipping, paid by the buyer", amount: dollars(row.order.shippingCents) }]
          : []),
        ...(row.order.platformFeeCents
          ? [{ label: "resell.store fee", amount: -dollars(row.order.platformFeeCents) }]
          : []),
        ...(row.order.paypalFeeCents ? [{ label: "PayPal fee", amount: -dollars(row.order.paypalFeeCents) }] : []),
      ],
      payout: dollars(row.order.sellerNetCents ?? row.order.totalCents),
      shipBy: shipBy.toLocaleDateString("en-US", { weekday: "long" }),
      shipTo: [row.order.shipTo.name, row.order.shipTo.country].filter(Boolean).join(", "),
      labelUrl: siteUrl("/sales"),
      saleUrl: siteUrl("/sales"),
    };
    await deliver(row.seller.email, soldSubject(props), createElement(SoldEmail, props));
  });
}

/** A carrier and tracking page for the common US formats; otherwise the order page. */
function carrierFor(tracking: string | null, fallbackUrl: string) {
  const n = tracking?.replace(/\s+/g, "") ?? "";
  if (/^1Z[0-9A-Z]{16}$/i.test(n))
    return { carrier: "UPS", url: `https://www.ups.com/track?tracknum=${n}` };
  if (/^(94|93|92|95)\d{18,20}$/.test(n))
    return { carrier: "USPS", url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` };
  return { carrier: "the carrier", url: fallbackUrl };
}

/** Buyer: it's on its way. */
export function notifyShipped(orderId: string) {
  return safely("shipped", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const orderUrl = siteUrl("/account");
    const { carrier, url } = carrierFor(row.order.trackingNumber, orderUrl);
    const props = {
      shop: row.shop.name,
      listing: row.item,
      carrier,
      trackingNumber: row.order.trackingNumber ?? "No tracking number added",
      trackingUrl: url,
      orderUrl,
    };
    await deliver(row.buyer.email, shippedSubject(props), createElement(ShippedEmail, props));
  });
}
