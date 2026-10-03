import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  and,
  apiKey,
  apiUsage,
  db,
  desc,
  eq,
  isNull,
  lt,
  or,
  sql,
  user,
  type ApiKeyKind,
  type ApiScope,
} from "@repo/db";

/*
 * API keys (D3) and agent links (D2). A token is shown once, when it's made;
 * we keep its SHA-256 hash, the readable start and the last four characters.
 * Each person has at most one live key of each kind: making a new one revokes
 * the old one, which stops working at once.
 */

export type ApiKeyRow = typeof apiKey.$inferSelect;

export const allScopes: ApiScope[] = [
  "read",
  "shops",
  "listings",
  "messages",
  "offers",
  "orders",
  "buying",
  "webhooks",
];

/** What an agent link may do until the owner changes it (D2's starting rules). */
export const defaultAgentScopes: ApiScope[] = ["read", "listings", "messages", "offers", "orders", "buying"];
export const defaultAgentAskFirst: ApiScope[] = ["offers", "buying"];

/** The most a new agent link may offer for one thing, until the owner changes it on P7. */
export const DEFAULT_MAX_OFFER_CENTS = 20_000;

/** The scopes an agent link can ever have: never shops (delete, links) or webhooks. */
export const agentScopeChoices: ApiScope[] = ["read", "listings", "messages", "offers", "orders", "buying"];

/** Requests a person can make per month while we're in beta. */
export const MONTHLY_LIMIT = 10_000;

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** "rs_live_…" for scripts; "maya-…" (the shop or name, then a secret) for agent links. */
function mintToken(kind: ApiKeyKind, handle: string) {
  if (kind === "api") {
    const token = `rs_live_${randomString(32)}`;
    return { token, start: "rs_live_" };
  }
  const prefix = (handle.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "agent") + "-";
  return { token: `${prefix}${randomString(28)}`, start: prefix };
}

/** The live key of a kind, or null. */
export async function currentKey(userId: string, kind: ApiKeyKind) {
  const [row] = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), eq(apiKey.kind, kind), isNull(apiKey.revokedAt)))
    .orderBy(desc(apiKey.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Makes a new key of this kind and revokes any old one. Returns the row and
 * the token, which is never readable again.
 */
export async function issueKey(input: {
  userId: string;
  kind: ApiKeyKind;
  handle: string;
  scopes?: ApiScope[];
  askFirst?: ApiScope[];
}) {
  const previous = await currentKey(input.userId, input.kind);
  const { token, start } = mintToken(input.kind, input.handle);
  const scopes =
    input.scopes ?? previous?.scopes ?? (input.kind === "api" ? allScopes : defaultAgentScopes);
  const askFirst =
    input.askFirst ?? previous?.askFirst ?? (input.kind === "api" ? [] : defaultAgentAskFirst);
  // A new link keeps the old one's ceiling, even "no ceiling" (null)
  const maxOfferCents = input.kind === "api" ? null : previous ? previous.maxOfferCents : DEFAULT_MAX_OFFER_CENTS;
  const row = await db.transaction(async (tx) => {
    await tx
      .update(apiKey)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKey.userId, input.userId), eq(apiKey.kind, input.kind), isNull(apiKey.revokedAt)));
    const [created] = await tx
      .insert(apiKey)
      .values({
        userId: input.userId,
        kind: input.kind,
        name: input.kind === "api" ? "Secret key" : "Agent link",
        tokenHash: hashToken(token),
        start,
        last4: token.slice(-4),
        scopes,
        askFirst,
        maxOfferCents,
      })
      .returning();
    return created!;
  });
  return { row, token };
}

export async function revokeKey(userId: string, kind: ApiKeyKind) {
  await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.userId, userId), eq(apiKey.kind, kind), isNull(apiKey.revokedAt)));
}

/** D2: what the agent link may do, and which of those it must ask about first. */
export async function setAgentPermissions(userId: string, scopes: ApiScope[], askFirst: ApiScope[]) {
  const allowed = scopes.filter((s) => agentScopeChoices.includes(s));
  const [row] = await db
    .update(apiKey)
    .set({ scopes: allowed, askFirst: askFirst.filter((s) => allowed.includes(s) && s !== "read") })
    .where(and(eq(apiKey.userId, userId), eq(apiKey.kind, "agent"), isNull(apiKey.revokedAt)))
    .returning();
  return row ?? null;
}

/**
 * P7 "You hold the purse": the ceiling for one thing (null for none) and
 * whether it makes offers on its own or asks first. Either way shopping stays
 * switched on, since that's what the buyer came to P7 for.
 */
export async function setShoppingRules(userId: string, rules: { maxOfferCents: number | null; offersOnOwn: boolean }) {
  const key = await currentKey(userId, "agent");
  if (!key) return null;
  const scopes: ApiScope[] = key.scopes.includes("buying") ? key.scopes : [...key.scopes, "buying"];
  const askFirst = rules.offersOnOwn ? key.askFirst.filter((s) => s !== "buying") : [...new Set([...key.askFirst, "buying" as const])];
  const [row] = await db
    .update(apiKey)
    .set({ scopes, askFirst, maxOfferCents: rules.maxOfferCents })
    .where(eq(apiKey.id, key.id))
    .returning();
  return row ?? null;
}

/** The key and its owner for a bearer token, or null if it's unknown or revoked. */
export async function verifyToken(token: string) {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ key: apiKey, user: { id: user.id, name: user.name, email: user.email } })
    .from(apiKey)
    .innerJoin(user, eq(user.id, apiKey.userId))
    .where(and(eq(apiKey.tokenHash, hashToken(token)), isNull(apiKey.revokedAt)));
  return row ?? null;
}

export function currentMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

/** Counts one request against the month and returns the new total. */
export async function countRequest(userId: string) {
  const [row] = await db
    .insert(apiUsage)
    .values({ userId, month: currentMonth(), requests: 1 })
    .onConflictDoUpdate({
      target: [apiUsage.userId, apiUsage.month],
      set: { requests: sql`${apiUsage.requests} + 1` },
    })
    .returning({ requests: apiUsage.requests });
  return row?.requests ?? 1;
}

export async function monthUsage(userId: string) {
  const [row] = await db
    .select({ requests: apiUsage.requests })
    .from(apiUsage)
    .where(and(eq(apiUsage.userId, userId), eq(apiUsage.month, currentMonth())));
  return row?.requests ?? 0;
}

/** Marks the key used, at most once a minute so busy scripts don't write every time. */
export async function touchKey(id: string) {
  const minuteAgo = new Date(Date.now() - 60_000);
  await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(apiKey.id, id), or(isNull(apiKey.lastUsedAt), lt(apiKey.lastUsedAt, minuteAgo))));
}

/** Safe to show: which key it is, never the secret. */
export function maskedKey(row: Pick<ApiKeyRow, "start" | "last4">) {
  return `${row.start}${"•".repeat(row.start.startsWith("rs_") ? 16 : 6)}${row.last4}`;
}
