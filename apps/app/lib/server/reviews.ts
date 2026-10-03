import "server-only";
import { and, db, desc, eq, inArray, isNull, listing, orders, review, shop, sql, user } from "@repo/db";
import { emitReviewEvent } from "./api/webhooks";
import { CommerceError } from "./commerce";

/*
 * Buyer reviews: once an order is done, the buyer gives it 1 to 5 stars and a
 * few words, shown on the shop and the listing or sent only to the seller.
 * One per order. The buyer can change it for 30 days; the seller can reply
 * (and tweak the reply). resell.store can take one down (hiddenAt), which
 * keeps it for the record but out of every public read.
 *
 * Public reads never carry a buyer's email or surname: only their first name.
 */

export type ReviewRow = typeof review.$inferSelect;

/** Longest review, and longest reply. */
export const REVIEW_MAX = 1000;
/** How long the buyer can change their review. */
export const EDIT_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** The last moment the buyer can edit this review. */
export const editableUntil = (r: Pick<ReviewRow, "createdAt">) => new Date(r.createdAt.getTime() + EDIT_DAYS * DAY);

export const canEditReview = (r: Pick<ReviewRow, "createdAt" | "hiddenAt">, now = new Date()) =>
  !r.hiddenAt && now < editableUntil(r);

function cleanRating(rating: unknown) {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new CommerceError("Pick from 1 to 5 stars.");
  return rating;
}

function cleanBody(body: string | null | undefined, what = "Keep it") {
  const text = body?.trim() ?? "";
  if (text.length > REVIEW_MAX) throw new CommerceError(`${what} under ${REVIEW_MAX} characters.`);
  return text || null;
}

/** "Priya Shah" → "Priya". No name, no guessing from the email. */
export function buyerFirstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || "A buyer";
}

/* Writing */

/** The buyer of a completed order reviews it. One per order. */
export async function leaveReview(input: {
  buyerId: string;
  orderId: string;
  rating: number;
  body?: string | null;
  public?: boolean;
}) {
  const [o] = await db.select().from(orders).where(eq(orders.id, input.orderId));
  if (!o || o.buyerId !== input.buyerId) throw new CommerceError("We couldn't find that order.");
  if (o.status !== "completed") throw new CommerceError("You can review it once the order is all done.");
  const rating = cleanRating(input.rating);
  const body = cleanBody(input.body);
  const [row] = await db
    .insert(review)
    .values({
      orderId: o.id,
      listingId: o.listingId,
      shopId: o.shopId,
      buyerId: o.buyerId,
      rating,
      body,
      public: input.public ?? true,
    })
    .onConflictDoNothing({ target: review.orderId })
    .returning();
  if (!row) throw new CommerceError("You've already reviewed this order. You can edit that review instead.");
  emitReviewEvent(row.id);
  return row;
}

/** The buyer changes their stars, words or who sees it, within 30 days. */
export async function editReview(input: {
  buyerId: string;
  reviewId: string;
  rating?: number;
  body?: string | null;
  public?: boolean;
}) {
  const [r] = await db.select().from(review).where(eq(review.id, input.reviewId));
  if (!r || r.buyerId !== input.buyerId) throw new CommerceError("We couldn't find that review.");
  if (r.hiddenAt) throw new CommerceError("resell.store took this review down, so it can't be changed.");
  if (!canEditReview(r)) throw new CommerceError(`Reviews can only be changed for ${EDIT_DAYS} days.`);
  const changes: Partial<typeof review.$inferInsert> = {};
  if (input.rating !== undefined) changes.rating = cleanRating(input.rating);
  if (input.body !== undefined) changes.body = cleanBody(input.body);
  if (input.public !== undefined) changes.public = input.public;
  if (Object.keys(changes).length === 0) return r;
  const [row] = await db.update(review).set(changes).where(eq(review.id, r.id)).returning();
  return row!;
}

/** The shop's owner answers a review. One reply, which they can change. */
export async function replyToReview(input: { sellerId: string; reviewId: string; body: string }) {
  const [found] = await db
    .select({ review, ownerId: shop.ownerId })
    .from(review)
    .innerJoin(shop, eq(shop.id, review.shopId))
    .where(eq(review.id, input.reviewId));
  if (!found || found.ownerId !== input.sellerId) throw new CommerceError("We couldn't find that review.");
  const body = cleanBody(input.body, "Keep your reply");
  if (!body) throw new CommerceError("Write a few words first.");
  const [row] = await db
    .update(review)
    .set({ sellerReply: body, repliedAt: found.review.repliedAt ?? new Date() })
    .where(eq(review.id, found.review.id))
    .returning();
  return row!;
}

/** resell.store takes a review down (abuse). Kept for the record, gone from every public read. */
export async function hideReview(reviewId: string) {
  const [row] = await db
    .update(review)
    .set({ hiddenAt: sql`coalesce(${review.hiddenAt}, now())` })
    .where(eq(review.id, reviewId))
    .returning();
  return row ?? null;
}

/* Reading */

/** Reviews anyone may see: public and not taken down. */
const shown = and(eq(review.public, true), isNull(review.hiddenAt));

export type Rating = { average: number; count: number };
export type RatingBreakdown = Rating & {
  /** How many reviews gave each number of stars, 1 to 5. */
  stars: Record<1 | 2 | 3 | 4 | 5, number>;
};

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** A shop's stars over its public reviews, and how many there are of each. */
export async function shopRatingBreakdown(shopId: string): Promise<RatingBreakdown> {
  const rows = await db
    .select({ rating: review.rating, n: sql<number>`count(*)`.mapWith(Number) })
    .from(review)
    .where(and(eq(review.shopId, shopId), shown))
    .groupBy(review.rating);
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let total = 0;
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) stars[r.rating as 1 | 2 | 3 | 4 | 5] = r.n;
    count += r.n;
    total += r.n * r.rating;
  }
  return { average: count ? oneDecimal(total / count) : 0, count, stars };
}

/** A shop's average stars (one decimal) and how many public reviews it has. */
export async function shopRating(shopId: string): Promise<Rating> {
  const { average, count } = await shopRatingBreakdown(shopId);
  return { average, count };
}

/** Ratings for many shops at once (store cards). Shops with no reviews are left out. */
export async function shopRatings(shopIds: string[]): Promise<Map<string, Rating>> {
  const out = new Map<string, Rating>();
  const ids = [...new Set(shopIds)];
  if (!ids.length) return out;
  const rows = await db
    .select({
      shopId: review.shopId,
      average: sql<number>`avg(${review.rating})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(review)
    .where(and(inArray(review.shopId, ids), shown))
    .groupBy(review.shopId);
  for (const r of rows) out.set(r.shopId, { average: oneDecimal(r.average), count: r.count });
  return out;
}

/** Ratings for stores by slug (store cards only know their slug). */
export async function shopRatingsBySlug(slugs: string[]): Promise<Map<string, Rating>> {
  const out = new Map<string, Rating>();
  const unique = [...new Set(slugs)];
  if (!unique.length) return out;
  const rows = await db
    .select({
      slug: shop.slug,
      average: sql<number>`avg(${review.rating})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(review)
    .innerJoin(shop, eq(shop.id, review.shopId))
    .where(and(inArray(shop.slug, unique), shown))
    .groupBy(shop.slug);
  for (const r of rows) out.set(r.slug, { average: oneDecimal(r.average), count: r.count });
  return out;
}

/** Store cards with their stars filled in (left as they were with no reviews). */
export async function withRatings<T extends { slug: string; rating?: number; ratings?: number }>(stores: T[]): Promise<T[]> {
  const ratings = await shopRatingsBySlug(stores.map((s) => s.slug));
  return stores.map((s) => {
    const r = ratings.get(s.slug);
    return r ? { ...s, rating: r.average, ratings: r.count } : s;
  });
}

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  /** First name only. */
  buyer: string;
  createdAt: Date;
  listing: { id: string; title: string; slug: string | null };
  shop: { slug: string; name: string };
  reply: { body: string; at: Date } | null;
};

const publicColumns = {
  id: review.id,
  rating: review.rating,
  body: review.body,
  createdAt: review.createdAt,
  sellerReply: review.sellerReply,
  repliedAt: review.repliedAt,
  buyerName: user.name,
  listingId: listing.id,
  listingTitle: listing.title,
  listingName: listing.name,
  listingSlug: listing.slug,
  shopSlug: shop.slug,
  shopName: shop.name,
};

type PublicRow = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  sellerReply: string | null;
  repliedAt: Date | null;
  buyerName: string | null;
  listingId: string;
  listingTitle: string | null;
  listingName: string | null;
  listingSlug: string | null;
  shopSlug: string;
  shopName: string;
};

function toPublicReview(r: PublicRow): PublicReview {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    buyer: buyerFirstName(r.buyerName),
    createdAt: r.createdAt,
    listing: { id: r.listingId, title: r.listingTitle ?? r.listingName ?? "Untitled", slug: r.listingSlug },
    shop: { slug: r.shopSlug, name: r.shopName },
    reply: r.sellerReply ? { body: r.sellerReply, at: r.repliedAt ?? r.createdAt } : null,
  };
}

/**
 * Public reviews of a shop or a listing, newest first. `cursor` is the last
 * review's id from the page before; `nextCursor` is null on the last page.
 */
export async function publicReviews(input: {
  shopId?: string;
  listingId?: string;
  /** Only reviews with this many stars. */
  rating?: number;
  limit?: number;
  cursor?: string | null;
}): Promise<{ reviews: PublicReview[]; nextCursor: string | null }> {
  if (!input.shopId && !input.listingId) throw new Error("publicReviews needs a shopId or a listingId");
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  const rows = await db
    .select(publicColumns)
    .from(review)
    .innerJoin(user, eq(user.id, review.buyerId))
    .innerJoin(listing, eq(listing.id, review.listingId))
    .innerJoin(shop, eq(shop.id, review.shopId))
    .where(
      and(
        shown,
        input.shopId ? eq(review.shopId, input.shopId) : undefined,
        input.listingId ? eq(review.listingId, input.listingId) : undefined,
        input.rating ? eq(review.rating, input.rating) : undefined,
        // Keyset: everything after the cursor's (created_at, id), at full timestamp precision
        input.cursor
          ? sql`(${review.createdAt}, ${review.id}) < (select c.created_at, c.id from review c where c.id = ${input.cursor})`
          : undefined,
      ),
    )
    .orderBy(desc(review.createdAt), desc(review.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map(toPublicReview);
  return { reviews: page, nextCursor: rows.length > limit ? page.at(-1)!.id : null };
}

/** The review on an order, if there is one (any state: the buyer and seller see their own). */
export async function reviewForOrder(orderId: string) {
  const [row] = await db.select().from(review).where(eq(review.orderId, orderId));
  return row ?? null;
}

/** Which of these orders already have a review. */
export async function reviewedOrderIds(orderIds: string[]) {
  if (!orderIds.length) return new Set<string>();
  const rows = await db.select({ orderId: review.orderId }).from(review).where(inArray(review.orderId, orderIds));
  return new Set(rows.map((r) => r.orderId));
}

export type SellerReview = PublicReview & {
  orderId: string;
  public: boolean;
  hiddenAt: Date | null;
};

/** Every review on the seller's shops, private and taken-down ones too, newest first. */
export async function sellerReviews(sellerId: string, opts: { shopId?: string } = {}): Promise<SellerReview[]> {
  const rows = await db
    .select({ ...publicColumns, orderId: review.orderId, public: review.public, hiddenAt: review.hiddenAt })
    .from(review)
    .innerJoin(user, eq(user.id, review.buyerId))
    .innerJoin(listing, eq(listing.id, review.listingId))
    .innerJoin(shop, eq(shop.id, review.shopId))
    .where(and(eq(shop.ownerId, sellerId), opts.shopId ? eq(review.shopId, opts.shopId) : undefined))
    .orderBy(desc(review.createdAt), desc(review.id));
  return rows.map((r) => ({ ...toPublicReview(r), orderId: r.orderId, public: r.public, hiddenAt: r.hiddenAt }));
}

/* Shaped for the pages */

const monthDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const monthDayYear = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/** "October 3", or "October 3, 2025" from another year. */
export function reviewDate(d: Date, now = new Date()) {
  return d.getFullYear() === now.getFullYear() ? monthDay.format(d) : monthDayYear.format(d);
}

/** A public review as the store and listing pages show it. */
export type ReviewCardView = {
  id: string;
  rating: number;
  body: string | null;
  by: string;
  /** What they bought, and its path on the store (null once it has none). */
  bought: { title: string; href: string | null };
  when: string;
  reply: { body: string; when: string } | null;
};

export function toReviewCard(r: PublicReview, now = new Date()): ReviewCardView {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    by: r.buyer,
    bought: { title: r.listing.title, href: r.listing.slug ? `/${r.listing.slug}` : null },
    when: reviewDate(r.createdAt, now),
    reply: r.reply ? { body: r.reply.body, when: reviewDate(r.reply.at, now) } : null,
  };
}

/** A review on one order, for the buyer's and the seller's order pages. */
export type OrderReviewView = {
  id: string;
  rating: number;
  body: string | null;
  public: boolean;
  hidden: boolean;
  when: string;
  /** The buyer can still change it, and until when ("November 2"). */
  canEdit: boolean;
  editUntil: string;
  reply: { body: string; when: string } | null;
};

export function toOrderReview(r: ReviewRow, now = new Date()): OrderReviewView {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    public: r.public,
    hidden: !!r.hiddenAt,
    when: reviewDate(r.createdAt, now),
    canEdit: canEditReview(r, now),
    editUntil: reviewDate(editableUntil(r), now),
    reply: r.sellerReply ? { body: r.sellerReply, when: reviewDate(r.repliedAt ?? r.updatedAt, now) } : null,
  };
}
