import "server-only";
import { apiGroups } from "../../docs/nav";
import { signInHref } from "../../safe-next";
import { apiUrl, docsUrl, mcpUrl } from "../../urls";
import { listOwnedShops } from "../shops";
import { currentKey, DEFAULT_MAX_OFFER_CENTS, defaultAgentAskFirst, maskedKey, MONTHLY_LIMIT, monthUsage } from "./keys";
import { keyClients, recentActivity, unnamed } from "./log";
import { getWebhook, pendingDeliveries, webhookEvents } from "./webhooks";

/* What the D2 and D3 screens show, serializable for their client components. */

const day = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const rel = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", "September 3". */
export function ago(date: Date) {
  const s = (Date.now() - date.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return rel.format(-Math.floor(s / 60), "minute");
  if (s < 86_400) return rel.format(-Math.floor(s / 3600), "hour");
  if (s < 7 * 86_400) return rel.format(-Math.floor(s / 86_400), "day");
  return day.format(date);
}

function nextMonth() {
  const now = new Date();
  // The count turns over at midnight UTC on the 1st
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
}

export async function apiScreenData(userId: string) {
  const [key, used, webhook, shops, retrying] = await Promise.all([
    currentKey(userId, "api"),
    monthUsage(userId),
    getWebhook(userId),
    listOwnedShops(userId),
    pendingDeliveries(userId),
  ]);
  return {
    key: key
      ? { masked: maskedKey(key), made: `Made ${day.format(key.createdAt)}`, lastUsed: key.lastUsedAt ? ago(key.lastUsedAt) : null }
      : null,
    usage: { used, limit: MONTHLY_LIMIT, resets: nextMonth() },
    apiBase: apiUrl(),
    docs: {
      home: docsUrl("/api"),
      groups: apiGroups.slice(0, 10).map((g) => ({ title: g.title, href: docsUrl(`/api/${g.id}`), blurb: g.blurb })),
    },
    webhook: webhook
      ? {
          url: webhook.url,
          events: webhook.events,
          secretLast4: webhook.secret.slice(-4),
          last: webhook.lastDeliveredAt
            ? { at: ago(webhook.lastDeliveredAt), status: webhook.lastStatus, error: webhook.lastError }
            : null,
          enabled: webhook.enabled,
          retrying,
        }
      : null,
    events: webhookEvents,
    shop: shops[0]?.slug ?? null,
  };
}

/** An app counts as using the link "now" if it was seen in the last quarter hour. */
const NOW_MS = 15 * 60 * 1000;

/** D2 "Using your link now": the apps seen with this key lately. */
async function linkApps(keyId: string | null) {
  if (!keyId) return [];
  return (await keyClients(keyId)).map((c) => ({
    name: c.client,
    now: Date.now() - c.lastSeenAt.getTime() < NOW_MS,
    lastUsed: Date.now() - c.lastSeenAt.getTime() < NOW_MS ? "Using it now" : `Last used ${ago(c.lastSeenAt)}`,
  }));
}

/** D2 "What it did lately": what agent links changed, newest first. */
async function linkActivity(userId: string) {
  return (await recentActivity(userId, "agent")).map((a) => ({
    id: a.id,
    text: a.text,
    who: `${a.client ?? unnamed("agent")}, ${ago(a.createdAt)}`,
    href: a.href,
    askedFirst: a.askedFirst,
    ok: a.ok,
  }));
}

export async function agentScreenData(userId: string) {
  const [key, used, activity] = await Promise.all([currentKey(userId, "agent"), monthUsage(userId), linkActivity(userId)]);
  return {
    link: key
      ? {
          masked: mcpUrl(`/u/${maskedKey(key)}`).replace(/^https?:\/\//, ""),
          made: `Made ${day.format(key.createdAt)}`,
          lastUsed: key.lastUsedAt ? ago(key.lastUsedAt) : null,
          scopes: key.scopes,
          askFirst: key.askFirst,
        }
      : null,
    publicShopping: mcpUrl("/buy"),
    docs: { home: docsUrl("/mcp"), connect: docsUrl("/mcp/connect"), seller: docsUrl("/mcp/seller"), buyer: docsUrl("/mcp/buyer") },
    used,
    apps: await linkApps(key?.id ?? null),
    activity,
  };
}

const bare = (url: string) => url.replace(/^https?:\/\//, "");

/**
 * P7 For your agent: the buyer's side of the same agent link. Signed out,
 * there's only the browse-only address.
 */
export async function buyerAgentData(userId: string | null) {
  const [key, shops] = userId ? await Promise.all([currentKey(userId, "agent"), listOwnedShops(userId)]) : [null, []];
  return {
    signedIn: !!userId,
    signIn: signInHref("/agent"),
    browseLink: mcpUrl("/buy"),
    connectDocs: docsUrl("/mcp/connect"),
    /** Their link also runs their shops, so making a new one matters more. */
    hasShops: shops.length > 0,
    link: key
      ? {
          masked: bare(mcpUrl(`/buy/${maskedKey(key)}`)),
          made: `Made ${day.format(key.createdAt)}`,
          lastUsed: key.lastUsedAt ? ago(key.lastUsedAt) : null,
        }
      : null,
    limits: key
      ? {
          maxOffer: key.maxOfferCents === null ? null : Math.round(key.maxOfferCents / 100),
          offersOnOwn: key.scopes.includes("buying") && !key.askFirst.includes("buying"),
        }
      : { maxOffer: DEFAULT_MAX_OFFER_CENTS / 100, offersOnOwn: !defaultAgentAskFirst.includes("buying") },
  };
}

export type BuyerAgentData = Awaited<ReturnType<typeof buyerAgentData>>;
