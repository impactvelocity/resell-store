import "server-only";
import { createElement } from "react";
import {
  NoticeEmail,
  noticeSubject,
  OrderPlacedEmail,
  orderPlacedSubject,
  PaidOutEmail,
  paidOutSubject,
  type NoticeEmailProps,
} from "@repo/email";
import { asc, db, dispute, disputeEvent, eq, review, type OfferStatus } from "@repo/db";
import { siteUrl, storeUrl } from "../urls";
import { disputeReasons } from "./disputes";
import { autoCancelAt, CHECK_DAYS, releaseAt, shipBy } from "./payout-policy";
import { deliver, dollars, firstName, loadOffer, loadOrder, safely, when } from "./notify";

/*
 * Emails after the sale and around offers, sent by the sweeps (sweeps.ts) and
 * by the refund and problem actions. Same rules as notify.ts: never throws,
 * test accounts are logged instead of mailed. All of them use NoticeEmail;
 * the words are here.
 */

/** "$20", "$20.50" from cents. */
const money = (cents: number) => {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
};

const buyerOrderUrl = (orderId: string) => siteUrl(`/account/orders/${orderId}`);
const sellerOrderUrl = (orderId: string) => siteUrl(`/sales/${orderId}`);

function send(to: string, props: NoticeEmailProps) {
  return deliver(to, noticeSubject(props), createElement(NoticeEmail, props));
}

/* Offers */

/** Seller: an offer is about to run out unanswered. */
export function notifyOfferAnswerReminder(offerId: string) {
  return safely("offer answer reminder", async () => {
    const row = await loadOffer(offerId);
    if (!row) return;
    const buyer = firstName(row.buyer);
    await send(row.seller.email, {
      subject: `${buyer}'s ${money(row.offer.amountCents)} offer runs out soon`,
      preview: `Answer by ${when(row.offer.expiresAt)} or it lapses.`,
      tag: { label: "Offer waiting", tone: "pink" },
      title: `${buyer} is still waiting`,
      lead: `${buyer} offered ${money(row.offer.amountCents)} for ${row.item.title}. Accept, counter or decline by ${when(row.offer.expiresAt)}, or the offer runs out.`,
      listing: { ...row.item, meta: `Asking ${money(row.listing.priceCents ?? 0)}` },
      actions: [{ label: "Answer the offer", href: siteUrl(`/offers/${row.offer.id}`) }],
      reason: "an offer needs you",
    });
  });
}

/** Buyer: an accepted offer to pay for, or a counter to answer, is about to run out. */
export function notifyOfferBuyerReminder(offerId: string) {
  return safely("offer buyer reminder", async () => {
    const row = await loadOffer(offerId);
    if (!row) return;
    const accepted = row.offer.status === "accepted";
    const agreed = row.offer.counterCents ?? row.offer.amountCents;
    await send(row.buyer.email, {
      subject: accepted
        ? `Pay for ${row.item.title} by ${when(row.offer.expiresAt)}`
        : `${row.shop.name}'s counter runs out soon`,
      preview: accepted
        ? `${row.shop.name} took your offer of ${money(agreed)}. It lapses if it isn't paid in time.`
        : `They countered at ${money(row.offer.counterCents ?? 0)}. Take it or leave it by ${when(row.offer.expiresAt)}.`,
      tag: { label: accepted ? "Pay soon" : "Counter waiting", tone: "lemon" },
      title: accepted ? "Don't miss it" : "They're waiting on you",
      lead: accepted
        ? `${row.shop.name} accepted ${money(agreed)} for ${row.item.title}. Pay by ${when(row.offer.expiresAt)} to make it yours; after that it goes back on sale.`
        : `${row.shop.name} countered your ${money(row.offer.amountCents)} with ${money(row.offer.counterCents ?? 0)}. Answer by ${when(row.offer.expiresAt)} or the counter runs out.`,
      listing: { ...row.item, meta: `From ${row.shop.name}` },
      actions: [
        accepted
          ? { label: `Pay ${money(agreed)}`, href: siteUrl(`/checkout/${row.listing.id}`) }
          : { label: "Answer the counter", href: siteUrl("/account#offers") },
      ],
      reason: "an offer needs you",
    });
  });
}

/**
 * An offer ran out. `was` is its status before: open (the seller didn't
 * answer), countered (the buyer didn't) or accepted (the buyer didn't pay).
 */
export function notifyOfferExpired(offerId: string, was: OfferStatus) {
  return safely("offer expired", async () => {
    const row = await loadOffer(offerId);
    if (!row) return;
    const buyer = firstName(row.buyer);
    const listingUrl = row.listing.slug ? storeUrl(row.shop.slug, `/${row.listing.slug}`) : siteUrl("/discover");
    const agreed = money(row.offer.counterCents ?? row.offer.amountCents);
    const reason = "an offer runs out";

    if (was === "open") {
      await send(row.buyer.email, {
        subject: `Your offer on ${row.item.title} ran out`,
        preview: `${row.shop.name} didn't answer in time. It may still be for sale.`,
        tag: { label: "Ran out", tone: "muted" },
        title: "No answer this time",
        lead: `${row.shop.name} didn't answer your ${money(row.offer.amountCents)} offer in time, so it ran out. Nothing was charged.`,
        listing: { ...row.item, meta: `Asking ${money(row.listing.priceCents ?? 0)}` },
        actions: [{ label: "Take another look", href: listingUrl }],
        reason,
      });
      await send(row.seller.email, {
        subject: `${buyer}'s offer ran out`,
        preview: `You didn't answer ${buyer}'s ${money(row.offer.amountCents)} offer in time.`,
        tag: { label: "Missed", tone: "muted" },
        title: "That one got away",
        lead: `${buyer}'s ${money(row.offer.amountCents)} offer for ${row.item.title} ran out before you answered. Your listing is still up.`,
        listing: row.item,
        actions: [{ label: "See your offers", href: siteUrl("/inbox") }],
        small: "Tip: turn on the store agent in shop settings and it can answer offers for you within your limits.",
        reason,
      });
      return;
    }

    if (was === "countered") {
      await send(row.seller.email, {
        subject: `${buyer} didn't answer your counter`,
        preview: `Your ${money(row.offer.counterCents ?? 0)} counter for ${row.item.title} ran out.`,
        tag: { label: "Ran out", tone: "muted" },
        title: "No answer to your counter",
        lead: `${buyer} didn't take or turn down your ${money(row.offer.counterCents ?? 0)} counter in time. ${row.item.title} is still for sale.`,
        listing: row.item,
        actions: [{ label: "See your offers", href: siteUrl("/inbox") }],
        reason,
      });
      return;
    }

    if (was === "accepted") {
      await send(row.buyer.email, {
        subject: `Your deal on ${row.item.title} lapsed`,
        preview: `It wasn't paid in time, so it's back on sale.`,
        tag: { label: "Lapsed", tone: "muted" },
        title: "That deal lapsed",
        lead: `${row.shop.name} accepted ${agreed}, but it wasn't paid in time, so it's back on sale. Nothing was charged.`,
        listing: row.item,
        actions: [{ label: "Buy it now", href: listingUrl }],
        reason,
      });
      await send(row.seller.email, {
        subject: `${buyer} didn't pay for ${row.item.title}`,
        preview: `The ${agreed} deal lapsed. It's still listed at your price.`,
        tag: { label: "Lapsed", tone: "muted" },
        title: "They didn't pay in time",
        lead: `${buyer} didn't pay the ${agreed} you agreed on, so the deal lapsed. ${row.item.title} is still for sale at ${money(row.listing.priceCents ?? 0)}.`,
        listing: row.item,
        actions: [{ label: "See your offers", href: siteUrl("/inbox") }],
        reason,
      });
    }
  });
}

/* Shipping */

/** Seller: it's past the ship-by date and still not marked shipped. */
export function notifyShipReminder(orderId: string) {
  return safely("ship reminder", async () => {
    const row = await loadOrder(orderId);
    if (!row || row.order.status !== "paid") return;
    const buyer = firstName(row.buyer);
    await send(row.seller.email, {
      subject: `Did you ship ${row.item.title}?`,
      preview: `${buyer} paid ${when(row.order.createdAt)} and it isn't marked shipped yet.`,
      tag: { label: "Ship it", tone: "pink" },
      title: "Did you ship it?",
      lead: `${buyer} paid for ${row.item.title} ${when(row.order.createdAt)}. If it's in the post, mark it shipped so ${buyer} knows. If you can't send it, cancel and they get their money back.`,
      listing: { ...row.item, meta: `To ${row.order.shipTo.name}, ${row.order.shipTo.country}` },
      note: {
        label: "Heads up",
        body: `${buyer} can now cancel for a full refund, and it's cancelled for them on ${when(autoCancelAt(row.order))} if it still hasn't shipped.`,
        tone: "lemon",
      },
      actions: [
        { label: "I've shipped it", href: sellerOrderUrl(row.order.id) },
        { label: "I can't send it", href: sellerOrderUrl(row.order.id) },
      ],
      reason: "an order needs you",
    });
  });
}

/** Buyer: the seller is late. They can wait, or cancel for everything back. */
export function notifyShipLate(orderId: string) {
  return safely("ship late", async () => {
    const row = await loadOrder(orderId);
    if (!row || row.order.status !== "paid") return;
    await send(row.buyer.email, {
      subject: `${row.item.title} hasn't shipped yet`,
      preview: `${row.shop.name} was due to ship it by ${when(shipBy(row.order))}. You can wait, or cancel for a full refund.`,
      tag: { label: "Running late", tone: "lemon" },
      title: "It hasn't shipped yet",
      lead: `${row.shop.name} was due to ship ${row.item.title} by ${when(shipBy(row.order))}. We've nudged them. You can give them a little longer, or cancel and get all ${money(row.order.totalCents)} back.`,
      listing: { ...row.item, meta: `From ${row.shop.name}` },
      note: {
        label: "Your money is safe",
        body: `It's held and hasn't gone to the seller. If it still hasn't shipped by ${when(autoCancelAt(row.order))}, we cancel it and refund you.`,
        tone: "agent",
      },
      actions: [
        { label: "Cancel for a refund", href: buyerOrderUrl(row.order.id) },
        { label: "Message the seller", href: siteUrl("/messages") },
      ],
      reason: "an order needs you",
    });
  });
}

/** Both sides: an order was called off before it shipped and the buyer refunded. */
export function notifyCancelled(orderId: string, by: "buyer" | "seller" | "system") {
  return safely("cancelled", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const buyer = firstName(row.buyer);
    const refunded = money(row.order.refundedCents);
    const why = {
      buyer: "You cancelled it because it hadn't shipped in time.",
      seller: `${row.shop.name} couldn't send it, so they cancelled.`,
      system: "It hadn't shipped in time, so we cancelled it for you.",
    }[by];
    await send(row.buyer.email, {
      subject: `Refunded: ${row.item.title}`,
      preview: `${refunded} is on its way back to you.`,
      tag: { label: "Refunded", tone: "leaf" },
      title: "Your money's on its way back",
      lead: `${why} We've refunded all ${refunded}. PayPal usually shows it within a few days.`,
      listing: { ...row.item, meta: `From ${row.shop.name}` },
      actions: [{ label: "Find something else", href: siteUrl("/discover") }],
      reason: "an order changes",
    });
    await send(row.seller.email, {
      subject: `Cancelled: ${row.item.title}`,
      preview: by === "seller" ? `${buyer} has been refunded and it's back on sale.` : `It wasn't shipped in time, so ${buyer} was refunded.`,
      tag: { label: "Cancelled", tone: "muted" },
      title: "That order is cancelled",
      lead:
        by === "seller"
          ? `You cancelled ${buyer}'s order and they got all ${refunded} back. ${row.item.title} is on sale again.`
          : `${row.item.title} wasn't marked shipped in time, so ${buyer} was refunded ${refunded}. The listing is back in your drafts; publish it again whenever you're ready.`,
      listing: row.item,
      actions: [{ label: "See your sales", href: siteUrl("/sales") }],
      reason: "an order changes",
    });
  });
}

/* Arrival and payout */

/** Buyer: a week after shipping, did it arrive? Saying so pays the seller. */
export function notifyArrivalCheck(orderId: string) {
  return safely("arrival check", async () => {
    const row = await loadOrder(orderId);
    if (!row || (row.order.status !== "shipped" && row.order.status !== "delivered")) return;
    const seller = row.shop.name;
    const release = releaseAt(row.order);
    await send(row.buyer.email, {
      subject: `Did ${row.item.title} arrive?`,
      preview: `Say it's all good and ${seller} gets paid, or tell us what's wrong.`,
      tag: { label: "Check it", tone: "lemon" },
      title: "Did it arrive?",
      lead: `${seller} shipped ${row.item.title} ${when(row.order.shippedAt ?? row.order.createdAt)}. If it's with you and it's as described, say so and they get paid.`,
      listing: { ...row.item, meta: `From ${seller}, ${money(row.order.totalCents)} with shipping` },
      note: {
        label: "Your money is safe",
        body: release
          ? `It's held until you say it's all good. If we don't hear from you by ${when(release)}, it goes to ${seller}.`
          : "It's held until you say it's all good.",
        tone: "agent",
      },
      actions: [
        { label: "It's all good", href: siteUrl("/account#orders") },
        { label: "Report a problem", href: buyerOrderUrl(row.order.id) },
      ],
      small: `Not here yet, or not right? Report a problem within ${CHECK_DAYS} days of it arriving and the seller isn't paid until it's sorted.`,
      reason: "an order needs you",
    });
  });
}

export type PaidOutWhy = "confirmed" | "window" | "agreed" | "decided";

/** Seller: the held money went to their PayPal (or, on a test checkout, would have). */
export function notifyPaidOut(orderId: string, why?: PaidOutWhy) {
  return safely("paid out", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const o = row.order;
    const buyer = firstName(row.buyer);
    const reason = why ?? (o.refundedCents ? "agreed" : "confirmed");
    const props = {
      buyer,
      listing: row.item,
      sale: dollars(o.totalCents),
      deductions: [
        ...(o.refundedCents ? [{ label: "Refunded to the buyer", amount: -dollars(o.refundedCents) }] : []),
        ...(o.platformFeeCents ? [{ label: "resell.store fee", amount: -dollars(o.platformFeeCents) }] : []),
        ...(o.paypalFeeCents ? [{ label: "PayPal fee", amount: -dollars(o.paypalFeeCents) }] : []),
      ],
      payout: dollars(Math.max(0, (o.sellerNetCents ?? o.totalCents) - o.refundedCents)),
      why: {
        confirmed: `${buyer} said it's all good`,
        window: `${buyer} had it for ${CHECK_DAYS} days with no problems`,
        agreed: `You and ${buyer} sorted out the problem`,
        decided: "resell.store looked at the problem and decided for you",
      }[reason],
      test: o.paymentProvider !== "paypal",
      salesUrl: sellerOrderUrl(o.id),
    };
    await deliver(row.seller.email, paidOutSubject(props), createElement(PaidOutEmail, props));
  });
}

/** Buyer: their receipt, right after paying. */
export function notifyOrderPlaced(orderId: string) {
  return safely("order placed", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const o = row.order;
    const props = {
      shop: row.shop.name,
      listing: row.item,
      item: dollars(o.itemCents),
      shipping: dollars(o.shippingCents),
      total: dollars(o.totalCents),
      shipTo: [o.shipTo.name, o.shipTo.country].filter(Boolean).join(", "),
      shipBy: shipBy(o).toLocaleDateString("en-US", { weekday: "long" }),
      test: o.paymentProvider !== "paypal",
      orderUrl: buyerOrderUrl(o.id),
    };
    await deliver(row.buyer.email, orderPlacedSubject(props), createElement(OrderPlacedEmail, props));
  });
}

/* Problems and refunds */

async function loadDispute(disputeId: string) {
  const [d] = await db.select().from(dispute).where(eq(dispute.id, disputeId));
  if (!d) return null;
  const row = await loadOrder(d.orderId);
  if (!row) return null;
  return { dispute: d, ...row };
}

const reasonLabel = (id: string) => disputeReasons.find((r) => r.id === id)?.label ?? "Something's wrong";

/** Seller: the buyer reported a problem. The money stays held. */
export function notifyProblemOpened(disputeId: string) {
  return safely("problem opened", async () => {
    const row = await loadDispute(disputeId);
    if (!row) return;
    const buyer = firstName(row.buyer);
    const fromPayPal = row.dispute.source === "paypal";
    await send(row.seller.email, {
      subject: `${buyer} reported a problem with ${row.item.title}`,
      preview: `“${reasonLabel(row.dispute.reason)}.” Your payout is on hold until it's sorted.`,
      tag: { label: "Problem", tone: "pink" },
      title: fromPayPal ? `${buyer} opened a case in PayPal` : `${buyer} has a problem`,
      lead: fromPayPal
        ? `${buyer} opened a PayPal case about ${row.item.title}. PayPal will be in touch, and your payout waits until it's settled.`
        : `${buyer} says: ${reasonLabel(row.dispute.reason).toLowerCase()}. Your payout for ${row.item.title} waits until you two sort it out.`,
      listing: { ...row.item, meta: `${money(row.order.totalCents)}, sold ${when(row.order.createdAt)}` },
      ...(row.dispute.details && {
        note: { label: `${buyer} wrote`, body: row.dispute.details, tone: "muted" as const },
      }),
      actions: [{ label: "Sort it out", href: sellerOrderUrl(row.order.id) }],
      small: "You can reply, offer part of the money back, or refund in full. If you don't answer within 3 days, resell.store steps in.",
      reason: "an order needs you",
    });
  });
}

/**
 * The other side: something happened on a problem (a reply, an offer, it
 * was escalated or closed). Escalations also go to resell.store support.
 */
export function notifyProblemUpdate(disputeId: string) {
  return safely("problem update", async () => {
    const row = await loadDispute(disputeId);
    if (!row) return;
    const events = await db
      .select()
      .from(disputeEvent)
      .where(eq(disputeEvent.disputeId, disputeId))
      .orderBy(asc(disputeEvent.createdAt));
    const last = events.at(-1);
    if (!last) return;
    const buyer = firstName(row.buyer);
    const shopName = row.shop.name;
    const toBuyer = last.side !== "buyer";
    const who = last.side === "buyer" ? buyer : last.side === "seller" ? shopName : "resell.store";
    const to = toBuyer ? row.buyer.email : row.seller.email;
    const href = toBuyer ? buyerOrderUrl(row.order.id) : sellerOrderUrl(row.order.id);
    const listing = { ...row.item, meta: toBuyer ? `From ${shopName}` : `Bought by ${buyer}` };
    const reason = "an order needs you";

    const copy: Partial<Record<typeof last.kind, Pick<NoticeEmailProps, "subject" | "preview" | "title" | "lead">>> = {
      message: {
        subject: `${who} replied about ${row.item.title}`,
        preview: last.body?.slice(0, 120) ?? "",
        title: `${who} replied`,
        lead: `There's a new message on the problem with ${row.item.title}.`,
      },
      refund_offered: {
        subject: `${shopName} offered ${money(last.amountCents ?? 0)} back`,
        preview: `For the problem with ${row.item.title}. Take it and the order's done, or keep talking.`,
        title: `${money(last.amountCents ?? 0)} back?`,
        lead: `${shopName} offered to refund ${money(last.amountCents ?? 0)} of your ${money(row.order.totalCents)} for the problem with ${row.item.title}. Take it and the rest goes to them, or turn it down and keep talking.`,
      },
      offer_declined: {
        subject: `${buyer} turned down your offer`,
        preview: `The problem with ${row.item.title} is still open.`,
        title: "Not quite",
        lead: `${buyer} turned down the ${money(last.amountCents ?? 0)} refund you offered. The problem stays open; reply, offer something else, or refund in full.`,
      },
      closed: {
        subject: `Sorted: ${row.item.title}`,
        preview: `${who} closed the problem.`,
        title: "All sorted",
        lead: toBuyer
          ? `The problem with ${row.item.title} is closed.`
          : `${buyer} says the problem with ${row.item.title} is sorted. Your payout is back on track.`,
      },
      escalated:
        row.dispute.source === "paypal"
          ? {
              subject: `PayPal is reviewing ${row.item.title}`,
              preview: "PayPal will look at both sides and decide.",
              title: "PayPal is reviewing it",
              lead: `The PayPal case about ${row.item.title} is now with PayPal's team to decide. They'll contact you if they need anything. The money stays held until then.`,
            }
          : {
              subject: `resell.store is looking at ${row.item.title}`,
              preview: "We'll read both sides and decide. Usually within two working days.",
              title: "We're stepping in",
              lead: `${last.side === "platform" ? "The problem wasn't answered in time" : `${who} asked us to step in`}, so resell.store will look at the problem with ${row.item.title} and decide. The money stays held until then.`,
            },
    };
    const words = copy[last.kind];
    if (!words) return;
    await send(to, {
      ...words,
      tag: { label: "Problem", tone: last.kind === "closed" ? "leaf" : "pink" },
      listing,
      ...(last.body && last.kind !== "escalated" && { note: { label: `${who} wrote`, body: last.body, tone: "muted" as const } }),
      actions: [{ label: last.kind === "refund_offered" ? "Answer the offer" : "See the problem", href }],
      reason,
    });
    // Both sides hear about an escalation, and so do we (unless PayPal is the one deciding)
    if (last.kind === "escalated") {
      const other = toBuyer ? row.seller.email : row.buyer.email;
      if (last.side === "platform") await send(other, { ...words, tag: { label: "Problem", tone: "pink" }, listing, actions: [{ label: "See the problem", href: toBuyer ? sellerOrderUrl(row.order.id) : buyerOrderUrl(row.order.id) }], reason });
      const support = row.dispute.source === "paypal" ? null : process.env.SUPPORT_EMAIL;
      if (support)
        await send(support, {
          subject: `Escalated: ${row.item.title} (${row.order.id})`,
          preview: `${buyer} and ${shopName}: ${reasonLabel(row.dispute.reason)}`,
          tag: { label: "Escalated", tone: "pink" },
          title: "A problem needs a decision",
          lead: `Order ${row.order.id}, ${money(row.order.totalCents)}. ${reasonLabel(row.dispute.reason)}. Decide with resolveDispute (refund or release).`,
          listing,
          actions: [],
          reason: "a problem is escalated",
        });
    }
  });
}

/** Both sides: money went back to the buyer after a problem (all of it, or the part they agreed). */
export function notifyRefunded(orderId: string) {
  return safely("refunded", async () => {
    const row = await loadOrder(orderId);
    if (!row) return;
    const all = row.order.refundedCents >= row.order.totalCents;
    // A part refund agreed here finishes the order; one made in PayPal may not
    const done = row.order.status === "completed";
    const amount = money(row.order.refundedCents);
    const buyer = firstName(row.buyer);
    await send(row.buyer.email, {
      subject: `Refunded ${amount}: ${row.item.title}`,
      preview: `${amount} is on its way back to you.`,
      tag: { label: "Refunded", tone: "leaf" },
      title: all ? "Your money's on its way back" : "Part of it, back to you",
      lead: all
        ? `${row.shop.name} refunded all ${amount} for ${row.item.title}. PayPal usually shows it within a few days.`
        : `${amount} of your ${money(row.order.totalCents)} is on its way back for ${row.item.title}.${done ? " That wraps the order up." : ""}`,
      listing: { ...row.item, meta: `From ${row.shop.name}` },
      actions: [{ label: "See your order", href: buyerOrderUrl(row.order.id) }],
      reason: "an order changes",
    });
    await send(row.seller.email, {
      subject: `Refunded ${amount} to ${buyer}`,
      preview: all ? `The sale of ${row.item.title} was refunded in full.` : `Part of the sale of ${row.item.title} was refunded.`,
      tag: { label: "Refunded", tone: "muted" },
      title: all ? "Refunded in full" : "Part refund sent",
      lead: all
        ? `${buyer} got all ${amount} back for ${row.item.title}.`
        : `${buyer} got ${amount} back for ${row.item.title}.${done ? " The rest of the sale is released to you." : " The rest stays held until the order wraps up."}`,
      listing: row.item,
      actions: [{ label: "See the order", href: sellerOrderUrl(row.order.id) }],
      reason: "an order changes",
    });
  });
}

/* Reviews */

/** Buyer, a couple of days after the order's done: how was it? */
export function notifyReviewRequest(orderId: string) {
  return safely("review request", async () => {
    const row = await loadOrder(orderId);
    if (!row || row.order.status !== "completed") return;
    const url = siteUrl(`/account/orders/${row.order.id}?review=1`);
    await send(row.buyer.email, {
      subject: `How was ${row.item.title}?`,
      preview: `A few words help ${row.shop.name} and the next buyer.`,
      tag: { label: "Review", tone: "lemon" },
      title: "How did it go?",
      lead: `You've had ${row.item.title} from ${row.shop.name} for a couple of days. Give it a star rating and a line or two: it helps ${row.shop.name}, and the next person deciding.`,
      listing: { ...row.item, meta: `From ${row.shop.name}` },
      actions: [{ label: "Leave a review", href: url }],
      small: "You choose whether it shows on the shop or only goes to the seller.",
      reason: "an order wraps up",
    });
  });
}

/** Seller: a buyer left a review. */
export function notifyNewReview(reviewId: string) {
  return safely("new review", async () => {
    const [r] = await db.select().from(review).where(eq(review.id, reviewId));
    if (!r) return;
    const row = await loadOrder(r.orderId);
    if (!row) return;
    const buyer = firstName(row.buyer);
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    await send(row.seller.email, {
      subject: `${buyer} gave ${row.item.title} ${r.rating} star${r.rating === 1 ? "" : "s"}`,
      preview: r.body?.slice(0, 120) ?? stars,
      tag: { label: "New review", tone: r.rating >= 4 ? "leaf" : "pink" },
      title: stars,
      lead: r.public
        ? `${buyer} reviewed ${row.item.title}. It shows on your shop and the listing.`
        : `${buyer} reviewed ${row.item.title} privately: only you can see it.`,
      listing: row.item,
      ...(r.body && { note: { label: `${buyer} wrote`, body: r.body, tone: "muted" as const } }),
      actions: [{ label: "Reply", href: sellerOrderUrl(row.order.id) }],
      reason: "you get a review",
    });
  });
}
