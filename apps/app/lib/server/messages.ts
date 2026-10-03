import "server-only";
import { and, asc, db, desc, eq, gt, isNull, listing, message, or, shop, sql, thread, user } from "@repo/db";
import { aiConfigured } from "./ai";
import { emitQuestion } from "./api/webhooks";
import { runAfterResponse } from "./later";
import { coverPhotos } from "./listings";

/*
 * Buyer ↔ shop conversations (P6 Messages for the buyer, A5 Inbox for the
 * seller). A thread belongs to one buyer and one shop, optionally about one
 * listing. Each side has a read mark; a thread is unread for a side when the
 * other side wrote last and that's newer than the mark.
 */

export class MessageError extends Error {}

export type Side = "buyer" | "seller";
export type ThreadRow = typeof thread.$inferSelect;

export const MAX_MESSAGE = 2000;

function cleanBody(body: string) {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) throw new MessageError("Write something first.");
  if (text.length > MAX_MESSAGE) throw new MessageError("That's a long one. Keep it under 2,000 characters.");
  return text;
}

/** The first line, shortened, for list previews. */
function preview(text: string) {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return line.length > 140 ? `${line.slice(0, 139)}…` : line;
}

/**
 * Unread for `side`: the other side wrote last, after `side` last read. The
 * shop's agent writes on the seller's side, but the seller hasn't seen what
 * it said, so its answers are unread for the seller too.
 */
function unreadFor(side: Side) {
  const readAt = side === "buyer" ? thread.buyerReadAt : thread.sellerReadAt;
  return and(
    side === "buyer" ? eq(thread.lastSide, "seller") : or(eq(thread.lastSide, "buyer"), eq(thread.lastByAgent, true)),
    or(isNull(readAt), gt(thread.lastMessageAt, readAt)),
  );
}

async function addMessage(
  t: Pick<ThreadRow, "id">,
  side: Side,
  authorId: string | null,
  body: string,
  agent?: { needsSeller: boolean },
) {
  const now = new Date();
  const [row] = await db
    .insert(message)
    .values({ threadId: t.id, authorId, side, body, byAgent: !!agent, createdAt: now })
    .returning();
  await db
    .update(thread)
    .set({
      lastMessageAt: now,
      lastSide: side,
      lastPreview: preview(body),
      lastByAgent: !!agent,
      // The agent handing over flags it, until the seller writes themselves
      ...(agent ? (agent.needsSeller ? { needsSeller: true } : {}) : side === "seller" ? { needsSeller: false } : {}),
      // Writing is reading: your own message never shows as unread to you
      ...(agent ? {} : side === "buyer" ? { buyerReadAt: now } : { sellerReadAt: now }),
    })
    .where(eq(thread.id, t.id));
  if (side === "buyer") {
    emitQuestion(row!.id);
    answerLater(row!.id);
  }
  return row!;
}

/** The shop's agent answers the buyer after the response is sent (store-agent.ts, imported late: it imports this file). */
function answerLater(messageId: string) {
  runAfterResponse(async () => (await import("./store-agent")).answerBuyer(messageId));
}

/** The shop's agent writing on the seller's side. `needsSeller` hands the thread to the owner. */
export async function postAgentMessage(threadId: string, body: string, opts: { needsSeller: boolean }) {
  return addMessage({ id: threadId }, "seller", null, cleanBody(body), opts);
}

/** The buyer's existing thread with a shop (about a listing, or general), if any. */
export async function findThread(input: { buyerId: string; shopId: string; listingId: string | null }) {
  const [row] = await db
    .select()
    .from(thread)
    .where(
      and(
        eq(thread.buyerId, input.buyerId),
        eq(thread.shopId, input.shopId),
        input.listingId ? eq(thread.listingId, input.listingId) : isNull(thread.listingId),
      ),
    );
  return row ?? null;
}

/**
 * Who the buyer is writing to, from /messages?to=<shop slug>&about=<listing id>:
 * the shop, and the listing if it belongs to that shop. Null when there's
 * nobody to write to (unknown, private, or their own shop).
 */
export async function resolveRecipient(input: { buyerId: string; shopSlug: string; listingId?: string | null }) {
  const [s] = await db.select().from(shop).where(eq(shop.slug, input.shopSlug));
  if (!s || s.ownerId === input.buyerId || s.visibility === "private") return null;
  let about: { id: string; slug: string | null; title: string; photo: string | null } | null = null;
  if (input.listingId) {
    const [l] = await db
      .select({
        id: listing.id,
        slug: listing.slug,
        title: sql<string>`coalesce(${listing.title}, ${listing.name}, 'Untitled')`,
      })
      .from(listing)
      .where(and(eq(listing.id, input.listingId), eq(listing.shopId, s.id)));
    if (l) about = { ...l, photo: (await coverPhotos([l.id])).get(l.id) ?? null };
  }
  const [owner] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, s.ownerId));
  return { shop: s, owner: firstName(owner), about };
}

/** A buyer's first message to a shop: makes the thread (or reuses it) and sends. */
export async function startConversation(input: {
  buyerId: string;
  shopSlug: string;
  listingId?: string | null;
  body: string;
}) {
  const body = cleanBody(input.body);
  const to = await resolveRecipient(input);
  if (!to) throw new MessageError("You can't message that shop.");
  const listingId = to.about?.id ?? null;
  await db
    .insert(thread)
    .values({ shopId: to.shop.id, buyerId: input.buyerId, listingId })
    .onConflictDoNothing();
  const t = await findThread({ buyerId: input.buyerId, shopId: to.shop.id, listingId });
  if (!t) throw new MessageError("That didn't send. Try again?");
  await addMessage(t, "buyer", input.buyerId, body);
  return t;
}

/** Which side of a thread this person is on, or null if it isn't theirs. */
async function sideOf(threadId: string, userId: string) {
  const [row] = await db
    .select({ thread, ownerId: shop.ownerId, agentOn: shop.answerQuestions })
    .from(thread)
    .innerJoin(shop, eq(shop.id, thread.shopId))
    .where(eq(thread.id, threadId));
  if (!row) return null;
  const agentOn = row.agentOn && aiConfigured;
  if (row.thread.buyerId === userId) return { thread: row.thread, agentOn, side: "buyer" as const };
  if (row.ownerId === userId) return { thread: row.thread, agentOn, side: "seller" as const };
  return null;
}

/** A reply in an existing thread, from whichever side the person is on. */
export async function sendMessage(input: { threadId: string; userId: string; body: string }) {
  const body = cleanBody(input.body);
  const found = await sideOf(input.threadId, input.userId);
  if (!found) throw new MessageError("That conversation isn't yours.");
  return addMessage(found.thread, found.side, input.userId, body);
}

export async function markRead(input: { threadId: string; userId: string }) {
  const found = await sideOf(input.threadId, input.userId);
  if (!found) return;
  await db
    .update(thread)
    .set(found.side === "buyer" ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() })
    .where(eq(thread.id, found.thread.id));
}

/* Reading */

function firstName(p: { name: string | null; email: string } | undefined) {
  const name = p?.name?.trim() || p?.email.split("@")[0] || "Someone";
  return name.split(/\s+/)[0]!;
}

const listingTitle = sql<string | null>`coalesce(${listing.title}, ${listing.name})`;

export type ThreadSummary = {
  id: string;
  /** The other side: the shop (for buyers) or the buyer (for sellers). */
  withName: string;
  initial: string;
  shop: { slug: string; name: string; tone: string };
  listing: { id: string; slug: string | null; title: string; photo: string | null } | null;
  preview: string;
  /** The last message is yours. */
  lastMine: boolean;
  /** The last message is the shop's agent answering. */
  lastByAgent: boolean;
  /** Seller side: the agent couldn't answer and handed it over. */
  needsYou: boolean;
  lastMessageAt: Date;
  unread: boolean;
};

async function summaries(
  side: Side,
  rows: {
    thread: ThreadRow;
    shop: { slug: string; name: string; tone: string };
    title: string | null;
    listingSlug: string | null;
    buyer: { name: string | null; email: string };
  }[],
): Promise<ThreadSummary[]> {
  const photos = await coverPhotos(rows.flatMap((r) => (r.thread.listingId ? [r.thread.listingId] : [])));
  return rows.map(({ thread: t, shop: s, title, listingSlug, buyer }) => {
    const withName = side === "buyer" ? s.name : firstName(buyer);
    const readAt = side === "buyer" ? t.buyerReadAt : t.sellerReadAt;
    return {
      id: t.id,
      withName,
      initial: withName[0]!.toUpperCase(),
      shop: s,
      listing: t.listingId
        ? { id: t.listingId, slug: listingSlug, title: title ?? "Untitled", photo: photos.get(t.listingId) ?? null }
        : null,
      preview: t.lastPreview,
      lastMine: t.lastSide === side,
      lastByAgent: t.lastByAgent,
      needsYou: side === "seller" && t.needsSeller,
      lastMessageAt: t.lastMessageAt,
      unread:
        (t.lastSide !== side || (side === "seller" && t.lastByAgent)) && (!readAt || t.lastMessageAt > readAt),
    };
  });
}

const summaryColumns = {
  thread,
  shop: { slug: shop.slug, name: shop.name, tone: shop.tone },
  title: listingTitle,
  listingSlug: listing.slug,
  buyer: { name: user.name, email: user.email },
};

/** P6: the buyer's conversations, newest first. */
export async function listBuyerThreads(buyerId: string) {
  const rows = await db
    .select(summaryColumns)
    .from(thread)
    .innerJoin(shop, eq(shop.id, thread.shopId))
    .innerJoin(user, eq(user.id, thread.buyerId))
    .leftJoin(listing, eq(listing.id, thread.listingId))
    .where(eq(thread.buyerId, buyerId))
    .orderBy(desc(thread.lastMessageAt));
  return summaries("buyer", rows);
}

/** A5: conversations with buyers across the seller's shops, newest first. */
export async function listSellerThreads(sellerId: string) {
  const rows = await db
    .select(summaryColumns)
    .from(thread)
    .innerJoin(shop, eq(shop.id, thread.shopId))
    .innerJoin(user, eq(user.id, thread.buyerId))
    .leftJoin(listing, eq(listing.id, thread.listingId))
    .where(eq(shop.ownerId, sellerId))
    .orderBy(desc(thread.lastMessageAt));
  return summaries("seller", rows);
}

/** Threads waiting on this person, for badges. A question the agent handed over waits until it's answered. */
export async function countUnread(userId: string, side: Side) {
  const count = sql<number>`count(*)`.mapWith(Number);
  const base = db.select({ n: count }).from(thread);
  const [row] =
    side === "buyer"
      ? await base.where(and(eq(thread.buyerId, userId), unreadFor("buyer")))
      : await base
          .innerJoin(shop, eq(shop.id, thread.shopId))
          .where(and(eq(shop.ownerId, userId), or(unreadFor("seller"), eq(thread.needsSeller, true))));
  return row?.n ?? 0;
}

export type ThreadMessage = {
  id: string;
  mine: boolean;
  /** Written by the shop's agent (on the seller's side). */
  byAgent: boolean;
  body: string;
  createdAt: string;
};

/** One conversation as this person sees it, or null if it isn't theirs. */
export async function loadThread(threadId: string, userId: string) {
  const found = await sideOf(threadId, userId);
  if (!found) return null;
  const [summary] = (await (found.side === "buyer" ? listBuyerThreads(userId) : listSellerThreads(userId))).filter(
    (t) => t.id === threadId,
  );
  const rows = await db.select().from(message).where(eq(message.threadId, threadId)).orderBy(asc(message.createdAt));
  const [owner] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .innerJoin(shop, eq(shop.ownerId, user.id))
    .where(eq(shop.id, found.thread.shopId));
  return {
    side: found.side,
    /** The shop's agent answers buyers here. */
    agentOn: found.agentOn,
    /** The shop owner's first name. */
    owner: firstName(owner),
    summary: summary!,
    messages: rows.map<ThreadMessage>((m) => ({
      id: m.id,
      mine: m.side === found.side,
      byAgent: m.byAgent,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
