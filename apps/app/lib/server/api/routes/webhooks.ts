import "server-only";
import { z } from "zod";
import type { WebhookEvent } from "@repo/db";
import { ApiError, flag, idParam, stringList } from "../http";
import { route } from "../router";
import { sampleEvents, sendSample } from "../webhook-samples";
import {
  addSubscription,
  defaultWebhookEvents,
  deleteWebhook,
  deliver,
  getSubscription,
  getWebhook,
  listSubscriptions,
  MAX_SUBSCRIPTIONS,
  removeSubscription,
  rotateWebhookSecret,
  saveWebhook,
  webhookEvents,
  type SubscriptionRow,
  type WebhookRow,
} from "../webhooks";

const group = "Webhooks";
const eventIds = webhookEvents.map((e) => e.id);

function apiWebhook(row: WebhookRow | null, { secret = false } = {}) {
  if (!row) return { object: "webhook", url: null, events: [], enabled: false };
  return {
    object: "webhook",
    url: row.url,
    events: row.events,
    enabled: row.enabled,
    /** Only shown when it's made or rotated. */
    ...(secret ? { secret: row.secret } : { secret_last4: row.secret.slice(-4) }),
    last_delivery: row.lastDeliveredAt
      ? { at: row.lastDeliveredAt.toISOString(), status: row.lastStatus, error: row.lastError }
      : null,
  };
}

function apiSubscription(row: SubscriptionRow, { secret = false } = {}) {
  return {
    object: "webhook_subscription",
    id: row.id,
    url: row.url,
    events: row.events,
    name: row.name,
    source: row.source,
    enabled: row.enabled,
    ...(secret ? { secret: row.secret } : { secret_last4: row.secret.slice(-4) }),
    last_delivery: row.lastDeliveredAt
      ? { at: row.lastDeliveredAt.toISOString(), status: row.lastStatus, error: row.lastError }
      : null,
    created_at: row.createdAt.toISOString(),
  };
}

const subscriptionExample = {
  object: "webhook_subscription",
  id: "3f9c2b1a-…",
  url: "https://hooks.zapier.com/hooks/standard/1234567/abcdef/",
  events: ["listing.sold"],
  name: "Add sales to my sheet",
  source: "zapier",
  enabled: true,
  secret_last4: "x7Lp",
  last_delivery: { at: "2026-10-02T18:30:02.000Z", status: 200, error: null },
  created_at: "2026-10-01T09:00:00.000Z",
};

const eventEnum = z.enum(eventIds as [WebhookEvent, ...WebhookEvent[]]);

const example = {
  object: "webhook",
  url: "https://example.com/hooks/resell",
  events: ["listing.sold", "offer.received"],
  enabled: true,
  secret_last4: "9fQa",
  last_delivery: { at: "2026-10-02T18:30:02.000Z", status: 200, error: null },
};

const httpsUrl = z
  .string()
  .trim()
  .url("That isn't a web address.")
  .max(500)
  .refine((u) => u.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u), "Use an https:// address.");

export const webhookRoutes = [
  route({
    method: "GET",
    path: "/webhooks",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Your webhook",
    description: "Where we send events, which ones, and how the last delivery went.",
    example: { response: example },
    handler: async ({ auth }) => apiWebhook(await getWebhook(auth!.user.id)),
  }),

  route({
    method: "PUT",
    path: "/webhooks",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Set your webhook",
    description: `Sets the address we POST events to and which events to send. The first time, the response includes the signing \`secret\`; keep it to check the Resell-Signature header. Events: ${eventIds.join(", ")}.`,
    body: z.object({
      url: httpsUrl,
      events: stringList(20)
        .pipe(z.array(z.enum(eventIds as [WebhookEvent, ...WebhookEvent[]])))
        .optional()
        .describe("Which events to send. Defaults to listing.sold, offer.received and question.asked."),
      enabled: flag().optional(),
    }),
    example: {
      body: { url: "https://example.com/hooks/resell", events: ["listing.sold", "offer.received"] },
      response: { ...example, secret: "whsec_…", secret_last4: undefined, last_delivery: null },
    },
    handler: async ({ auth, body }) => {
      const before = await getWebhook(auth!.user.id);
      const row = await saveWebhook(auth!.user.id, {
        url: body.url,
        events: body.events ?? before?.events ?? defaultWebhookEvents,
        enabled: body.enabled,
      });
      return apiWebhook(row, { secret: !before });
    },
  }),

  route({
    method: "DELETE",
    path: "/webhooks",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Stop webhooks",
    example: { response: { object: "webhook", url: null, events: [], enabled: false } },
    handler: async ({ auth }) => {
      await deleteWebhook(auth!.user.id);
      return apiWebhook(null);
    },
  }),

  route({
    method: "POST",
    path: "/webhooks/rotate-secret",
    group,
    access: "key",
    scope: "webhooks",
    summary: "New signing secret",
    description: "Makes a new signing secret. The old one stops working at once.",
    example: { response: { ...example, secret: "whsec_…", secret_last4: undefined } },
    handler: async ({ auth }) => {
      const row = await rotateWebhookSecret(auth!.user.id);
      if (!row) throw new ApiError("not_found", "Set a webhook first (PUT /v1/webhooks).");
      return apiWebhook(row, { secret: true });
    },
  }),

  route({
    method: "POST",
    path: "/webhooks/test",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Send a test event",
    description: "Sends a `ping` event to your address now and tells you what your server answered.",
    example: { response: { object: "webhook_test", event: "evt_…", status: 200, error: null } },
    handler: async ({ auth }) => {
      const row = await getWebhook(auth!.user.id);
      if (!row) throw new ApiError("not_found", "Set a webhook first (PUT /v1/webhooks).");
      const result = await deliver(row, "ping", { object: "ping", message: "Hello from resell.store" });
      return { object: "webhook_test", event: result.id, status: result.status, error: result.error };
    },
  }),

  route({
    method: "GET",
    path: "/webhooks/subscriptions",
    group,
    access: "key",
    scope: "webhooks",
    summary: "List subscriptions",
    description:
      "Every extra address getting events, each with its own events: one per Zap made with the resell.store Zapier app, plus any you added yourself.",
    example: { response: { object: "list", data: [subscriptionExample], total: 1, has_more: false } },
    handler: async ({ auth }) => {
      const rows = await listSubscriptions(auth!.user.id);
      return { object: "list", data: rows.map((r) => apiSubscription(r)), total: rows.length, has_more: false };
    },
  }),

  route({
    method: "POST",
    path: "/webhooks/subscriptions",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Subscribe an address",
    description: `Starts sending some events to another address, alongside your webhook. This is the REST hook Zapier calls when a Zap is turned on; Make, n8n and Pipedream can use it the same way. Subscribing an address you already have updates its events. Answer a delivery with 410 Gone and we delete the subscription. Up to ${MAX_SUBSCRIPTIONS}. The response includes its signing \`secret\`.`,
    body: z.object({
      url: httpsUrl,
      events: stringList(20).pipe(z.array(eventEnum).min(1, "Choose at least one event.")),
      name: z.string().trim().max(120).optional().describe("What to call it on the API page, like the Zap's name."),
    }),
    example: {
      body: { url: subscriptionExample.url, events: ["listing.sold"], name: "Add sales to my sheet" },
      response: { ...subscriptionExample, secret: "whsec_…", secret_last4: undefined, last_delivery: null },
    },
    handler: async ({ auth, body, req }) => {
      // The resell.store Zapier app says who it is (and the activity log shows "Zapier")
      const fromZapier = /zapier/i.test(`${req.headers.get("resell-client") ?? ""} ${req.headers.get("user-agent") ?? ""}`);
      const row = await addSubscription(auth!.user.id, {
        url: body.url,
        events: body.events,
        name: body.name,
        source: fromZapier ? "zapier" : "api",
      });
      if (!row) throw new ApiError("invalid_request", `You have ${MAX_SUBSCRIPTIONS} subscriptions already. Remove one first.`);
      return apiSubscription(row, { secret: true });
    },
  }),

  route({
    method: "DELETE",
    path: "/webhooks/subscriptions/:id",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Unsubscribe an address",
    description: "Stops sending events there. Zapier calls this when a Zap is turned off or deleted.",
    example: { path: "/webhooks/subscriptions/3f9c2b1a-…", response: { object: "webhook_subscription", id: "3f9c2b1a-…", deleted: true } },
    handler: async ({ auth, params }) => {
      const id = idParam.parse(params.id);
      if (!(await removeSubscription(auth!.user.id, id))) throw new ApiError("not_found", "There's no subscription with that id.");
      return { object: "webhook_subscription", id, deleted: true };
    },
  }),

  route({
    method: "POST",
    path: "/webhooks/subscriptions/:id/test",
    group,
    access: "key",
    scope: "webhooks",
    summary: "Send a sample to a subscription",
    description:
      "Posts a sample event now, built from your latest real one (your newest sale for listing.sold, and so on), marked `test: true` and never retried. Handy when Zapier is waiting for a request to learn the fields.",
    body: z.object({ event: eventEnum.optional().describe("Which event to send. Defaults to the subscription's first.") }),
    example: {
      path: "/webhooks/subscriptions/3f9c2b1a-…/test",
      body: { event: "listing.sold" },
      response: { object: "webhook_test", event: "evt_…", type: "listing.sold", status: 200, error: null },
    },
    handler: async ({ auth, params, body }) => {
      const row = await getSubscription(auth!.user.id, idParam.parse(params.id));
      if (!row) throw new ApiError("not_found", "There's no subscription with that id.");
      const result = await sendSample(row, body.event);
      return { object: "webhook_test", event: result.id, type: result.event, status: result.status, error: result.error };
    },
  }),

  route({
    method: "GET",
    path: "/webhooks/samples/:event",
    group,
    access: "key",
    summary: "Sample events",
    description:
      "What an event looks like, from your own latest matching things, newest first (made up if you have none yet). Each is the full event we'd POST, marked `test: true`. The Zapier app shows these when you test a trigger.",
    query: z.object({ limit: z.coerce.number().int().min(1).max(10).default(3) }),
    example: {
      path: "/webhooks/samples/offer.received",
      response: {
        object: "list",
        data: [
          {
            id: "evt_sample_5b0f9a123c4d",
            object: "event",
            type: "offer.received",
            created_at: "2026-10-02T18:00:00.000Z",
            test: true,
            data: { object: { object: "offer", id: "5b0f…", status: "open", amount: 150, shop: { slug: "maya", name: "Maya's closet" } } },
          },
        ],
        has_more: false,
      },
    },
    handler: async ({ auth, params, query }) => {
      const parsed = eventEnum.safeParse(params.event);
      if (!parsed.success) throw new ApiError("not_found", `There's no ${params.event} event. Events: ${eventIds.join(", ")}.`);
      return { object: "list", data: await sampleEvents(auth!.user.id, parsed.data, query.limit), has_more: false };
    },
  }),
];
