"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { CommerceError } from "../../lib/server/commerce";
import {
  answerRefundOffer,
  cancelOrder,
  closeDispute,
  escalateDispute,
  offerPartialRefund,
  openDispute,
  refundInFull,
  replyToDispute,
} from "../../lib/server/disputes";
import {
  notifyCancelled,
  notifyProblemOpened,
  notifyProblemUpdate,
  notifyRefunded,
} from "../../lib/server/notify-after-sale";
import { getCurrentUser } from "../../lib/server/session";
import { toCents } from "../../lib/money";

/*
 * When a sale goes wrong, for both sides: cancelling before it ships, and
 * problems after (lib/server/disputes.ts). Same contract as commerce.ts:
 * { ok } or { error } for things a person can fix; emails go after the
 * response.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; signin?: boolean };

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first.", signin: true };
  try {
    const out = await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true, ...out };
  } catch (error) {
    if (error instanceof CommerceError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("After-sale action failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}

const id = z.string().min(1).max(64);
const words = z.string().trim().max(2000);

/** Buyer: it's past the ship-by date and still not shipped, so call it off. */
export async function cancelAsBuyer(input: { orderId: string }) {
  return run(async (buyerId) => {
    const order = await cancelOrder({ orderId: id.parse(input.orderId), actorId: buyerId, by: "buyer" });
    after(() => notifyCancelled(order.id, "buyer"));
    return { status: order.status };
  });
}

/** Seller: can't send it. The buyer gets everything back and it goes back on sale. */
export async function cancelAsSeller(input: { orderId: string }) {
  return run(async (sellerId) => {
    const order = await cancelOrder({ orderId: id.parse(input.orderId), actorId: sellerId, by: "seller" });
    after(() => notifyCancelled(order.id, "seller"));
    return { status: order.status };
  });
}

const reportInput = z.object({
  orderId: id,
  reason: z.enum(["not_arrived", "not_as_described", "damaged", "other"]),
  details: words.min(1, "Tell the seller what's wrong."),
});

/** Buyer: something's wrong. The seller's money waits until it's sorted. */
export async function reportProblem(input: z.input<typeof reportInput>) {
  return run(async (buyerId) => {
    const parsed = reportInput.parse(input);
    const d = await openDispute({ buyerId, ...parsed });
    after(() => notifyProblemOpened(d.id));
    return { disputeId: d.id };
  });
}

/** Either side: a message on the problem. */
export async function replyToProblem(input: { disputeId: string; body: string }) {
  return run(async (userId) => {
    const parsed = z.object({ disputeId: id, body: words.min(1) }).parse(input);
    await replyToDispute({ userId, ...parsed });
    after(() => notifyProblemUpdate(parsed.disputeId));
    return {};
  });
}

/** Seller: offer part of the money back. */
export async function offerRefund(input: { disputeId: string; amount: number; body?: string | null }) {
  return run(async (sellerId) => {
    const parsed = z
      .object({ disputeId: id, amount: z.number().positive().max(100_000), body: words.nullish() })
      .parse(input);
    await offerPartialRefund({ sellerId, disputeId: parsed.disputeId, amountCents: toCents(parsed.amount), body: parsed.body });
    after(() => notifyProblemUpdate(parsed.disputeId));
    return {};
  });
}

/** Buyer: take the seller's part refund, or turn it down. */
export async function answerRefund(input: { disputeId: string; accept: boolean }) {
  return run(async (buyerId) => {
    const parsed = z.object({ disputeId: id, accept: z.boolean() }).parse(input);
    const d = await answerRefundOffer({ buyerId, ...parsed });
    after(() => (parsed.accept ? notifyRefunded(d.orderId) : notifyProblemUpdate(d.id)));
    return { status: d.status };
  });
}

/** Seller: give it all back. */
export async function refundAll(input: { disputeId: string; body?: string | null }) {
  return run(async (sellerId) => {
    const parsed = z.object({ disputeId: id, body: words.nullish() }).parse(input);
    const order = await refundInFull({ userId: sellerId, ...parsed });
    after(() => notifyRefunded(order.id));
    return { status: order.status };
  });
}

/** Buyer: it's sorted after all. */
export async function closeProblem(input: { disputeId: string }) {
  return run(async (buyerId) => {
    const d = await closeDispute({ buyerId, disputeId: id.parse(input.disputeId) });
    after(() => notifyProblemUpdate(d.id));
    return {};
  });
}

/** Either side: ask resell.store to decide. */
export async function escalateProblem(input: { disputeId: string; body?: string | null }) {
  return run(async (userId) => {
    const parsed = z.object({ disputeId: id, body: words.nullish() }).parse(input);
    await escalateDispute({ userId, ...parsed });
    after(() => notifyProblemUpdate(parsed.disputeId));
    return {};
  });
}
