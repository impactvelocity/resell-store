"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ApiScope, WebhookEvent } from "@repo/db";
import { agentScopeChoices, issueKey, revokeKey, setAgentPermissions, setShoppingRules } from "../../lib/server/api/keys";
import {
  deleteWebhook,
  deliver,
  getWebhook,
  rotateWebhookSecret,
  saveWebhook,
  webhookEvents,
} from "../../lib/server/api/webhooks";
import { demoBlocked } from "../../lib/server/demo";
import { requireUser } from "../../lib/server/session";
import { listOwnedShops } from "../../lib/server/shops";
import { mcpUrl } from "../../lib/urls";

/*
 * D2 Your agent, P7 For your agent and D3 API: keys, the agent link, what it
 * may do, webhooks.
 * Tokens come back once, from the action that made them, and never again.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function handle(userId: string) {
  const shops = await listOwnedShops(userId);
  return shops[0]?.slug ?? "agent";
}

export async function makeApiKey(): Promise<Result<{ token: string; last4: string }>> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const { token, row } = await issueKey({ userId: user.id, kind: "api", handle: "api" });
  revalidatePath("/tools/api");
  return { ok: true, token, last4: row.last4 };
}

export async function deleteApiKey(): Promise<Result> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  await revokeKey(user.id, "api");
  revalidatePath("/tools/api");
  return { ok: true };
}

export async function makeAgentLink(): Promise<Result<{ seller: string; buyer: string }>> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const { token } = await issueKey({ userId: user.id, kind: "agent", handle: await handle(user.id) });
  revalidatePath("/tools/agent");
  revalidatePath("/agent");
  return { ok: true, seller: mcpUrl(`/u/${token}`), buyer: mcpUrl(`/buy/${token}`) };
}

export async function deleteAgentLink(): Promise<Result> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  await revokeKey(user.id, "agent");
  revalidatePath("/tools/agent");
  revalidatePath("/agent");
  return { ok: true };
}

const rule = z.enum(["on", "ask", "off"]);

/** D2 "What it may do": each permission on, ask first, or off. */
export async function setAgentRules(raw: Record<string, string>): Promise<Result> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const parsed = z.record(z.string(), rule).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Something in there doesn't look right." };
  const scopes: ApiScope[] = [];
  const askFirst: ApiScope[] = [];
  for (const scope of agentScopeChoices) {
    const value = parsed.data[scope] ?? "off";
    if (value === "off") continue;
    scopes.push(scope);
    if (value === "ask") askFirst.push(scope);
  }
  const row = await setAgentPermissions(user.id, scopes, askFirst);
  if (!row) return { ok: false, error: "Make your link first." };
  revalidatePath("/tools/agent");
  return { ok: true };
}

const shoppingInput = z.object({
  maxOffer: z.number().int().min(1).max(100_000).nullable(),
  offersOnOwn: z.boolean(),
});

/** P7 "You hold the purse": the most it may offer for one thing (null for no limit), and whether it asks before offering. */
export async function setShoppingLimits(input: z.input<typeof shoppingInput>): Promise<Result> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const parsed = shoppingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Use a whole dollar amount, up to $100,000." };
  const row = await setShoppingRules(user.id, {
    maxOfferCents: parsed.data.maxOffer === null ? null : parsed.data.maxOffer * 100,
    offersOnOwn: parsed.data.offersOnOwn,
  });
  if (!row) return { ok: false, error: "Make your link first." };
  revalidatePath("/agent");
  revalidatePath("/tools/agent");
  return { ok: true };
}

const eventIds = webhookEvents.map((e) => e.id) as [WebhookEvent, ...WebhookEvent[]];
const webhookInput = z.object({
  url: z
    .string()
    .trim()
    .url("That isn't a web address.")
    .max(500)
    .refine(
      (u) => u.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u),
      "Use an https:// address.",
    ),
  events: z.array(z.enum(eventIds)).max(20),
});

export async function saveWebhookSettings(
  input: z.input<typeof webhookInput>,
): Promise<Result<{ secret?: string }>> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const parsed = webhookInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the address." };
  const before = await getWebhook(user.id);
  const row = await saveWebhook(user.id, parsed.data);
  revalidatePath("/tools/api");
  // The signing secret shows once, when the webhook is first set
  return { ok: true, ...(before ? {} : { secret: row.secret }) };
}

export async function removeWebhook(): Promise<Result> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  await deleteWebhook(user.id);
  revalidatePath("/tools/api");
  return { ok: true };
}

export async function newWebhookSecret(): Promise<Result<{ secret: string }>> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const row = await rotateWebhookSecret(user.id);
  if (!row) return { ok: false, error: "Set an address first." };
  return { ok: true, secret: row.secret };
}

export async function sendTestWebhook(): Promise<Result<{ status: number | null; error: string | null }>> {
  const user = await requireUser();
  const demo = demoBlocked(user, "keys");
  if (demo) return { ok: false, error: demo };
  const row = await getWebhook(user.id);
  if (!row) return { ok: false, error: "Set an address first." };
  const result = await deliver(row, "ping", { object: "ping", message: "Hello from resell.store" });
  revalidatePath("/tools/api");
  return { ok: true, status: result.status, error: result.error };
}
