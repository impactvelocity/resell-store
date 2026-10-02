"use client";

import { LikeButton } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import type { Listing, Store, StoreTone } from "../../lib/mock-market";
import { formatPrice, getStore } from "../../lib/mock-market";
import { ItemArt } from "./art";
import { StoreLink } from "./links";

const avatarTones: Record<StoreTone, string> = {
  lemon: "bg-lemon-400 text-leaf-900",
  mint: "bg-leaf-300 text-leaf-900",
  pink: "bg-pink-100 text-leaf-900",
  leaf: "bg-leaf-100 text-leaf-900",
  forest: "bg-leaf-600 text-white",
  ink: "bg-leaf-900 text-white",
};

/** A store's initial on its colour. Sizes in px: 22 on cards, 56 in lists, 64–104 as a hero. */
export function StoreAvatar({
  store,
  size = 56,
  className,
}: {
  store: Pick<Store, "initial" | "tone">;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold tracking-tight select-none",
        avatarTones[store.tone],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {store.initial}
    </span>
  );
}

/** Pink "Just listed" sticker that sits tilted on a photo. */
export function JustListed({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex origin-top-left items-center rounded-full bg-pink-400 px-3 py-1 font-display text-sm font-extrabold text-leaf-900",
        className,
      )}
      style={{ rotate: "-4deg" }}
    >
      Just listed
    </span>
  );
}

/**
 * A listing tile on the white public pages: photo with a heart, title and price
 * on one line, a line of detail, and optionally which store it's from.
 */
export function ListingCard({
  listing,
  showStore = true,
  defaultLiked,
  artSize = 170,
  className,
}: {
  listing: Listing;
  showStore?: boolean;
  defaultLiked?: boolean;
  artSize?: number;
  className?: string;
}) {
  const store = getStore(listing.store);
  return (
    <div className={cn("group flex min-w-0 flex-col gap-3.5", className)}>
      <div className="relative">
        <StoreLink
          store={listing.store}
          href={`/${listing.slug}`}
          className="flex aspect-[310/330] w-full items-center justify-center overflow-hidden rounded-2xl bg-public-photo outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <ItemArt
            art={listing.art}
            size={artSize}
            className="h-auto max-w-[55%] transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <span className="sr-only">{listing.title}</span>
        </StoreLink>
        <LikeButton
          variant="overlay"
          defaultPressed={defaultLiked}
          aria-label={`Save ${listing.title}`}
          className="absolute top-3 right-3 size-10"
        />
        {listing.justListed && (
          <JustListed className="pointer-events-none absolute bottom-3.5 left-3" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <StoreLink
          store={listing.store}
          href={`/${listing.slug}`}
          className="flex justify-between gap-3 text-base"
        >
          <span className="min-w-0 font-semibold">{listing.title}</span>
          <span className="shrink-0 font-bold">{formatPrice(listing.price)}</span>
        </StoreLink>
        <p className="text-sm text-public-text-muted">{listing.short}</p>
        {showStore && store && (
          <StoreLink
            store={store.slug}
            className="flex w-fit items-center gap-2 pt-1.5 text-sm font-medium hover:underline"
          >
            <StoreAvatar store={store} size={22} />
            {store.name}
          </StoreLink>
        )}
      </div>
    </div>
  );
}
