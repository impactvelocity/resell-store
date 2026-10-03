"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  buyerRespond,
  CommerceError,
  confirmReceived,
  makeOffer,
  markShipped,
  placeOrder,
  respondToOffer,
  startCheckout,
} from "../../lib/server/commerce";
import { paypalEnabled } from "../../lib/server/paypal";
import { siteUrl } from "../../lib/urls";
import {
  notifyOfferAnswered,
  notifyOfferReceived,
  notifyShipped,
  notifySold,
} from "../../lib/server/notify";
import { getCurrentUser } from "../../lib/server/session";
import { paidOut } from "../../lib/server/sweeps";
import { notifyOrderPlaced } from "../../lib/server/notify-after-sale";
import { toCents } from "../../lib/money";

/*
 * Buying and offers, for both sides. Every action returns { error } instead of
 * throwing for things a person can fix; "signin" means send them to sign in.
 * Emails go out after the response (lib/server/notify), and never fail an action.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; signin?: boolean };

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first.", signin: true };
  try {
    const out = await fn(user.id);
    // Both sides' lists change: account, inbox, sales, the listing and store pages
    revalidatePath("/", "layout");
    return { ok: true, ...out };
  } catch (error) {
    if (error instanceof CommerceError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("Commerce action failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}

const id = z.string().min(1).max(64);
const dollars = z.number().positive().max(100_000);

const buyInput = z.object({
  listingId: id,
  offerId: id.nullish(),
  delivery: z.enum(["tracked", "express"]),
  payMethod: z.enum(["paypal", "card"]),
  shipTo: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(5).max(300),
    country: z.string().trim().min(2).max(60),
  }),
});

/**
 * P4: pay and buy. With PayPal set up this only starts the payment: the buyer
 * goes to `redirect`, and /api/paypal/checkout/return places the order when
 * they come back. Without it, a test checkout places the order right here.
 */
export async function buyListing(
  input: z.input<typeof buyInput>,
): Promise<Result<{ redirect?: string; orderId?: string; totalCents?: number }>> {
  return run(async (buyerId) => {
    const parsed = buyInput.parse(input);
    if (paypalEnabled()) {
      const { approveUrl } = await startCheckout({
        buyerId,
        ...parsed,
        returnUrl: siteUrl("/api/paypal/checkout/return"),
        cancelUrl: siteUrl(`/checkout/${parsed.listingId}?paypal=cancelled`),
      });
      return { redirect: approveUrl };
    }
    const order = await placeOrder({ buyerId, ...parsed });
    after(async () => {
      await notifySold(order.id);
      await notifyOrderPlaced(order.id);
    });
    return { orderId: order.id, totalCents: order.totalCents };
  });
}

const offerInput = z.object({
  listingId: id,
  amount: dollars,
  note: z.string().trim().max(500).nullish(),
  deposit: z.number().min(0).max(100_000).nullish(),
});

/** P5: make an offer. */
export async function sendOffer(input: z.input<typeof offerInput>) {
  return run(async (buyerId) => {
    const parsed = offerInput.parse(input);
    const created = await makeOffer({
      buyerId,
      listingId: parsed.listingId,
      amountCents: toCents(parsed.amount),
      note: parsed.note,
      depositCents: parsed.deposit ? toCents(parsed.deposit) : null,
    });
    after(() => notifyOfferReceived(created.id));
    return { offerId: created.id, expiresAt: created.expiresAt.toISOString() };
  });
}

const answerInput = z.object({
  offerId: id,
  action: z.enum(["accept", "decline", "counter"]),
  counter: dollars.optional(),
});

/** Seller: accept, decline or counter an offer. */
export async function answerOffer(input: z.input<typeof answerInput>) {
  return run(async (sellerId) => {
    const parsed = answerInput.parse(input);
    const updated = await respondToOffer({
      sellerId,
      offerId: parsed.offerId,
      action: parsed.action,
      counterCents: parsed.counter != null ? toCents(parsed.counter) : undefined,
    });
    after(() => notifyOfferAnswered(updated.id));
    return { status: updated.status };
  });
}

const buyerAnswerInput = z.object({
  offerId: id,
  action: z.enum(["accept-counter", "decline-counter", "withdraw"]),
});

/** Buyer: take a counter, turn it down, or withdraw. */
export async function answerAsBuyer(input: z.input<typeof buyerAnswerInput>) {
  return run(async (buyerId) => {
    const parsed = buyerAnswerInput.parse(input);
    const updated = await buyerRespond({ buyerId, ...parsed });
    return { status: updated.status };
  });
}

/** Seller: it's in the post. */
export async function shipOrder(input: { orderId: string; trackingNumber?: string | null }) {
  return run(async (sellerId) => {
    const parsed = z
      .object({ orderId: id, trackingNumber: z.string().trim().max(80).nullish() })
      .parse(input);
    const updated = await markShipped({ sellerId, ...parsed });
    after(() => notifyShipped(updated.id));
    return { status: updated.status };
  });
}

/** Buyer: it arrived and it's all good, so the seller gets paid. */
export async function confirmOrder(input: { orderId: string }) {
  return run(async (buyerId) => {
    const updated = await confirmReceived({ buyerId, orderId: id.parse(input.orderId) });
    // A failed PayPal release is retried by the sweep, which sends this then
    if (updated.releasedAt || updated.paymentProvider !== "paypal") after(() => paidOut(updated.id, "confirmed"));
    return { status: updated.status };
  });
}
