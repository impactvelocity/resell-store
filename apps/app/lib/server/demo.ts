import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  and,
  apiKey,
  checkout,
  db,
  demoState,
  dispute,
  desc,
  eq,
  favourite,
  file,
  follow,
  gt,
  inArray,
  listing,
  marketLogin,
  message,
  ne,
  offer,
  or,
  orders,
  priceCheck,
  review,
  shop,
  sql,
  thread,
  user,
  webhookEndpoint,
  webhookSubscription,
  type ListingStatus,
} from "@repo/db";
import { deleteFiles } from "./files";

/*
 * The shared demo accounts (DEMO=true). The welcome page offers "sell as" and
 * "shop as" buttons that sign straight in, no email. Anyone can use them, so:
 *
 * - The demo seller can try the listing flow on new drafts, but can't put
 *   anything live, change the listings already there or the store's settings.
 * - The demo buyer can offer, message and buy (PayPal sandbox), but only at the
 *   example stores, never a real seller's.
 * - Neither can change their profile, reviews, PayPal or make API keys.
 * - Every DEMO_RESET_MINUTES (10) everything they added since the baseline goes:
 *   drafts, orders (what they bought is live again), offers, messages, likes.
 *
 * The accounts are seed users by default (`pnpm --filter app seed`); point
 * DEMO_SELLER_EMAIL / DEMO_BUYER_EMAIL at others. The seed resets the baseline.
 */

export const demoEnabled = process.env.DEMO === "true";

export type DemoRole = "seller" | "buyer";

const demoEmails: Record<DemoRole, string> = {
  seller: (process.env.DEMO_SELLER_EMAIL || "dana.okafor@example.com").toLowerCase(),
  buyer: (process.env.DEMO_BUYER_EMAIL || "ava.lindqvist@example.com").toLowerCase(),
};

export const demoResetMinutes = Number(process.env.DEMO_RESET_MINUTES) || 10;
/** New drafts the demo seller may start between resets (each one runs research). */
const maxDrafts = Number(process.env.DEMO_MAX_DRAFTS) || 5;

export function demoEmail(role: DemoRole) {
  return demoEmails[role];
}

/** One of the shared demo accounts, while the demo is on. */
export function isDemoUser(person: { email: string } | null | undefined) {
  if (!demoEnabled || !person) return false;
  const email = person.email.toLowerCase();
  return email === demoEmails.seller || email === demoEmails.buyer;
}

/**
 * A made-up address checkout starts with while the demo is on, so trying a
 * purchase doesn't mean typing one. Null when the demo is off. Still editable.
 */
export function demoShipTo(name: string) {
  if (!demoEnabled) return null;
  return { name, address: "350 Demo Street, Apt 4, Portland, OR 97209", country: "United States" };
}

/** What a demo account sees instead of doing the thing. */
export const demoMessages = {
  publish: "The demo can't put listings live. Sign up with your email to sell for real.",
  listing: "The demo can only change drafts it started. Start a new listing to try it out.",
  drafts: `The demo has started all the drafts it can for now. It resets every ${demoResetMinutes} minutes.`,
  shop: "The demo store's settings are locked. Sign up with your email to open your own store.",
  account: "The demo account can't be changed. Sign up with your email to make it yours.",
  review: "The demo can't post reviews. Sign up with your email to leave one.",
  trade: "The demo account can only shop at the example stores.",
  connect: "The demo account can't connect other accounts. Sign up with your email to connect yours.",
  keys: "The demo account can't make API keys or agent links. Sign up with your email to get your own.",
  public: "The marketplace is closed to new stores during the demo. Pick “Anyone with the link” and share it yourself.",
} as const;

export type DemoBlock = keyof typeof demoMessages;

/** The message to show when `person` is a demo account, else null. */
export function demoBlocked(person: { email: string } | null | undefined, what: DemoBlock) {
  return isDemoUser(person) ? demoMessages[what] : null;
}

export class DemoBlockedError extends Error {
  constructor(what: DemoBlock) {
    super(demoMessages[what]);
  }
}

/** Throws a DemoBlockedError for a demo account. */
export function assertNotDemo(person: { email: string } | null | undefined, what: DemoBlock) {
  if (isDemoUser(person)) throw new DemoBlockedError(what);
}

/**
 * While the demo is on, accounts made during it can't put a store on the
 * marketplace (only the example stores are there). Link-only and private
 * stores are fine. A store already public stays public.
 */
export function demoPublicBlocked(next: string | undefined, current?: string) {
  return demoEnabled && next === "public" && current !== "public" ? demoMessages.public : null;
}

/* Baseline ----------------------------------------------------------------- */

async function stateAt(key: "baseline" | "reset") {
  const [row] = await db.select({ at: demoState.at }).from(demoState).where(eq(demoState.key, key));
  return row?.at ?? null;
}

/** When the demo started from the seed: anything newer is the demo's and gets reset. */
export async function demoBaseline() {
  return stateAt("baseline");
}

export async function ensureDemoBaseline() {
  const at = await demoBaseline();
  if (at) return at;
  await db.insert(demoState).values({ key: "baseline", at: new Date() }).onConflictDoNothing();
  return (await demoBaseline())!;
}

/** The seed calls this: its rows are the new starting point. */
export async function clearDemoBaseline() {
  await db.delete(demoState);
}

/* Guards ------------------------------------------------------------------- */

/**
 * A demo seller may change a listing only while it's a draft they started
 * (after the baseline), so the example store stays as it was.
 */
export async function demoListingBlocked(
  person: { email: string },
  row: { status: ListingStatus; createdAt: Date },
): Promise<string | null> {
  if (!isDemoUser(person)) return null;
  const since = await demoBaseline();
  if (row.status !== "draft" || !since || row.createdAt <= since) return demoMessages.listing;
  return null;
}

/** Before a demo seller starts another draft. */
export async function demoDraftsBlocked(person: { id: string; email: string }): Promise<string | null> {
  if (!isDemoUser(person)) return null;
  const since = await ensureDemoBaseline();
  const [{ n }] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .where(and(eq(shop.ownerId, person.id), gt(listing.createdAt, since)))) as [{ n: number }];
  return n >= maxDrafts ? demoMessages.drafts : null;
}

/**
 * The demo buyer only deals with the example stores (seed or demo owners), so
 * real sellers never hear from it. Name the store, or a listing in it.
 */
export async function assertDemoMayTrade(
  person: { email: string } | null | undefined,
  where: { shopSlug: string } | { listingId: string },
) {
  if (!isDemoUser(person)) return;
  const [row] = await db
    .select({ ownerId: shop.ownerId, email: user.email })
    .from(shop)
    .innerJoin(user, eq(user.id, shop.ownerId))
    .where(
      "shopSlug" in where
        ? eq(shop.slug, where.shopSlug)
        : sql`${shop.id} = (select shop_id from listing where id = ${where.listingId})`,
    );
  // Nothing found: let the usual "not found" answer it
  if (!row || row.ownerId.startsWith("seed_") || isDemoUser(row)) return;
  throw new DemoBlockedError("trade");
}

/* Signing in --------------------------------------------------------------- */

const capture = new AsyncLocalStorage<{ token?: string }>();

/** Runs `fn` catching the magic-link token it makes instead of emailing it. */
export async function withCapturedLink<T>(fn: () => Promise<T>) {
  const store: { token?: string } = {};
  await capture.run(store, fn);
  return store.token ?? null;
}

/** For sendMagicLink: true when a demo sign-in is collecting the token. */
export function captureDemoLink(token: string) {
  const store = capture.getStore();
  if (!store) return false;
  store.token = token;
  return true;
}

export type DemoAccount = { role: DemoRole; name: string; shopName: string | null };

/** The demo accounts that exist in this database, for the welcome page. */
export async function demoAccounts(): Promise<DemoAccount[]> {
  if (!demoEnabled) return [];
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.email, Object.values(demoEmails)));
  const out: DemoAccount[] = [];
  for (const role of ["seller", "buyer"] as const) {
    const row = rows.find((r) => r.email.toLowerCase() === demoEmails[role]);
    if (!row) continue;
    const [first] =
      role === "seller"
        ? await db.select({ name: shop.name }).from(shop).where(eq(shop.ownerId, row.id)).orderBy(shop.createdAt).limit(1)
        : [];
    out.push({ role, name: row.name.split(" ")[0]!, shopName: first?.name ?? null });
  }
  return out;
}

/* Reset -------------------------------------------------------------------- */

/** Puts the demo back when the last reset is older than DEMO_RESET_MINUTES. */
export async function resetDemoIfDue() {
  if (!demoEnabled) return null;
  await ensureDemoBaseline();
  const last = await stateAt("reset");
  if (last && Date.now() - last.getTime() < demoResetMinutes * 60_000) return null;
  return resetDemo();
}

/**
 * Removes what the demo accounts added since the baseline. Their own rows go;
 * seed listings they bought are live again; seed threads they wrote in lose
 * those messages.
 */
export async function resetDemo() {
  if (!demoEnabled) return null;
  const since = await ensureDemoBaseline();
  const people = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.email, Object.values(demoEmails)));
  const ids = people.map((p) => p.id);
  const result = { orders: 0, listings: 0, threads: 0, messages: 0, files: 0 };
  if (ids.length === 0) return result;
  const shopIds = (await db.select({ id: shop.id }).from(shop).where(inArray(shop.ownerId, ids))).map((s) => s.id);
  type Column = Parameters<typeof inArray>[0];
  /** Rows on either side of the demo: the demo buyer's, or at a demo store. */
  const theirs = (buyerCol: Column, shopCol: Column) =>
    shopIds.length ? or(inArray(buyerCol, ids), inArray(shopCol, shopIds))! : inArray(buyerCol, ids);

  const fileIds = await db.transaction(async (tx) => {
    // Orders made during the demo (reviews and disputes go with them)
    const made = await tx
      .select({ id: orders.id, listingId: orders.listingId })
      .from(orders)
      .where(
        and(
          gt(orders.createdAt, since),
          theirs(orders.buyerId, orders.shopId),
        ),
      );
    if (made.length) {
      await tx.delete(orders).where(inArray(orders.id, made.map((o) => o.id)));
      // What they bought is for sale again, unless an older order still holds it
      const bought = [...new Set(made.map((o) => o.listingId))];
      const held = (
        await tx.select({ listingId: orders.listingId }).from(orders).where(inArray(orders.listingId, bought))
      ).map((o) => o.listingId);
      const restore = bought.filter((id) => !held.includes(id));
      if (restore.length)
        await tx
          .update(listing)
          .set({ status: "live", soldAt: null })
          .where(and(inArray(listing.id, restore), ne(listing.status, "live"), sql`${listing.createdAt} <= ${since}`));
    }
    result.orders = made.length;

    // Problems reported during the demo on orders from before it
    await tx
      .delete(dispute)
      .where(
        and(
          gt(dispute.createdAt, since),
          inArray(
            dispute.orderId,
            tx.select({ id: orders.id }).from(orders).where(theirs(orders.buyerId, orders.shopId)),
          ),
        ),
      );

    await tx.delete(checkout).where(and(inArray(checkout.buyerId, ids), gt(checkout.createdAt, since)));
    await tx
      .delete(offer)
      .where(and(gt(offer.createdAt, since), theirs(offer.buyerId, offer.shopId)));

    // Conversations started in the demo go whole; older ones lose the new messages
    const threadScope = theirs(thread.buyerId, thread.shopId);
    result.threads = (
      await tx.delete(thread).where(and(gt(thread.createdAt, since), threadScope)).returning({ id: thread.id })
    ).length;
    const older = (await tx.select({ id: thread.id }).from(thread).where(threadScope)).map((t) => t.id);
    if (older.length) {
      const removed = await tx
        .delete(message)
        .where(and(inArray(message.threadId, older), gt(message.createdAt, since)))
        .returning({ threadId: message.threadId });
      result.messages = removed.length;
      for (const threadId of new Set(removed.map((m) => m.threadId))) {
        const [last] = await tx
          .select()
          .from(message)
          .where(eq(message.threadId, threadId))
          .orderBy(desc(message.createdAt))
          .limit(1);
        if (!last) {
          await tx.delete(thread).where(eq(thread.id, threadId));
          continue;
        }
        await tx
          .update(thread)
          .set({
            lastMessageAt: last.createdAt,
            lastSide: last.side,
            lastPreview: last.body.slice(0, 140),
          })
          .where(eq(thread.id, threadId));
      }
    }

    // Drafts the demo seller started (photos, words and research go with them)
    if (shopIds.length)
      result.listings = (
        await tx
          .delete(listing)
          .where(and(inArray(listing.shopId, shopIds), gt(listing.createdAt, since)))
          .returning({ id: listing.id })
      ).length;

    await tx.delete(favourite).where(and(inArray(favourite.userId, ids), gt(favourite.createdAt, since)));
    await tx.delete(follow).where(and(inArray(follow.userId, ids), gt(follow.createdAt, since)));
    await tx.delete(review).where(and(inArray(review.buyerId, ids), gt(review.createdAt, since)));
    await tx.delete(priceCheck).where(and(inArray(priceCheck.userId, ids), gt(priceCheck.createdAt, since)));
    await tx.delete(marketLogin).where(and(inArray(marketLogin.userId, ids), gt(marketLogin.createdAt, since)));
    await tx.delete(apiKey).where(inArray(apiKey.userId, ids));
    await tx.delete(webhookEndpoint).where(inArray(webhookEndpoint.userId, ids));
    await tx.delete(webhookSubscription).where(inArray(webhookSubscription.userId, ids));

    await tx
      .insert(demoState)
      .values({ key: "reset", at: new Date() })
      .onConflictDoUpdate({ target: demoState.key, set: { at: new Date() } });

    // Their uploads since (store pictures and avatars are locked, so all are drafts')
    return (
      await tx
        .select({ id: file.id })
        .from(file)
        .where(and(inArray(file.ownerId, ids), gt(file.createdAt, since)))
    ).map((f) => f.id);
  });

  await deleteFiles(fileIds);
  result.files = fileIds.length;
  return result;
}
