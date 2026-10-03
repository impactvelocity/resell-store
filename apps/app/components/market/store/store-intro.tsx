"use client";

import { Button, IconButton } from "@repo/ui/button";
import { CheckIcon, ShareIcon, ShieldCheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import type { PublicStore } from "../../../lib/mock-market";
import { trackShare } from "../../../lib/track";
import { storeDomain, storeUrl } from "../../../lib/urls";
import { useFollow, type FollowLive } from "../discover/follow-button";
import { SiteLink } from "../links";
import { StoreAvatar } from "../parts";
import { RatingLine } from "../../reviews/review-parts";

/** The little pink flower that sits on a store's avatar. */
function FlowerBadge({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 64 64"
      aria-hidden
      className={className}
    >
      <g className="fill-pink-400">
        <circle cx="32" cy="18" r="11" />
        <circle cx="45.3" cy="27.7" r="11" />
        <circle cx="40.2" cy="43.3" r="11" />
        <circle cx="23.8" cy="43.3" r="11" />
        <circle cx="18.7" cy="27.7" r="11" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#fff" />
    </svg>
  );
}

/**
 * Top of a store's home: who's selling, what they're like, and how to reach
 * them. Live stores pass `follow` so Follow saves; the owner sees no Follow.
 */
export function StoreIntro({ store, follow }: { store: PublicStore; follow?: FollowLive | null }) {
  const { following, toggle } = useFollow(store.name, follow);
  const toast = useToast();

  async function share() {
    try {
      await navigator.clipboard.writeText(storeUrl(store.slug));
      toast.add({ title: "Link copied. Go show it off." });
      // Counts toward the store's Stats; prototype stores have none
      if (store.live) trackShare({ shop: store.slug });
    } catch {
      toast.add({ title: `Couldn't copy. It's ${storeDomain(store.slug)}` });
    }
  }

  return (
    <section className="flex flex-col gap-10 desk:flex-row desk:items-start desk:gap-20">
      <div className="flex min-w-0 grow basis-0 flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="relative size-[120px] shrink-0">
          <StoreAvatar store={store} size={120} />
          <FlowerBadge className="absolute -top-1 -right-1.5" />
        </div>

        <div className="flex min-w-0 grow basis-0 flex-col gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-4xl">
            {store.name}
          </h1>
          {store.rating != null && !!store.ratings && (
            <RatingLine average={store.rating} count={store.ratings} href="#reviews" className="text-sm" />
          )}
          <p className="text-sm font-medium text-public-text-muted">
            {[storeDomain(store.slug), store.location, `Selling since ${store.since}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {store.paused && (
            <p className="w-fit rounded-full bg-lemon-100 px-3.5 py-1.5 text-sm font-semibold text-leaf-900">
              {store.owner} is taking a break. Things here can&apos;t be bought for now.
            </p>
          )}
          {store.bio && <p className="max-w-[560px] text-lg">{store.bio}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {!follow?.own && (
              <Button
                variant="secondary"
                aria-pressed={following}
                onClick={toggle}
                className={cn(
                  "h-12 px-7 font-semibold",
                  following
                    ? "border border-leaf-900 bg-leaf-100 text-text hover:bg-leaf-100/70"
                    : "bg-leaf-900 hover:bg-leaf-600",
                )}
              >
                {following && <CheckIcon size={18} strokeWidth={2.4} />}
                {following ? "Following" : "Follow"}
              </Button>
            )}
            {/* Your own store: buyers' messages reach you in your inbox instead */}
            {!follow?.own && (
              <SiteLink
                href={`/messages?to=${encodeURIComponent(store.slug)}`}
                className="inline-flex h-12 items-center rounded-full border border-leaf-900 px-6 text-base font-semibold whitespace-nowrap transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                Message {store.owner}
              </SiteLink>
            )}
            <IconButton
              aria-label={`Share ${store.name}`}
              onClick={share}
              className="size-12 border border-public-border bg-public-background hover:bg-public-photo"
            >
              <ShareIcon size={18} strokeWidth={2.2} />
            </IconButton>
          </div>
        </div>
      </div>

      <StoreStats store={store} />
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-0.5">
      <dt className="text-sm text-public-text-muted">{label}</dt>
      <dd className="font-display text-3xl font-extrabold tracking-tight">
        {value}
      </dd>
    </div>
  );
}

/**
 * Up to four numbers that say whether a store is worth buying from, plus the
 * PayPal promise. Live stores show only what's real so far: no ratings or
 * habits until there are orders to measure them by.
 */
function StoreStats({ store }: { store: PublicStore }) {
  const stats = [
    store.live && { value: String(store.forSale), label: "for sale now" },
    { value: String(store.sold), label: "things sold" },
    store.rating != null &&
      store.ratings != null && {
        value: store.rating.toFixed(1),
        label: `from ${store.ratings} buyers`,
      },
    store.shipsIn && {
      value: store.shipsIn,
      label: store.shipsIn === "Pickup" ? "or courier, by arrangement" : "to ship, usually",
    },
    store.repliesIn && { value: store.repliesIn, label: "to reply, usually" },
  ].filter((s): s is { value: string; label: string } => !!s);

  return (
    <div className="flex w-full shrink-0 flex-col gap-6 desk:w-[400px]">
      <dl className="grid grid-cols-2 gap-6">
        {stats.map((s) => (
          <Stat key={s.label} value={s.value} label={s.label} />
        ))}
      </dl>
      {/* PayPal checkout isn't switched on for live stores yet */}
      {!store.live && (
        <p className="flex items-center gap-2.5 rounded-md bg-leaf-100 px-4 py-3.5 text-sm font-semibold text-leaf-600">
          <ShieldCheckIcon size={20} strokeWidth={2.2} className="shrink-0" />
          PayPal verified. Your money is held until it arrives.
        </p>
      )}
    </div>
  );
}
