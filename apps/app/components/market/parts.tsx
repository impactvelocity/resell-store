"use client";

import { LikeButton } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { FlowerMark, LeafMark } from "@repo/ui/whimsy";
import type { ArtKey } from "./art";
import type { PublicListing, Store, StoreTone } from "../../lib/mock-market";
import { formatPrice, getStore } from "../../lib/mock-market";
import { ItemArt } from "./art";
import { useLike } from "./likes";
import { StoreLink } from "./links";

const avatarTones: Record<StoreTone, string> = {
  lemon: "bg-lemon-400 text-leaf-900",
  mint: "bg-leaf-300 text-leaf-900",
  pink: "bg-pink-100 text-leaf-900",
  leaf: "bg-leaf-100 text-leaf-900",
  forest: "bg-leaf-600 text-white",
  ink: "bg-leaf-900 text-white",
};

/**
 * A store's picture, or its initial on its colour. Sizes in px: 22 on cards,
 * 56 in lists, 64–104 as a hero.
 */
export function StoreAvatar({
  store,
  size = 56,
  className,
}: {
  store: Pick<Store, "initial" | "tone"> & { picture?: string };
  size?: number;
  className?: string;
}) {
  if (store.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own route
      <img
        src={store.picture}
        alt=""
        aria-hidden
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
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
        "inline-flex origin-top-left items-center rounded-full bg-pink-400 px-3 py-1 font-display text-sm font-extrabold text-white",
        className,
      )}
      style={{ rotate: "-4deg" }}
    >
      Just listed
    </span>
  );
}

/**
 * What fills a listing's photo frame: the seller's photo (cropped to fill), the
 * prototype's drawing, or a quiet flower when a live listing has no photo yet.
 * The frame itself (size, colour, rounding) belongs to the caller.
 */
export function ListingImage({
  photo,
  art,
  alt = "",
  artSize = 170,
  artClassName,
  fit = "cover",
  className,
}: {
  photo?: string;
  art?: ArtKey;
  alt?: string;
  artSize?: number;
  /** Sizing for the drawing, e.g. "h-auto max-w-[55%]". */
  artClassName?: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own route, sized by CSS
      <img
        src={photo}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "size-full",
          fit === "cover" ? "object-cover" : "object-contain",
          className,
        )}
      />
    );
  }
  if (art) return <ItemArt art={art} size={artSize} className={cn(artClassName, className)} />;
  return <NoPhoto className={cn(artClassName, className)} />;
}

/** Stand-in for a listing without a photo yet. */
function NoPhoto({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative block aspect-square w-[42%] max-w-[120px] opacity-60", className)}>
      <FlowerMark size={64} className="absolute top-0 left-0 size-[62%]" />
      <LeafMark size={48} className="absolute right-0 bottom-0 size-[46%] rotate-12" />
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
  listing: PublicListing;
  showStore?: boolean;
  defaultLiked?: boolean;
  artSize?: number;
  className?: string;
}) {
  // Live listings bring their store's face; prototype ones look it up
  const store = listing.seller
    ? { slug: listing.store, ...listing.seller }
    : getStore(listing.store);
  // Saves for live listings (they have an id); local in the prototype
  const { liked, setLiked } = useLike(listing.id, listing.title, defaultLiked);
  return (
    <div className={cn("group flex min-w-0 flex-col gap-3.5", className)}>
      <div className="relative">
        <StoreLink
          store={listing.store}
          href={`/${listing.slug}`}
          className="flex aspect-[310/330] w-full items-center justify-center overflow-hidden rounded-2xl bg-public-photo outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <ListingImage
            photo={listing.photo}
            art={listing.art}
            artSize={artSize}
            artClassName="h-auto max-w-[55%]"
            className="transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <span className="sr-only">{listing.title}</span>
        </StoreLink>
        <LikeButton
          variant="overlay"
          pressed={liked}
          onPressedChange={setLiked}
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

const linkFocus =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** Pill links for empty states and "soon" pages on the white public ground. */
export const pillLink = {
  primary: cn(
    "inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-leaf-900 px-6 text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-leaf-600",
    linkFocus,
  ),
  outline: cn(
    "inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-leaf-900 px-6 text-base font-semibold whitespace-nowrap transition-colors hover:bg-public-photo",
    linkFocus,
  ),
};
