"use client";

import { LikeButton } from "@repo/ui/button";
import { CheckIcon, ShareIcon, ShieldCheckIcon, SparkleIcon, TruckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { Tag } from "@repo/ui/tag";
import type { ListingDetail } from "../../../lib/mock-listing-detail";
import type { Listing, Store } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";
import { SiteLink, StoreLink } from "../links";
import { StoreAvatar } from "../parts";
import { arrivesPhrase, city, deliveryTitle, sellerLine, shippingLine } from "./copy";
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

/** Store avatar, name, rating line and a Follow toggle. */
export function SellerRow({
  store,
  following,
  onFollow,
  compact,
}: {
  store: Store;
  following: boolean;
  onFollow: () => void;
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
        <p className={cn("text-public-text-muted", compact ? "text-xs" : "text-sm")}>
          {sellerLine(store, !compact)}
        </p>
      </div>
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
    </div>
  );
}

/** Green "Open to offers" tag. */
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
}: {
  listing: Listing;
  store: Store;
  detail: ListingDetail;
  liked: boolean;
  onLike: (liked: boolean) => void;
  following: boolean;
  onFollow: () => void;
}) {
  const copyLink = useCopyLink();
  const title = listing.fullTitle ?? listing.title;
  const offers = !!listing.openToOffers;
  const perPayment = formatPrice((listing.price + listing.shipping) / 4, true);

  const buyNow = (
    <SiteLink href={`/checkout/${listing.slug}`} className={cn(pill.buy, "h-14 grow text-lg")}>
      Buy now
    </SiteLink>
  );
  const iconActions = (
    <>
      <LikeButton
        pressed={liked}
        onPressedChange={onLike}
        aria-label={`Save ${listing.title}`}
        className="size-14 border border-public-border"
      />
      <button
        type="button"
        aria-label="Share this listing"
        onClick={() => copyLink("Link copied. Go show it off.")}
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
        <p className="text-base text-public-text-muted">{detail.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-4xl font-extrabold tracking-tight">
            {formatPrice(listing.price)}
          </span>
          <span className="text-sm text-public-text-muted">{shippingLine(listing, store)}</span>
        </p>
        {offers && <OffersTag />}
      </div>

      <div className="flex flex-col gap-3">
        {offers ? (
          <>
            {buyNow}
            <div className="flex gap-3">
              <SiteLink href={`/offer/${listing.slug}`} className={cn(pill.outline, "h-14 grow text-lg")}>
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
        <p className="text-center text-sm text-public-text-muted">
          Or 4 payments of {perPayment} with PayPal Pay Later, no interest.
        </p>
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
          {detail.arrives
            ? `Ships from ${city(store)} within ${store.shipsIn}, tracked to Vancouver. You get the tracking link as soon as it is posted.`
            : `Pay here, then pick a time with ${store.owner}. Your money stays held until it is in your hands.`}
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
          This listing is ready for ChatGPT, Claude and other assistants. It can ask questions,
          {offers ? " make an offer and check out for you." : " and check out for you."}
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
