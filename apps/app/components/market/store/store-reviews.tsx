"use client";

import { useState } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { useToast } from "@repo/ui/toast";
import { moreReviews } from "../../../app/actions/reviews";
import type { PublicStore } from "../../../lib/mock-market";
import { ReviewCard, Stars, type ReviewCardData } from "../../reviews/review-parts";

/*
 * A live store's reviews: the average, chips to see just the 5-star (or
 * 1-star) ones, the list newest first with the seller's replies, and "Show
 * more" that pages with a cursor.
 */

export type StoreReviewsData = {
  shopId: string;
  average: number;
  count: number;
  /** How many reviews gave each number of stars. */
  stars: Record<1 | 2 | 3 | 4 | 5, number>;
  /** The first page, newest first. */
  reviews: ReviewCardData[];
  nextCursor: string | null;
};

const PAGE = 6;

export function StoreReviews({ store, data }: { store: PublicStore; data: StoreReviewsData }) {
  const toast = useToast();
  const [filter, setFilter] = useState<number | null>(null);
  const [list, setList] = useState(data.reviews);
  const [cursor, setCursor] = useState(data.nextCursor);
  const [loading, setLoading] = useState(false);

  // Chips only help once there's a spread to filter
  const options = ([5, 4, 3, 2, 1] as const).filter((n) => data.stars[n] > 0);
  const showChips = data.count >= 3 && options.length > 1;

  async function load(next: { rating: number | null; cursor: string | null; append: boolean }) {
    setLoading(true);
    const res = await moreReviews({
      shopId: data.shopId,
      rating: next.rating ?? undefined,
      cursor: next.cursor,
      limit: PAGE,
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      toast.add({ title: res?.error ?? "Couldn't load reviews. Try again?" });
      return false;
    }
    setList((prev) => (next.append ? [...prev, ...res.reviews] : res.reviews));
    setCursor(res.nextCursor);
    return true;
  }

  async function pick(rating: number | null) {
    if (rating === filter || loading) return;
    if (await load({ rating, cursor: null, append: false })) setFilter(rating);
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div className="flex flex-col gap-5 desk:flex-row desk:items-center desk:justify-between desk:gap-8">
        <div className="flex items-center gap-4">
          <span className="font-display text-5xl font-extrabold tracking-tight tabular-nums">{data.average.toFixed(1)}</span>
          <div className="flex flex-col gap-1">
            <Stars rating={data.average} size={20} />
            <span className="text-sm text-public-text-muted">
              From {data.count} {data.count === 1 ? "review" : "reviews"}. Only people who bought from {store.owner} can review.
            </span>
          </div>
        </div>
        {showChips && (
          <ChipGroup
            aria-label="Filter by stars"
            value={[String(filter ?? "all")]}
            onValueChange={(v) => {
              const next = v[0] as string | undefined;
              // Tapping the chip that's on goes back to all
              void pick(!next || next === "all" ? null : Number(next));
            }}
            className="-mx-4 flex-nowrap overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:flex-wrap desk:px-0"
          >
            <Chip
              value="all"
              className="border border-public-border bg-public-background hover:bg-public-photo data-pressed:border-leaf-900 data-pressed:bg-leaf-900 data-pressed:text-white"
            >
              All {data.count}
            </Chip>
            {options.map((n) => (
              <Chip
                key={n}
                value={String(n)}
                aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${data.stars[n]} ${data.stars[n] === 1 ? "review" : "reviews"}`}
                className="gap-1 border border-public-border bg-public-background hover:bg-public-photo data-pressed:border-leaf-900 data-pressed:bg-leaf-900 data-pressed:text-white"
              >
                {n}
                <span aria-hidden>★</span>
                <span className="font-normal opacity-70">{data.stars[n]}</span>
              </Chip>
            ))}
          </ChipGroup>
        )}
      </div>

      <ul aria-busy={loading} className="flex max-w-[820px] flex-col">
        {list.map((r) => (
          <li key={r.id} className="border-b border-public-border py-6 first:pt-0 last:border-b-0">
            <ReviewCard review={r} shopName={store.name} store={store.slug} />
          </li>
        ))}
      </ul>

      {cursor && (
        <div className="flex justify-center desk:justify-start">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load({ rating: filter, cursor, append: true })}
            className="inline-flex h-12 cursor-pointer items-center rounded-full border border-leaf-900 px-7 text-base font-semibold transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-default disabled:opacity-60"
          >
            {loading ? "Loading..." : "Show more reviews"}
          </button>
        </div>
      )}
    </div>
  );
}

/** The newest few, side by side, for the bottom of the store page. */
export function ReviewPreview({ store, reviews }: { store: PublicStore; reviews: ReviewCardData[] }) {
  return (
    <div className="grid gap-8 desk:grid-cols-3 desk:gap-12">
      {reviews.slice(0, 3).map((r) => (
        <ReviewCard key={r.id} review={r} shopName={store.name} store={store.slug} />
      ))}
    </div>
  );
}
