"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { editReview, leaveReview, replyToReview } from "../../app/actions/reviews";
import type { OrderReviewView } from "../../lib/server/reviews";
import { SellerReply, StarPicker, Stars, ToggleRow, starWords } from "../reviews/review-parts";
import { Panel, tones, useCaseAction } from "./parts";
import type { OrderCaseView } from "./view";

/*
 * The review on an order. The buyer's side (P8 order): once it's done, stars
 * and a few words, shown on the shop or only to the seller, changeable for 30
 * days. The seller's side (B5 sale): read it and reply.
 */

const MAX = 1000;

/* ---------- Buyer ---------- */

export function BuyerReviewPanel({
  view,
  review,
  focus = false,
}: {
  view: OrderCaseView;
  review: OrderReviewView | null;
  /** From the "Leave a review" links (?review=1): scroll here and put focus on the stars. */
  focus?: boolean;
}) {
  const shop = view.shop.name;
  const [editing, setEditing] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focus) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus without a second jump; the stars if there's a form, else the card
    (starRef.current ?? sectionRef.current)?.focus({ preventScroll: true });
    // Only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!review || editing) {
    return (
      <div ref={sectionRef} id="review" tabIndex={-1} className="scroll-mt-6 outline-none">
        <Panel
          tone="public"
          highlight={focus && !review}
          label="Your review"
          title={review ? "Change your review" : "How did it go?"}
        >
          {!review && (
            <p className="text-base text-public-text-muted">
              Give it a star rating and a line or two. It helps {shop}, and the next person deciding.
            </p>
          )}
          <ReviewForm
            view={view}
            review={review}
            starRef={(el) => {
              starRef.current = el;
            }}
            onDone={() => setEditing(false)}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div ref={sectionRef} id="review" tabIndex={-1} className="scroll-mt-6 outline-none">
      <Panel
        tone="public"
        label="Your review"
        title="Your review"
        aside={
          review.canEdit ? (
            <button type="button" onClick={() => setEditing(true)} className={cn(tones.public.outline, "h-9 px-4")}>
              Edit
            </button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars rating={review.rating} size={20} />
            <span className="text-base font-semibold">{starWords[review.rating]}</span>
          </div>
          {review.body && <p className="text-base break-words whitespace-pre-line">{review.body}</p>}
          <p className="text-sm text-public-text-muted">
            {review.hidden
              ? "resell.store took this review down, so it doesn't show on the shop."
              : review.public
                ? `Showing on ${shop} and the listing since ${review.when}, with your first name.`
                : `Only ${shop} can see this. You sent it on ${review.when}.`}
            {review.canEdit && ` You can change it until ${review.editUntil}.`}
          </p>
        </div>
        {review.reply && <SellerReply name={shop} body={review.reply.body} when={review.reply.when} />}
      </Panel>
    </div>
  );
}

function ReviewForm({
  view,
  review,
  starRef,
  onDone,
}: {
  view: OrderCaseView;
  review: OrderReviewView | null;
  starRef: (el: HTMLInputElement | null) => void;
  onDone: () => void;
}) {
  const t = tones.public;
  const shop = view.shop.name;
  const { pending, run } = useCaseAction();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [body, setBody] = useState(review?.body ?? "");
  const [isPublic, setPublic] = useState(review?.public ?? true);
  const left = MAX - body.length;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return;
        const words = body.trim() || null;
        const ok = review
          ? await run("save", () => editReview({ reviewId: review.id, rating, body: words, public: isPublic }), "Saved your changes.")
          : await run(
              "post",
              () => leaveReview({ orderId: view.id, rating, body: words, public: isPublic }),
              isPublic ? `Thanks! Your review is up on ${shop}.` : `Thanks! We've passed it to ${shop}.`,
            );
        if (ok) onDone();
      }}
    >
      <StarPicker value={rating} onChange={setRating} legend="Your stars" autoFocusRef={starRef} />

      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">
          A few words <span className="font-normal text-public-text-muted">(optional)</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          rows={4}
          maxLength={MAX}
          placeholder="Was it as described? How was the packing?"
          aria-describedby="review-count"
          className="min-h-28 w-full resize-y rounded-md border border-public-border bg-public-background px-4 py-3 text-base outline-none placeholder:text-public-text-muted focus:border-leaf-900"
        />
        <span id="review-count" className={cn("self-end text-sm tabular-nums", left < 50 ? "text-berry-500" : "text-public-text-muted")}>
          {left} {left === 1 ? "character" : "characters"} left
        </span>
      </label>

      <ToggleRow
        checked={isPublic}
        onChange={setPublic}
        label="Show this on the shop"
        hint={
          isPublic
            ? `Anyone can read it on ${shop} and the listing, with your first name.`
            : `Only ${shop} sees it.`
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={!!pending || !rating} className={cn(t.strong, "w-full sm:w-auto")}>
          {pending ? "Saving..." : review ? "Save changes" : "Post review"}
        </button>
        {review && (
          <button type="button" onClick={onDone} className={cn(t.quiet, "w-full sm:w-auto")}>
            Cancel
          </button>
        )}
        {!rating && <span className="text-sm text-public-text-muted sm:pl-2">Pick some stars first.</span>}
      </div>
    </form>
  );
}

/* ---------- Seller ---------- */

export function SellerReviewPanel({ view, review }: { view: OrderCaseView; review: OrderReviewView }) {
  const t = tones.app;
  const who = view.buyer.firstName;
  const [editing, setEditing] = useState(!review.reply);
  const [text, setText] = useState(review.reply?.body ?? "");
  const { pending, run } = useCaseAction();

  return (
    <Panel
      tone="app"
      label={`${who}'s review`}
      title={`${who}'s review`}
      aside={
        !review.public ? (
          <span className="inline-flex h-7 items-center rounded-full bg-surface-muted px-3 text-sm font-semibold text-text-muted">
            Private
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} size={20} />
          <span className="text-base font-semibold">{starWords[review.rating]}</span>
          <span className="text-sm text-text-muted">{review.when}</span>
        </div>
        {review.body && <p className="text-base break-words whitespace-pre-line">{review.body}</p>}
        {!review.public && !review.hidden && (
          <p className="rounded-md bg-surface-muted px-4 py-3 text-sm font-semibold text-text-muted">
            Private: only you see this.
          </p>
        )}
        {review.hidden && (
          <p className="rounded-md bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-text">
            resell.store took this review down, so it doesn&apos;t show on your shop.
          </p>
        )}
      </div>

      {review.reply && !editing ? (
        <div className="flex flex-col gap-2">
          <SellerReply name="You" body={review.reply.body} when={review.reply.when} />
          <button type="button" onClick={() => setEditing(true)} className={cn(t.quiet, "h-9 w-fit px-0")}>
            Edit your reply
          </button>
        </div>
      ) : (
        <form
          className={cn("flex flex-col gap-2 border-t pt-4", t.border)}
          onSubmit={async (e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            const ok = await run(
              "reply",
              () => replyToReview({ reviewId: review.id, body }),
              review.reply ? "Reply updated." : review.public ? "Replied. It shows under the review." : `Replied. Only ${who} sees it.`,
            );
            if (ok) setEditing(false);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{review.reply ? "Your reply" : `Reply to ${who}`}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              rows={3}
              maxLength={MAX}
              placeholder={review.rating >= 4 ? `Thanks, ${who}! Enjoy it.` : "Sorry it wasn't better. Here's what happened..."}
              className="w-full resize-y rounded-md border-[1.5px] border-border bg-background px-4 py-3 text-base outline-none placeholder:text-text-muted focus:border-secondary"
            />
          </label>
          <p className="text-sm text-text-muted">
            {review.public
              ? "Your reply shows under the review on your shop. One reply per review; you can change it later."
              : `The review is private, so only ${who} will see your reply.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!text.trim() || !!pending} className={t.strong}>
              {pending ? "Saving..." : review.reply ? "Save reply" : "Post reply"}
            </button>
            {review.reply && (
              <button
                type="button"
                onClick={() => {
                  setText(review.reply!.body);
                  setEditing(false);
                }}
                className={t.quiet}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </Panel>
  );
}
