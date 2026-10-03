import "server-only";
import { and, apiActivity, apiClient, db, desc, eq, gte, lt, sql, type ApiKeyKind } from "@repo/db";
import type { Auth } from "./http";

/*
 * What keys did, for their owner (D2 "What it did lately" and "Using your
 * link now"). Every change made with a key gets one line, written in plain
 * words from the route and what it returned; reads aren't kept. Which app
 * did it comes from the MCP server (resell-client, the app's own name) or
 * the caller's user agent. These headers can be made up, but only by someone
 * holding the key, and only in its owner's own log.
 */

/** Changes that aren't worth a line. */
const quiet = new Set(["POST /threads/:id/read"]);

/** How long activity is kept. */
const KEEP_DAYS = 90;

const apps: [RegExp, string][] = [
  [/claude[\s_-]?code/i, "Claude Code"],
  [/claude|anthropic/i, "Claude"],
  [/openai|chatgpt/i, "ChatGPT"],
  [/cursor/i, "Cursor"],
  [/vscode|visual studio code|copilot/i, "VS Code"],
  [/windsurf|codeium/i, "Windsurf"],
  [/\bgrok\b|\bxai\b/i, "Grok"],
  [/gemini/i, "Gemini"],
  [/\bzed\b/i, "Zed"],
  [/goose/i, "Goose"],
];

const scripts = /curl|python|node|undici|axios|go-http|okhttp|postman|insomnia|httpie|wget|ruby|java/i;

/** "Claude", "ChatGPT", "A script", or null when the request doesn't say. */
export function clientLabel(headers: Headers): string | null {
  const named = headers.get("resell-client")?.trim() ?? "";
  const agent = headers.get("resell-client-agent")?.trim() ?? "";
  const ua = headers.get("user-agent")?.trim() ?? "";
  const ours = /^resell-mcp/i.test(ua);
  for (const text of [named, agent, ours ? "" : ua]) {
    if (!text) continue;
    const hit = apps.find(([re]) => re.test(text));
    if (hit) return hit[1];
  }
  if (named) return named.slice(0, 40);
  if (ua.startsWith("resell-mcp-stdio")) return "Local MCP server";
  if (!ours && scripts.test(ua)) return "A script";
  return null;
}

/** What to call an app we couldn't name. */
export function unnamed(kind: ApiKeyKind) {
  return kind === "agent" ? "An AI app" : "A script";
}

type Obj = Record<string, unknown>;
type Described = { text: string; href?: string | null };
type Context = { params: Record<string, string>; body: Obj; out: Obj };

const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function usd(v: unknown) {
  return typeof v === "number" ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "";
}

/** '"Linen dress"', or "a listing" when there's no title yet. */
function named(thing: unknown, fallback = "a listing") {
  const t = obj(thing);
  const title = str(t.title) ?? str(t.name);
  return title ? `"${title.length > 60 ? `${title.slice(0, 57)}…` : title}"` : fallback;
}

/** The listing an offer, order or problem is about. */
function itemOf(out: Obj) {
  return obj(out.listing ?? obj(out.order).listing);
}

const about = (out: Obj) => {
  const item = itemOf(out);
  return str(item.title) ? ` for ${named(item)}` : "";
};

const listing =
  (verb: string, after = "") =>
  ({ params, out }: Context): Described => ({ text: `${verb} ${named(out)}${after}`, href: `/listings/${params.id}` });

const fixed = (text: string) => ({ out }: Context): Described => ({ text: `${text}${about(out)}` });

const describers: Record<string, (c: Context) => Described> = {
  "POST /shops": ({ out }) => ({ text: `Opened the shop ${named(out, "")}`.trim(), href: str(out.slug) ? `/shops/${out.slug}` : null }),
  "PATCH /shops/:slug": ({ params, out }) => ({ text: `Changed the shop ${named(out, params.slug)}`, href: `/shops/${params.slug}/settings` }),
  "DELETE /shops/:slug": ({ params }) => ({ text: `Deleted the shop ${params.slug}` }),

  "POST /listings": ({ out }) => ({
    text: str(out.title) || str(out.name) ? `Started a listing for ${named(out)}` : "Started a listing",
    href: str(out.id) ? `/listings/${out.id}` : null,
  }),
  "PATCH /listings/:id": listing("Changed"),
  "DELETE /listings/:id": () => ({ text: "Deleted a listing" }),
  "POST /listings/:id/publish": ({ params, out }) => ({
    text: `Listed ${named(out)}${typeof out.price === "number" ? ` for ${usd(out.price)}` : ""}`,
    href: `/listings/${params.id}`,
  }),
  "POST /listings/:id/unpublish": listing("Took down"),
  "POST /listings/:id/mark-sold": listing("Marked", " sold elsewhere"),
  "POST /listings/:id/relist": listing("Relisted"),
  "POST /listings/:id/photos": ({ params }) => ({ text: "Added photos to a listing", href: `/listings/${params.id}` }),
  "PUT /listings/:id/photos/order": ({ params }) => ({ text: "Put a listing's photos in a new order", href: `/listings/${params.id}` }),
  "DELETE /listings/:id/photos/:photoId": ({ params }) => ({ text: "Removed a photo from a listing", href: `/listings/${params.id}` }),
  "POST /listings/:id/research": ({ params }) => ({ text: "Looked up what a listing is worth", href: `/listings/${params.id}` }),
  "POST /listings/:id/words": ({ params }) => ({ text: "Wrote the words for a listing", href: `/listings/${params.id}` }),
  "POST /research": ({ body }) => ({ text: str(body.query) ? `Looked up ${named({ title: body.query })}` : "Looked something up" }),

  "POST /offers/:id/accept": ({ out }) => ({ text: `Accepted ${usd(out.agreed)} for ${named(itemOf(out))}`, href: `/offers/${out.id}` }),
  "POST /offers/:id/decline": ({ out }) => ({ text: `Declined the ${usd(out.amount)} offer on ${named(itemOf(out))}`, href: `/offers/${out.id}` }),
  "POST /offers/:id/counter": ({ out }) => ({ text: `Countered at ${usd(out.counter)} on ${named(itemOf(out))}`, href: `/offers/${out.id}` }),
  "POST /offers": ({ out }) => ({ text: `Offered ${usd(out.amount)} on ${named(itemOf(out))}`, href: str(itemOf(out).url) }),
  "POST /offers/:id/withdraw": ({ out }) => ({ text: `Withdrew the offer on ${named(itemOf(out))}`, href: str(itemOf(out).url) }),
  "POST /offers/:id/accept-counter": ({ out }) => ({ text: `Took the ${usd(out.counter)} counter on ${named(itemOf(out))}`, href: str(itemOf(out).url) }),
  "POST /offers/:id/decline-counter": ({ out }) => ({ text: `Turned down the counter on ${named(itemOf(out))}`, href: str(itemOf(out).url) }),

  "POST /sales/:id/ship": ({ params, out }) => ({ text: `Marked ${named(itemOf(out))} shipped`, href: `/sales/${params.id}` }),
  "POST /orders/:id/confirm": ({ out }) => ({ text: `Said ${named(itemOf(out))} arrived, all good` }),
  "POST /checkout": () => ({ text: "Got a checkout link for you" }),

  "POST /threads/:id/messages": () => ({ text: "Sent a message" }),
  "POST /threads": ({ out }) => ({ text: `Messaged ${named(out.shop, "a shop")}`, href: "/messages" }),

  "PUT /market/listings/:id/like": () => ({ text: "Liked a listing" }),
  "DELETE /market/listings/:id/like": () => ({ text: "Unliked a listing" }),
  "PUT /market/stores/:slug/follow": ({ params }) => ({ text: `Followed ${params.slug}` }),
  "DELETE /market/stores/:slug/follow": ({ params }) => ({ text: `Unfollowed ${params.slug}` }),
  "POST /market/listings/:id/share": () => ({ text: "Shared a listing" }),

  "PUT /webhooks": () => ({ text: "Set your webhook", href: "/tools/api" }),
  "DELETE /webhooks": () => ({ text: "Stopped your webhook", href: "/tools/api" }),
  "POST /webhooks/rotate-secret": () => ({ text: "Made a new webhook signing secret", href: "/tools/api" }),
  "POST /webhooks/test": () => ({ text: "Sent a test webhook", href: "/tools/api" }),

  "POST /orders/:id/cancel": fixed("Cancelled an order"),
  "POST /orders/:id/problem": fixed("Reported a problem"),
  "POST /orders/:id/problem/answer": fixed("Answered a refund offer"),
  "POST /orders/:id/problem/close": fixed("Said a problem is sorted"),
  "POST /orders/:id/problem/reply": fixed("Replied about a problem"),
  "POST /orders/:id/problem/escalate": fixed("Asked resell.store to step in"),
  "POST /sales/:id/cancel": ({ params, out }) => ({ text: `Cancelled a sale${about(out)}`, href: `/sales/${params.id}` }),
  "POST /sales/:id/problem/refund": ({ params, out }) => ({ text: `Refunded a buyer${about(out)}`, href: `/sales/${params.id}` }),
  "POST /sales/:id/problem/reply": ({ params, out }) => ({ text: `Replied about a problem${about(out)}`, href: `/sales/${params.id}` }),
  "POST /sales/:id/problem/escalate": ({ params, out }) => ({ text: `Asked resell.store to step in${about(out)}`, href: `/sales/${params.id}` }),
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The line for one change. Refused ones say what it tried. */
export function describe(
  route: { method: string; path: string; summary: string },
  ctx: { params: Record<string, string>; body: unknown; out: unknown; ok: boolean },
): Described {
  if (!ctx.ok) return { text: `Tried to ${lowerFirst(route.summary)}` };
  const fn = describers[`${route.method} ${route.path}`];
  if (!fn) return { text: route.summary };
  try {
    return fn({ params: ctx.params, body: obj(ctx.body), out: obj(ctx.out) });
  } catch {
    return { text: route.summary };
  }
}

/** Keeps one line for a change made with a key. Never throws. */
export async function recordActivity(input: {
  auth: Auth;
  headers: Headers;
  route: { method: string; path: string; summary: string };
  params: Record<string, string>;
  body: unknown;
  out: unknown;
  ok: boolean;
}) {
  const action = `${input.route.method} ${input.route.path}`;
  if (input.route.method === "GET" || quiet.has(action)) return;
  try {
    const { text, href } = describe(input.route, input);
    await db.insert(apiActivity).values({
      userId: input.auth.user.id,
      keyId: input.auth.key.id,
      keyKind: input.auth.key.kind,
      client: clientLabel(input.headers),
      action,
      text: text.slice(0, 300),
      href: href ?? null,
      askedFirst: input.headers.get("resell-asked-first") === "1",
      ok: input.ok,
    });
  } catch (error) {
    console.error("[api] couldn't log activity", error);
  }
}

/** Last write per key and app, so a busy app writes at most once a minute. */
const seen = new Map<string, number>();

/** Notes that an app used a key just now. Never throws. */
export async function noteClient(auth: Auth, headers: Headers) {
  const client = clientLabel(headers) ?? unnamed(auth.key.kind);
  const id = `${auth.key.id}:${client}`;
  const now = Date.now();
  if (now - (seen.get(id) ?? 0) < 60_000) return;
  if (seen.size > 2000) seen.clear();
  seen.set(id, now);
  try {
    await db
      .insert(apiClient)
      .values({ keyId: auth.key.id, client })
      .onConflictDoUpdate({ target: [apiClient.keyId, apiClient.client], set: { lastSeenAt: sql`now()` } });
  } catch (error) {
    console.error("[api] couldn't note the app", error);
  }
}

/** The latest lines for one kind of key (every key of that kind, old ones too). */
export async function recentActivity(userId: string, kind: ApiKeyKind, limit = 50) {
  return db
    .select()
    .from(apiActivity)
    .where(and(eq(apiActivity.userId, userId), eq(apiActivity.keyKind, kind)))
    .orderBy(desc(apiActivity.createdAt))
    .limit(limit);
}

/** Apps that used this key in the last 30 days, most recent first. */
export async function keyClients(keyId: string) {
  return db
    .select()
    .from(apiClient)
    .where(and(eq(apiClient.keyId, keyId), gte(apiClient.lastSeenAt, new Date(Date.now() - 30 * 86_400_000))))
    .orderBy(desc(apiClient.lastSeenAt));
}

/** Drops activity older than KEEP_DAYS. Run by the webhook sweep. */
export async function pruneActivity(now = new Date()) {
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000);
  const gone = await db.delete(apiActivity).where(lt(apiActivity.createdAt, cutoff)).returning({ id: apiActivity.id });
  return gone.length;
}
