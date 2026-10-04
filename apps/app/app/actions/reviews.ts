"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db, eq, shop } from "@repo/db";
import { CommerceError } from "../../lib/server/commerce";
import { notifyNewReview } from "../../lib/server/notify-after-sale";
import * as reviews from "../../lib/server/reviews";
import { getCurrentUser, type CurrentUser } from "../../lib/server/session";
import { assertNotDemo, DemoBlockedError } from "../../lib/server/demo";

/*
 * Reviews (lib/server/reviews.ts): the buyer leaves or changes one, the
 * seller replies, and anyone pages through a shop's public reviews. Same
 * contract as after-sale.ts: { ok } or { error } for things a person can fix;
 * the seller's email goes after the response.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; signin?: boolean };

async function run<T extends object>(fn: (userId: string, user: CurrentUser) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first.", signin: true };
  try {
    const out = await fn(user.id, user);
    revalidatePath("/", "layout");
    return { ok: true, ...out };
  } catch (error) {
    if (error instanceof CommerceError || error instanceof DemoBlockedError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("Review action failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}

const id = z.string().min(1).max(64);
// The length rule lives in reviews.ts, with a friendlier message; this only stops silly payloads
const words = z.string().max(5000);
const stars = z.number().int().min(1).max(5);

const leaveInput = z.object({
  orderId: id,
  rating: stars,
  body: words.nullish(),
  public: z.boolean().default(true),
});

/** Buyer: stars and a few words on an order that's done. */
export async function leaveReview(input: z.input<typeof leaveInput>) {
  return run(async (buyerId, user) => {
    assertNotDemo(user, "review");
    const parsed = leaveInput.parse(input);
    const r = await reviews.leaveReview({ buyerId, ...parsed });
    after(() => notifyNewReview(r.id));
    return { reviewId: r.id };
  });
}

const editInput = z.object({
  reviewId: id,
  rating: stars.optional(),
  body: words.nullish(),
  public: z.boolean().optional(),
});

/** Buyer: change the stars, the words or who sees it (for 30 days). */
export async function editReview(input: z.input<typeof editInput>) {
  return run(async (buyerId, user) => {
    assertNotDemo(user, "review");
    const parsed = editInput.parse(input);
    await reviews.editReview({ buyerId, ...parsed });
    return {};
  });
}

/** Seller: answer a review on one of your shops (or change your answer). */
export async function replyToReview(input: { reviewId: string; body: string }) {
  return run(async (sellerId, user) => {
    assertNotDemo(user, "review");
    const parsed = z.object({ reviewId: id, body: words }).parse(input);
    await reviews.replyToReview({ sellerId, ...parsed });
    return {};
  });
}

const moreInput = z.object({
  shopId: id,
  listingId: id.optional(),
  rating: stars.optional(),
  cursor: id.nullish(),
  limit: z.number().int().min(1).max(30).default(6),
});

/**
 * Anyone: the next page of a shop's public reviews (or the first page with a
 * star filter). No sign-in; a private shop's only for its owner.
 */
export async function moreReviews(
  input: z.input<typeof moreInput>,
): Promise<Result<{ reviews: reviews.ReviewCardView[]; nextCursor: string | null }>> {
  try {
    const parsed = moreInput.parse(input);
    const [s] = await db.select({ visibility: shop.visibility, ownerId: shop.ownerId }).from(shop).where(eq(shop.id, parsed.shopId));
    if (!s) return { ok: false, error: "We couldn't find that shop." };
    if (s.visibility === "private") {
      const user = await getCurrentUser();
      if (user?.id !== s.ownerId) return { ok: false, error: "We couldn't find that shop." };
    }
    const page = await reviews.publicReviews(parsed);
    return { ok: true, reviews: page.reviews.map((r) => reviews.toReviewCard(r)), nextCursor: page.nextCursor };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("Loading reviews failed", error);
    return { ok: false, error: "Couldn't load more reviews. Try again?" };
  }
}
