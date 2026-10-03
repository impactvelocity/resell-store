import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { toCents } from "../../../money";
import {
  answerRefundOffer,
  cancelOrder,
  closeDispute,
  escalateDispute,
  offerPartialRefund,
  openDispute,
  orderCase,
  refundInFull,
  replyToDispute,
  type OrderCase,
} from "../../disputes";
import {
  notifyCancelled,
  notifyProblemOpened,
  notifyProblemUpdate,
  notifyRefunded,
} from "../../notify-after-sale";
import { ApiError, idParam, notFound } from "../http";
import { route } from "../router";

/*
 * When a sale goes wrong, over the API: cancelling before it ships, and
 * problems after (lib/server/disputes.ts). Giving money back needs a full
 * API key; an agent link can talk about a problem but never refund.
 */

const usd = (cents: number | null | undefined) => (cents == null ? null : cents / 100);
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

function apiProblem(c: OrderCase) {
  const d = c.dispute;
  return {
    object: "problem" as const,
    order: c.order.id,
    order_status: c.order.status,
    refunded: usd(c.order.refundedCents),
    problem: d
      ? {
          id: d.id,
          status: d.status,
          source: d.source,
          reason: d.reason,
          details: d.details,
          refund_offered: usd(d.offerCents),
          escalated_at: iso(d.escalatedAt),
          resolved_at: iso(d.resolvedAt),
          created_at: iso(d.createdAt),
          events: c.events.map((e) => ({
            side: e.side,
            kind: e.kind,
            body: e.body,
            amount: usd(e.amountCents),
            created_at: iso(e.createdAt),
          })),
        }
      : null,
  };
}

const problemExample = {
  object: "problem",
  order: "a71c…",
  order_status: "shipped",
  refunded: 0,
  problem: {
    id: "d3f0…",
    status: "open",
    source: "buyer",
    reason: "damaged",
    details: "The lid arrived chipped.",
    refund_offered: null,
    escalated_at: null,
    resolved_at: null,
    created_at: "2026-10-05T10:00:00.000Z",
    events: [{ side: "buyer", kind: "opened", body: "The lid arrived chipped.", amount: null, created_at: "2026-10-05T10:00:00.000Z" }],
  },
};

async function caseFor(userId: string, orderId: string, side: "buyer" | "seller") {
  const c = await orderCase(idParam.parse(orderId), userId);
  if (!c || c.side !== side) throw notFound(side === "buyer" ? "order" : "sale");
  return c;
}

/** The live problem on an order, or a 404-style error. */
async function liveProblem(userId: string, orderId: string, side: "buyer" | "seller") {
  const c = await caseFor(userId, orderId, side);
  if (!c.dispute || (c.dispute.status !== "open" && c.dispute.status !== "escalated"))
    throw new ApiError("not_found", "There's no open problem on that order.");
  return c.dispute;
}

const text = z.string().trim().max(2000);

export const afterSaleRoutes = [
  /* Buyer */

  route({
    method: "POST",
    path: "/orders/:id/cancel",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Cancel an order that hasn't shipped",
    description:
      "Once the ship-by date (3 days after paying) has passed without it shipping, the buyer can call it off and gets everything back.",
    example: { path: "/orders/a71c…/cancel", response: { ...problemExample, order_status: "cancelled", refunded: 188, problem: null } },
    handler: async ({ auth, params }) => {
      const order = await cancelOrder({ orderId: idParam.parse(params.id), actorId: auth!.user.id, by: "buyer" });
      after(() => notifyCancelled(order.id, "buyer"));
      return apiProblem(await caseFor(auth!.user.id, order.id, "buyer"));
    },
  }),

  route({
    method: "GET",
    path: "/orders/:id/problem",
    group: "Buying",
    access: "key",
    summary: "Get the problem on an order",
    description: "The latest problem reported on an order, with everything both sides said. `problem` is null if there's never been one.",
    example: { path: "/orders/a71c…/problem", response: problemExample },
    handler: async ({ auth, params }) => apiProblem(await caseFor(auth!.user.id, params.id!, "buyer")),
  }),

  route({
    method: "POST",
    path: "/orders/:id/problem",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Report a problem",
    description:
      "For an order that's shipped. The seller is told, and the held money isn't released until it's sorted.",
    body: z.object({
      reason: z.enum(["not_arrived", "not_as_described", "damaged", "other"]),
      details: text.min(1).describe("What's wrong, in the buyer's words. The seller reads this."),
    }),
    example: { path: "/orders/a71c…/problem", body: { reason: "damaged", details: "The lid arrived chipped." }, response: problemExample },
    handler: async ({ auth, params, body }) => {
      const d = await openDispute({ buyerId: auth!.user.id, orderId: idParam.parse(params.id), ...body });
      after(() => notifyProblemOpened(d.id));
      return apiProblem(await caseFor(auth!.user.id, d.orderId, "buyer"));
    },
  }),

  route({
    method: "POST",
    path: "/orders/:id/problem/answer",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Answer a refund offer",
    description: "Take the part refund the seller offered (the rest goes to them and the order is done), or turn it down.",
    body: z.object({ accept: z.boolean() }),
    example: { path: "/orders/a71c…/problem/answer", body: { accept: true }, response: { ...problemExample, order_status: "completed", refunded: 40 } },
    handler: async ({ auth, params, body }) => {
      const d = await liveProblem(auth!.user.id, params.id!, "buyer");
      await answerRefundOffer({ buyerId: auth!.user.id, disputeId: d.id, accept: body.accept });
      after(() => (body.accept ? notifyRefunded(d.orderId) : notifyProblemUpdate(d.id)));
      return apiProblem(await caseFor(auth!.user.id, d.orderId, "buyer"));
    },
  }),

  route({
    method: "POST",
    path: "/orders/:id/problem/close",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Say a problem is sorted",
    description: "Closes the problem without a refund. The order goes back to its usual timer and the seller is paid as normal.",
    example: { path: "/orders/a71c…/problem/close", response: { ...problemExample, problem: { ...problemExample.problem, status: "closed" } } },
    handler: async ({ auth, params }) => {
      const d = await liveProblem(auth!.user.id, params.id!, "buyer");
      await closeDispute({ buyerId: auth!.user.id, disputeId: d.id });
      after(() => notifyProblemUpdate(d.id));
      return apiProblem(await caseFor(auth!.user.id, d.orderId, "buyer"));
    },
  }),

  /* Seller */

  route({
    method: "POST",
    path: "/sales/:id/cancel",
    group: "Sales",
    access: "key",
    scope: "orders",
    summary: "Cancel a sale you can't send",
    description: "Before it ships. The buyer gets everything back and the listing goes back on sale. Needs a full API key.",
    example: { path: "/sales/a71c…/cancel", response: { ...problemExample, order_status: "cancelled", refunded: 188, problem: null } },
    handler: async ({ auth, params }) => {
      if (auth!.key.kind !== "api") throw new ApiError("forbidden", "Only a full API key can give money back, not an agent link.");
      const order = await cancelOrder({ orderId: idParam.parse(params.id), actorId: auth!.user.id, by: "seller" });
      after(() => notifyCancelled(order.id, "seller"));
      return apiProblem(await caseFor(auth!.user.id, order.id, "seller"));
    },
  }),

  route({
    method: "GET",
    path: "/sales/:id/problem",
    group: "Sales",
    access: "key",
    summary: "Get the problem on a sale",
    example: { path: "/sales/a71c…/problem", response: problemExample },
    handler: async ({ auth, params }) => apiProblem(await caseFor(auth!.user.id, params.id!, "seller")),
  }),

  route({
    method: "POST",
    path: "/sales/:id/problem/refund",
    group: "Sales",
    access: "key",
    scope: "orders",
    summary: "Refund for a problem",
    description:
      "With `amount`, offers that much back for the buyer to take or leave. Without it, refunds everything now. Needs a full API key.",
    body: z.object({
      amount: z.number().positive().max(100_000).optional().describe("Dollars to offer back. Leave out to refund in full."),
      note: text.optional(),
    }),
    example: { path: "/sales/a71c…/problem/refund", body: { amount: 40, note: "Sorry about the lid." }, response: { ...problemExample, problem: { ...problemExample.problem, refund_offered: 40 } } },
    handler: async ({ auth, params, body }) => {
      if (auth!.key.kind !== "api") throw new ApiError("forbidden", "Only a full API key can give money back, not an agent link.");
      const d = await liveProblem(auth!.user.id, params.id!, "seller");
      if (body.amount != null) {
        await offerPartialRefund({ sellerId: auth!.user.id, disputeId: d.id, amountCents: toCents(body.amount), body: body.note });
        after(() => notifyProblemUpdate(d.id));
      } else {
        await refundInFull({ userId: auth!.user.id, disputeId: d.id, body: body.note });
        after(() => notifyRefunded(d.orderId));
      }
      return apiProblem(await caseFor(auth!.user.id, d.orderId, "seller"));
    },
  }),

  /* Either side */

  ...(["orders", "sales"] as const).flatMap((base) => {
    const side = base === "orders" ? "buyer" : "seller";
    const group = base === "orders" ? "Buying" : "Sales";
    const scope = base === "orders" ? "buying" : "orders";
    return [
      route({
        method: "POST",
        path: `/${base}/:id/problem/reply`,
        group,
        access: "key",
        scope,
        summary: "Reply about a problem",
        body: z.object({ body: text.min(1) }),
        example: { path: `/${base}/a71c…/problem/reply`, body: { body: "Could you send a photo?" }, response: problemExample },
        handler: async ({ auth, params, body }) => {
          const d = await liveProblem(auth!.user.id, params.id!, side);
          await replyToDispute({ userId: auth!.user.id, disputeId: d.id, body: body.body });
          after(() => notifyProblemUpdate(d.id));
          return apiProblem(await caseFor(auth!.user.id, d.orderId, side));
        },
      }),
      route({
        method: "POST",
        path: `/${base}/:id/problem/escalate`,
        group,
        access: "key",
        scope,
        summary: "Ask resell.store to step in",
        description: "We read both sides and decide. The money stays held until then.",
        body: z.object({ note: text.optional() }),
        example: { path: `/${base}/a71c…/problem/escalate`, body: {}, response: { ...problemExample, problem: { ...problemExample.problem, status: "escalated" } } },
        handler: async ({ auth, params, body }) => {
          const d = await liveProblem(auth!.user.id, params.id!, side);
          await escalateDispute({ userId: auth!.user.id, disputeId: d.id, body: body.note });
          after(() => notifyProblemUpdate(d.id));
          return apiProblem(await caseFor(auth!.user.id, d.orderId, side));
        },
      }),
    ];
  }),
];
