"use client";

import { LikeButton } from "@repo/ui/button";
import { CheckIcon, ShareIcon, ShieldCheckIcon, SparkleIcon, TruckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { Tag } from "@repo/ui/tag";
import type { ListingDetail } from "../../../lib/mock-listing-detail";
import type { PublicListing, PublicStore } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";
import { trackShare } from "../../../lib/track";
import { SiteLink, StoreLink } from "../links";
import { PaymentMarks } from "../payment-marks";
import { StoreAvatar } from "../parts";
import { StarIcon } from "../../reviews/review-parts";
import { arrivesPhrase, deliveryNote, deliveryTitle, sellerLine, shippingLine } from "./copy";
import { useCopyLink } from "./use-copy-link";

export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/** Pill-shaped link styles for the buy actions. */
export const pill = {
  buy: cn(
    "flex shrink-0 items-center justify-center rounded-full bg-leaf-600 font-bold text-white transition-[background-color,scale] hover:bg-leaf-900 active:scale-[0.98]",
    focusRing,
  ),
  outline: cn(
    "flex shrink-0 items-center justify-center rounded-full border border-leaf-900 font-bold text-text transition-[background-color,scale] hover:bg-public-photo active:scale-[0.98]",
    focusRing,
  ),
};

/** Store avatar, name, rating line and a Follow toggle (left out without `onFollow`). */
export function SellerRow({
  store,
  following,
  onFollow,
  compact,
}: {
  store: PublicStore;
  following: boolean;
  onFollow?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center", compact ? "gap-2.5" : "gap-3")}>
      <StoreLink store={store.slug} tabIndex={-1} aria-hidden className="shrink-0">
        <StoreAvatar store={store} size={compact ? 36 : 44} />
      </StoreLink>
      <div className="flex min-w-0 grow flex-col">
        <StoreLink
          store={store.slug}
          className={cn("w-fit font-bold hover:underline", compact ? "text-sm" : "text-base", focusRing)}
        >
          {store.name}
        </StoreLink>
        <p className={cn("flex items-center gap-1 text-public-text-muted", compact ? "text-xs" : "text-sm")}>
          {store.rating != null && <StarIcon size={compact ? 12 : 14} />}
          <span className="min-w-0">{sellerLine(store, !compact)}</span>
        </p>
      </div>
      {onFollow && (
        <button
          type="button"
          aria-pressed={following}
          onClick={onFollow}
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-leaf-900 text-sm font-semibold transition-colors",
            compact ? "h-9 px-4" : "h-10 px-[18px]",
            following ? "bg-leaf-900 text-white" : "text-text hover:bg-public-photo",
            focusRing,
          )}
        >
          {following && <CheckIcon size={14} strokeWidth={2.6} />}
          {following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

/** Checkout and offer links use the id for live listings: slugs repeat across stores. */
export const buyKey = (listing: PublicListing) => listing.id ?? listing.slug;

/**
 * Who's looking, for live listings: the seller sees a way to manage it instead
 * of buy buttons, and a buyer whose offer was accepted pays that price. On a
 * store subdomain in local dev the session cookie doesn't reach the page, so
 * everyone looks signed out; checkout on the main domain checks again.
 */
export type ViewerBuyState = {
  own?: boolean;
  /** The viewer's accepted offer, in dollars */
  accepted?: number | null;
};

/** "This is your listing", where the buy buttons would be. */
export function OwnListingNote({ listing, compact }: { listing: PublicListing; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex grow items-center gap-3 rounded-lg bg-public-photo",
        compact ? "px-4 py-2.5" : "px-5 py-4",
      )}
    >
      <div className="flex min-w-0 grow flex-col">
        <p className={cn("font-bold", compact ? "text-sm" : "text-base")}>This is your listing</p>
        {!compact && (
          <p className="text-sm text-public-text-muted">
            Buyers see Buy now{listing.openToOffers ? " and Make an offer" : ""} here.
          </p>
        )}
      </div>
      <SiteLink
        href={`/listings/${buyKey(listing)}`}
        className={cn(pill.outline, compact ? "h-10 px-4 text-sm" : "h-11 px-5 text-sm")}
      >
        Manage it
      </SiteLink>
    </div>
  );
}

/** Green "Open to offers" tag. */
/** Where the buy buttons were, once it has sold. */
export function SoldNote({ store, compact }: { store: Pick<PublicStore, "name">; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md bg-public-photo",
        compact ? "grow px-4 py-2.5 text-sm" : "px-5 py-4 text-base",
      )}
    >
      <span className="rounded-full bg-leaf-900 px-3 py-1 text-sm font-bold text-white">Sold</span>
      <span className="text-public-text-muted">
        This one found a new home. {compact ? "" : `${store.name} may have more like it.`}
      </span>
    </div>
  );
}

export function OffersTag({ compact }: { compact?: boolean }) {
  return (
    <Tag className={compact ? "h-7 px-2.5 text-xs" : "h-8 gap-2"}>
      Open to offers
    </Tag>
  );
}

/** P3's right column: seller, title, price, buy actions and the three reassurances. */
export function BuyBox({
  listing,
  store,
  detail,
  liked,
  onLike,
  following,
  onFollow,
  viewer,
}: {
  listing: PublicListing;
  store: PublicStore;
  detail: ListingDetail;
  liked: boolean;
  onLike: (liked: boolean) => void;
  following: boolean;
  onFollow?: () => void;
  viewer?: ViewerBuyState;
}) {
  const copyLink = useCopyLink();
  const title = listing.fullTitle ?? listing.title;
  const accepted = viewer?.accepted ?? null;
  // An accepted offer is the deal now: no second offer
  const offers = !!listing.openToOffers && accepted == null;
  const perPayment = formatPrice((listing.price + (listing.shipping ?? 0)) / 4, true);
  const key = buyKey(listing);

  const buyNow = (
    <SiteLink href={`/checkout/${key}`} className={cn(pill.buy, "h-14 grow px-5 text-lg")}>
      {accepted != null ? `Pay ${formatPrice(accepted, true)} (your accepted offer)` : "Buy now"}
    </SiteLink>
  );
  async function share() {
    await copyLink("Link copied. Go show it off.");
    // Counts toward the listing's Stats; prototype listings have no id
    if (listing.id) trackShare({ listing: listing.id });
  }
  const iconActions = (
    <>
      {/* Nobody saves their own listing */}
      {!viewer?.own && (
        <LikeButton
          pressed={liked}
          onPressedChange={onLike}
          aria-label={`Save ${listing.title}`}
          className="size-14 border border-public-border"
        />
      )}
      <button
        type="button"
        aria-label="Share this listing"
        onClick={share}
        className={cn(
          "flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-public-border text-text transition-[background-color,scale] hover:bg-public-photo active:scale-90",
          focusRing,
        )}
      >
        <ShareIcon size={20} strokeWidth={2.2} />
      </button>
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SellerRow store={store} following={following} onFollow={onFollow} />

      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {detail.subtitle && <p className="text-base text-public-text-muted">{detail.subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-4xl font-extrabold tracking-tight">
            {formatPrice(listing.price)}
          </span>
          <span className="text-sm text-public-text-muted">{shippingLine(listing, store)}</span>
        </p>
        {listing.openToOffers && <OffersTag />}
      </div>

      <div className="flex flex-col gap-3">
        {listing.sold && !viewer?.own ? (
          <>
            <SoldNote store={store} />
            <div className="flex gap-3">
              <SiteLink href="/discover" className={cn(pill.outline, "h-14 grow text-lg")}>
                Find something like it
              </SiteLink>
              {iconActions}
            </div>
          </>
        ) : viewer?.own ? (
          <>
            <OwnListingNote listing={listing} />
            <div className="flex gap-3">{iconActions}</div>
          </>
        ) : offers ? (
          <>
            {buyNow}
            <div className="flex gap-3">
              <SiteLink href={`/offer/${key}`} className={cn(pill.outline, "h-14 grow text-lg")}>
                Make an offer
              </SiteLink>
              {iconActions}
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            {buyNow}
            {iconActions}
          </div>
        )}
        {!listing.sold && !viewer?.own && <PaymentMarks className="pt-1" />}
        {/* Pay Later comes with PayPal checkout; live stores don't have it yet */}
        {!store.live && (
          <p className="text-center text-sm text-public-text-muted">
            Or 4 payments of {perPayment} with PayPal Pay Later, no interest.
          </p>
        )}
      </div>

      <ul className="flex flex-col border-t border-public-border">
        <Assurance
          icon={<ShieldCheckIcon size={20} strokeWidth={2.2} className="text-leaf-600" />}
          title="Your money is held, not handed over"
        >
          PayPal keeps your payment until {arrivesPhrase(detail)} and you have had 3 days to check
          it. Not as described? You get it all back.
        </Assurance>
        <Assurance
          icon={<TruckIcon size={20} strokeWidth={2.2} />}
          title={deliveryTitle(detail, store)}
        >
          {deliveryNote(detail, store)}
        </Assurance>
        <Assurance
          icon={<SparkleIcon size={20} className="text-pink-400" />}
          title="Shopping with an agent?"
          action={
            <button
              type="button"
              onClick={() => copyLink("Agent link copied. Paste it into your assistant.")}
              className={cn("cursor-pointer text-sm font-semibold text-leaf-600 hover:underline", focusRing)}
            >
              Copy agent link
            </button>
          }
          last
        >
          {store.live ? (
            "Paste this link into ChatGPT, Claude or another assistant to ask it about this. Offers and checkout for agents open soon."
          ) : (
            <>
              This listing is ready for ChatGPT, Claude and other assistants. It can ask questions,
              {offers ? " make an offer and check out for you." : " and check out for you."}
            </>
          )}
        </Assurance>
      </ul>
    </div>
  );
}

function Assurance({
  icon,
  title,
  action,
  last,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("flex gap-3.5 py-[18px]", !last && "border-b border-public-border")}>
      <span className="flex w-6 shrink-0 justify-center pt-0.5">{icon}</span>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <p className="text-base font-bold">{title}</p>
        <p className="text-sm text-public-text-muted">{children}</p>
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </li>
  );
}
