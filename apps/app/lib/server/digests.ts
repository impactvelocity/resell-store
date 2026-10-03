import "server-only";
import { createElement } from "react";
import {
  AgentSummaryEmail,
  agentSummarySubject,
  NewFromShopEmail,
  newFromShopSubject,
  type AgentSummaryEmailProps,
} from "@repo/email";
import {
  activity,
  and,
  count,
  db,
  desc,
  eq,
  follow,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  listing,
  lte,
  message,
  ne,
  offer,
  orders,
  review,
  shop,
  sql,
  thread,
  user,
} from "@repo/db";
import { siteUrl, storeUrl } from "../urls";
import { coverPhotos } from "./listings";
import { absolute, deliver, firstName, safely } from "./notify";
import { notifyReviewRequest } from "./notify-after-sale";

/*
 * The emails that roll several things up, sent from the sweeps:
 *
 *   follow   new listings from shops someone follows, if they turned
 *            "A shop I follow lists something" on (off by default)
 *   agent    the seller's evening summary of what their shop's agent did and
 *            what's waiting on them ("My agent does something", on by default)
 *   review   "how was it?" to the buyer two days after an order's done
 *
 * Preferences live in user.notify_prefs (set on /me); missing keys take the
 * defaults from the settings screen.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The default for each notification switch on /me, when someone hasn't set it. */
const prefDefaults: Record<string, boolean> = { offer: true, sold: true, agent: true, follow: false };

export function wants(prefs: Record<string, boolean> | null | undefined, key: string) {
  return prefs?.[key] ?? prefDefaults[key] ?? true;
}

const dollars = (cents: number | null) => (cents ?? 0) / 100;

/* New from shops you follow */

/**
 * For everyone who wants them: listings published since their last one of
 * these (or the last day, the first time), one email per shop. Claims the
 * window before sending, so two sweeps at once don't both send.
 */
export async function sendFollowDigests(now = new Date()) {
  const people = await db
    .select({ id: user.id, email: user.email, notifyPrefs: user.notifyPrefs, followMailedAt: user.followMailedAt })
    .from(user)
    .where(sql`exists (select 1 from ${follow} where ${follow.userId} = ${user.id})`);
  let sent = 0;
  for (const person of people) {
    if (!wants(person.notifyPrefs, "follow")) continue;
    const since = person.followMailedAt ?? new Date(now.getTime() - DAY);
    const rows = await db
      .select({
        id: listing.id,
        slug: listing.slug,
        title: sql<string>`coalesce(${listing.title}, ${listing.name}, 'Untitled')`,
        priceCents: listing.priceCents,
        publishedAt: listing.publishedAt,
        shop: { id: shop.id, slug: shop.slug, name: shop.name },
      })
      .from(follow)
      .innerJoin(shop, eq(shop.id, follow.shopId))
      .innerJoin(listing, eq(listing.shopId, shop.id))
      .where(
        and(
          eq(follow.userId, person.id),
          ne(shop.ownerId, person.id),
          eq(shop.visibility, "public"),
          eq(shop.paused, false),
          eq(listing.status, "live"),
          eq(listing.visibility, "everyone"),
          isNotNull(listing.slug),
          isNotNull(listing.priceCents),
          gt(listing.publishedAt, since),
          lte(listing.publishedAt, now),
        ),
      )
      .orderBy(desc(listing.publishedAt));
    if (!rows.length) continue;

    const newest = rows[0]!.publishedAt!;
    // Claim it: only the sweep that moves the mark sends
    const claimed = await db
      .update(user)
      .set({ followMailedAt: newest })
      .where(
        and(
          eq(user.id, person.id),
          person.followMailedAt ? eq(user.followMailedAt, person.followMailedAt) : isNull(user.followMailedAt),
        ),
      )
      .returning({ id: user.id });
    if (!claimed.length) continue;

    const covers = await coverPhotos(rows.map((r) => r.id));
    const byShop = new Map<string, typeof rows>();
    for (const r of rows) byShop.set(r.shop.id, [...(byShop.get(r.shop.id) ?? []), r]);
    for (const items of byShop.values()) {
      const s = items[0]!.shop;
      const props = {
        shop: { name: s.name, url: storeUrl(s.slug) },
        items: items.map((r) => ({
          title: r.title,
          price: dollars(r.priceCents),
          imageUrl: absolute(covers.get(r.id)),
          url: storeUrl(s.slug, `/${r.slug}`),
        })),
      };
      await safely("follow digest", () =>
        deliver(person.email, newFromShopSubject(props), createElement(NewFromShopEmail, props)),
      );
      sent++;
    }
  }
  return sent;
}

/* The seller's evening summary */

/** The hour (UTC) the evening summary goes out. 1am UTC is early evening across the US. */
export const AGENT_SUMMARY_HOUR = Number(process.env.AGENT_SUMMARY_HOUR || 1);

const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What one seller's shop agent did in the 24 hours to `now`, and what's
 * waiting on them. Null when there's nothing worth an email.
 */
export async function agentSummaryFor(sellerId: string, now = new Date()): Promise<AgentSummaryEmailProps | null> {
  const since = new Date(now.getTime() - DAY);
  const shops = await db.select({ id: shop.id }).from(shop).where(eq(shop.ownerId, sellerId));
  const shopIds = shops.map((s) => s.id);
  if (!shopIds.length) return null;
  const title = sql<string>`coalesce(${listing.title}, ${listing.name}, 'your listing')`;

  const [answers, counters, waitingThreads, openOffers, [views], [questions], [offersIn]] = await Promise.all([
    // What the agent did
    db
      .select({ at: message.createdAt, buyer: { name: user.name, email: user.email }, listing: title })
      .from(message)
      .innerJoin(thread, eq(thread.id, message.threadId))
      .innerJoin(user, eq(user.id, thread.buyerId))
      .leftJoin(listing, eq(listing.id, thread.listingId))
      .where(and(inArray(thread.shopId, shopIds), eq(message.byAgent, true), gte(message.createdAt, since), lte(message.createdAt, now))),
    db
      .select({ at: offer.respondedAt, counterCents: offer.counterCents, buyer: { name: user.name, email: user.email }, listing: title })
      .from(offer)
      .innerJoin(user, eq(user.id, offer.buyerId))
      .innerJoin(listing, eq(listing.id, offer.listingId))
      .where(and(inArray(offer.shopId, shopIds), eq(offer.counteredBy, "agent"), gte(offer.respondedAt, since), lte(offer.respondedAt, now))),
    // What's waiting on them
    db
      .select({ id: thread.id, preview: thread.lastPreview, buyer: { name: user.name, email: user.email }, listing: title, listingId: thread.listingId })
      .from(thread)
      .innerJoin(user, eq(user.id, thread.buyerId))
      .leftJoin(listing, eq(listing.id, thread.listingId))
      .where(and(inArray(thread.shopId, shopIds), eq(thread.needsSeller, true)))
      .orderBy(desc(thread.lastMessageAt))
      .limit(5),
    db
      .select({ id: offer.id, amountCents: offer.amountCents, agentNote: offer.agentNote, buyer: { name: user.name, email: user.email }, listing: title, listingId: offer.listingId })
      .from(offer)
      .innerJoin(user, eq(user.id, offer.buyerId))
      .innerJoin(listing, eq(listing.id, offer.listingId))
      .where(and(inArray(offer.shopId, shopIds), eq(offer.status, "open"), gt(offer.expiresAt, now)))
      .orderBy(desc(offer.createdAt))
      .limit(5),
    // The day in numbers
    db.select({ n: count() }).from(activity).where(and(inArray(activity.shopId, shopIds), eq(activity.kind, "view"), gte(activity.createdAt, since))),
    db
      .select({ n: count() })
      .from(message)
      .innerJoin(thread, eq(thread.id, message.threadId))
      .where(and(inArray(thread.shopId, shopIds), eq(message.side, "buyer"), gte(message.createdAt, since))),
    db.select({ n: count() }).from(offer).where(and(inArray(offer.shopId, shopIds), gte(offer.createdAt, since))),
  ]);

  const handled = [
    ...answers.map((a) => ({ at: a.at, text: `Answered ${firstName(a.buyer)} about ${a.listing}` })),
    ...counters.map((c) => ({ at: c.at!, text: `Countered ${firstName(c.buyer)} at $${dollars(c.counterCents)} on ${c.listing}` })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((h) => ({ text: h.text, time: time(h.at) }));

  const covers = await coverPhotos(
    [...waitingThreads.map((t) => t.listingId), ...openOffers.map((o) => o.listingId)].filter((id): id is string => !!id),
  );
  const needsYou = [
    ...openOffers.map((o) => ({
      title: `${firstName(o.buyer)} offered $${dollars(o.amountCents)}`,
      body: `${o.listing}.${o.agentNote ? ` ${o.agentNote}` : ""}`,
      url: siteUrl(`/offers/${o.id}`),
      imageUrl: absolute(covers.get(o.listingId)),
    })),
    ...waitingThreads.map((t) => ({
      title: `${firstName(t.buyer)} asked about ${t.listing}`,
      body: t.preview || "Your agent wasn't sure, so it's over to you.",
      url: siteUrl(`/inbox/${t.id}`),
      imageUrl: absolute(t.listingId ? covers.get(t.listingId) : null),
    })),
  ];
  if (!handled.length && !needsYou.length) return null;

  const did = [
    answers.length && `answered ${plural(answers.length, "question")}`,
    counters.length && `countered ${plural(counters.length, "offer")}`,
  ].filter(Boolean) as string[];
  const summary = [
    did.length ? `I ${did.join(" and ")}.` : "A quiet day for me.",
    needsYou.length ? `${needsYou.length === 1 ? "One thing is" : `${plural(needsYou.length, "thing")} are`} waiting on you.` : "Nothing's waiting on you.",
  ].join(" ");

  return {
    day: new Date(now.getTime() - 6 * HOUR).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    summary,
    stats: [
      { label: "Views", value: String(views?.n ?? 0) },
      { label: "Questions", value: String(questions?.n ?? 0) },
      { label: "Offers", value: String(offersIn?.n ?? 0) },
    ],
    needsYou,
    handled,
    inboxUrl: siteUrl("/inbox"),
  };
}

/**
 * Once a day, at AGENT_SUMMARY_HOUR (UTC) or later: every seller who wants
 * it and had something happen. `claim` marks a seller as done for the day
 * (the notice table, passed in by sweeps.ts) so nobody gets two.
 */
export async function sendAgentSummaries(claim: (kind: string, refId: string) => Promise<boolean>, now = new Date()) {
  if (now.getUTCHours() < AGENT_SUMMARY_HOUR) return 0;
  const day = now.toISOString().slice(0, 10);
  const sellers = await db
    .selectDistinct({ id: user.id, email: user.email, notifyPrefs: user.notifyPrefs })
    .from(user)
    .innerJoin(shop, eq(shop.ownerId, user.id));
  let sent = 0;
  for (const seller of sellers) {
    if (!wants(seller.notifyPrefs, "agent")) continue;
    const props = await agentSummaryFor(seller.id, now);
    if (!props) continue;
    if (!(await claim(`agent-summary:${day}`, seller.id))) continue;
    await safely("agent summary", () =>
      deliver(seller.email, agentSummarySubject(props), createElement(AgentSummaryEmail, props)),
    );
    sent++;
  }
  return sent;
}

/* Reviews */

/** Two days after an order's done (and up to a month), ask the buyer for a review. Once. */
export async function requestReviews(claim: (kind: string, refId: string) => Promise<boolean>, now = new Date()) {
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .leftJoin(review, eq(review.orderId, orders.id))
    .where(
      and(
        eq(orders.status, "completed"),
        lte(orders.completedAt, new Date(now.getTime() - 2 * DAY)),
        gte(orders.completedAt, new Date(now.getTime() - 30 * DAY)),
        isNull(review.id),
      ),
    );
  let sent = 0;
  for (const o of due) {
    if (!(await claim("order.review-request", o.id))) continue;
    sent++;
    await notifyReviewRequest(o.id);
  }
  return sent;
}
