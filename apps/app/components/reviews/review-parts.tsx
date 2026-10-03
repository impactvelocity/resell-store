"use client";

import { useId, useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { StoreLink } from "../market/links";

/*
 * Pieces every review surface shares: stars to look at, stars to pick, the
 * "Show this on the shop" switch, and one review as the store and listing
 * pages show it (with the seller's reply tucked under it).
 */

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** What each number of stars means, in the buyer's words. */
export const starWords: Record<number, string> = {
  1: "Not good",
  2: "Could be better",
  3: "It was fine",
  4: "Good",
  5: "Loved it",
};

const starPath = "M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.87l-5.5 2.88 1.05-6.12L3.1 9.3l6.15-.9L12 2.8z";

function StarGlyph({
  filled,
  half = false,
  size,
  className,
}: {
  filled: boolean;
  /** The left half filled (a 4.5 average). */
  half?: boolean;
  size: number;
  className?: string;
}) {
  const clip = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)}>
      <path
        d={starPath}
        strokeWidth={1.6}
        strokeLinejoin="round"
        className={filled ? "fill-lemon-400 stroke-lemon-500" : "fill-transparent stroke-current opacity-35"}
      />
      {half && !filled && (
        <>
          <clipPath id={clip}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
          <path
            d={starPath}
            strokeWidth={1.6}
            strokeLinejoin="round"
            clipPath={`url(#${clip})`}
            className="fill-lemon-400 stroke-lemon-500"
          />
        </>
      )}
    </svg>
  );
}

/** One filled star, for a rating squeezed into a line of text. */
export function StarIcon({ size = 14, className }: { size?: number; className?: string }) {
  return <StarGlyph filled size={size} className={className} />;
}

/** Five stars, read-only. Says "4 out of 5 stars" to screen readers. */
export function Stars({ rating, size = 16, className }: { rating: number; size?: number; className?: string }) {
  // To the nearest half star
  const halves = Math.round(rating * 2) / 2;
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarGlyph key={n} filled={n <= halves} half={n - 0.5 === halves} size={size} />
      ))}
    </span>
  );
}

/** "★★★★★ 4.8 · 12 reviews": a shop's rating in a line. Nothing when there are no reviews. */
export function RatingLine({
  average,
  count,
  className,
  size = 16,
  href,
}: {
  average: number;
  count: number;
  className?: string;
  size?: number;
  /** Where "12 reviews" goes (the reviews section). */
  href?: string;
}) {
  if (count <= 0) return null;
  const label = `${count} ${count === 1 ? "review" : "reviews"}`;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <Stars rating={average} size={size} />
      <span className="font-bold tabular-nums">{average.toFixed(1)}</span>
      {href ? (
        <a href={href} className={cn("rounded-sm text-public-text-muted underline-offset-2 hover:underline", focusRing)}>
          {label}
        </a>
      ) : (
        <span className="text-public-text-muted">{label}</span>
      )}
    </span>
  );
}

/**
 * Five tappable stars as a real radio group: arrow keys move, each star is
 * labelled "3 stars, It was fine". Hovering previews the choice.
 */
export function StarPicker({
  value,
  onChange,
  legend,
  name,
  autoFocusRef,
}: {
  value: number;
  onChange: (rating: number) => void;
  legend: string;
  name?: string;
  /** Gets the checked (or first) star's input, for focusing from ?review=1. */
  autoFocusRef?: (el: HTMLInputElement | null) => void;
}) {
  const fallback = useId();
  const group = name ?? `stars-${fallback}`;
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="group relative -m-0.5 flex size-12 cursor-pointer items-center justify-center rounded-full"
            >
              <input
                ref={(el) => {
                  if (autoFocusRef && n === (value || 1)) autoFocusRef(el);
                }}
                type="radio"
                name={group}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}, {starWords[n]}
              </span>
              <span className="flex rounded-full p-1 transition-transform group-active:scale-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-secondary">
                <StarGlyph filled={n <= shown} size={34} className="text-text" />
              </span>
            </label>
          ))}
        </div>
        <span aria-hidden className={cn("text-base font-semibold", !shown && "text-public-text-muted")}>
          {shown ? starWords[shown] : "Tap a star"}
        </span>
      </div>
    </fieldset>
  );
}

/** An on/off switch with its label and a line of help. */
export function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-base font-semibold">
          {label}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="text-sm text-public-text-muted">
            {hint}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors",
          checked ? "bg-leaf-600" : "bg-public-border",
          focusRing,
        )}
      >
        <span
          className={cn(
            "size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(20_38_29/0.2)] transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

/** The seller's answer under a review. */
export function SellerReply({
  name,
  body,
  when,
  className,
}: {
  /** The shop's name, or "You". */
  name: string;
  body: string;
  when?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 border-l-[3px] border-leaf-300 py-0.5 pl-4", className)}>
      <span className="text-sm font-bold">
        {name === "You" ? "Your reply" : `${name} replied`}
        {when && <span className="font-normal text-public-text-muted">, {when}</span>}
      </span>
      <p className="text-base break-words whitespace-pre-line">{body}</p>
    </div>
  );
}

/** What a public review needs to show. Matches ReviewCardView in lib/server/reviews.ts. */
export type ReviewCardData = {
  id: string;
  rating: number;
  body: string | null;
  by: string;
  bought: { title: string; href: string | null };
  when: string;
  reply: { body: string; when: string } | null;
};

/** One public review: stars, words, who and what, and the seller's reply. */
export function ReviewCard({
  review,
  shopName,
  store,
  showItem = true,
  className,
}: {
  review: ReviewCardData;
  shopName: string;
  /** The store's slug, for the link to what they bought. */
  store: string;
  /** Leave out "bought X" on the listing's own page. */
  showItem?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col gap-3", className)}>
      <Stars rating={review.rating} size={18} />
      {review.body ? (
        <p className="text-lg font-medium break-words whitespace-pre-line">{review.body}</p>
      ) : (
        <p className="text-base text-public-text-muted">{starWords[review.rating]}, no words needed.</p>
      )}
      <p className="text-sm text-public-text-muted">
        {review.by}
        {showItem ? (
          <>
            {" bought "}
            {review.bought.href ? (
              <StoreLink
                store={store}
                href={review.bought.href}
                className={cn("rounded-sm hover:text-text hover:underline", focusRing)}
              >
                {review.bought.title}
              </StoreLink>
            ) : (
              review.bought.title
            )}
          </>
        ) : null}
        , {review.when}
      </p>
      {review.reply && <SellerReply name={shopName} body={review.reply.body} when={review.reply.when} className="mt-1" />}
    </article>
  );
}
