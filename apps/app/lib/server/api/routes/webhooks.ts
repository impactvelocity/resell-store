import "server-only";
import { z } from "zod";
import type { WebhookEvent } from "@repo/db";
import { ApiError, flag, stringList } from "../http";
import { route } from "../router";
import {
  defaultWebhookEvents,
  deleteWebhook,
  deliver,
  getWebhook,
  rotateWebhookSecret,
  saveWebhook,
  webhookEvents,
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
];
