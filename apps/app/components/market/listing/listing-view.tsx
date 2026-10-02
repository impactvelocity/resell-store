"use client";

import { useState } from "react";
import { LikeButton } from "@repo/ui/button";
import { ShieldCheckIcon, SparkleIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import type { DetailRow, ListingDetail } from "../../../lib/mock-listing-detail";
import type { Listing, Store } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";
import { SiteLink, StoreLink } from "../links";
import { ListingCard } from "../parts";
import { BuyBox, focusRing, OffersTag, pill, SellerRow } from "./buy-box";
import { aboutHeading, arrivesPhrase, askNote, city, shippingLine } from "./copy";
import { Gallery, PhotoSlider } from "./gallery";
import { useCopyLink } from "./use-copy-link";

type Props = {
  listing: Listing;
  store: Store;
  detail: ListingDetail;
  /** Other listings from the same store */
  more: Listing[];
};

/** Desktop and mobile share these two columns so About lines up under the gallery. */
const columns =
  "grid-cols-[minmax(0,1fr)_360px] gap-10 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_480px] xl:gap-14";

/**
 * P3 / P9: one listing on its store's subdomain. Desktop (≥900px) is gallery +
 * buy box; below that it's P9's full-bleed slider, stacked content and a buy bar
 * that sticks to the bottom of the screen.
 */
export function ListingView({ listing, store, detail, more }: Props) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const toggleFollow = () => setFollowing((f) => !f);
  const title = listing.fullTitle ?? listing.title;

  return (
    <main className="desk:pb-[72px]">
      <PhotoSlider
        photos={detail.photos}
        title={title}
        className="desk:hidden"
        overlay={
          <LikeButton
            variant="overlay"
            pressed={liked}
            onPressedChange={setLiked}
            aria-label={`Save ${listing.title}`}
            className="size-11"
          />
        }
      />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 desk:px-16 desk:pt-7">
        <Breadcrumb listing={listing} detail={detail} title={title} />

        {/* Desktop: gallery + buy box */}
        <div className={cn("hidden items-start desk:grid", columns)}>
          <Gallery photos={detail.photos} title={title} />
          <BuyBox
            listing={listing}
            store={store}
            detail={detail}
            liked={liked}
            onLike={setLiked}
            following={following}
            onFollow={toggleFollow}
          />
        </div>

        {/* Desktop: story + details */}
        <section
          className={cn("hidden items-start border-t border-public-border pt-11 desk:grid", columns)}
        >
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {aboutHeading(detail)}
            </h2>
            {detail.description.map((p) => (
              <p key={p} className="max-w-[680px] text-lg">
                {p}
              </p>
            ))}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <SiteLink href="/messages" className={cn(pill.outline, "h-12 px-6 text-base font-semibold")}>
                Ask a question
              </SiteLink>
              <p className="text-sm text-public-text-muted">{askNote(store)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Details</h2>
            <DetailList rows={detail.details} />
            <p className="text-sm text-public-text-muted">{detail.listedNote}</p>
          </div>
        </section>

        {/* Mobile: P9's stacked content */}
        <MobileContent
          listing={listing}
          store={store}
          detail={detail}
          title={title}
          following={following}
          onFollow={toggleFollow}
        />

        {more.length > 0 && (
          <section className="flex flex-col gap-6 border-t border-public-border pt-8 pb-10 desk:pt-11 desk:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="font-display text-xl font-extrabold tracking-tight desk:text-2xl">
                More from {store.name}
              </h2>
              <StoreLink
                store={store.slug}
                className={cn("text-sm font-semibold text-leaf-600 hover:underline", focusRing)}
              >
                Visit the store, {store.forSale} for sale
              </StoreLink>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 desk:grid-cols-4 desk:gap-6">
              {more.map((l) => (
                <ListingCard key={l.slug} listing={l} showStore={false} />
              ))}
            </div>
          </section>
        )}
      </div>

      <MobileBuyBar listing={listing} />
    </main>
  );
}

function Breadcrumb({ listing, detail, title }: { listing: Listing; detail: ListingDetail; title: string }) {
  const steps = [listing.category, detail.subcategory].filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="hidden desk:block">
      <ol className="flex flex-wrap text-sm text-public-text-muted">
        <li>
          <SiteLink href="/discover" className={cn("hover:underline", focusRing)}>
            Shop
          </SiteLink>
        </li>
        {steps.map((s) => (
          <li key={s} className="before:px-1 before:content-['/']">
            {s}
          </li>
        ))}
        <li aria-current="page" className="before:px-1 before:content-['/']">
          {title}
        </li>
      </ol>
    </nav>
  );
}

/** Key-value table. Desktop rows are roomier than mobile's. */
function DetailList({ rows, compact }: { rows: DetailRow[]; compact?: boolean }) {
  return (
    <dl className="flex flex-col">
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cn(
            "flex",
            compact ? "gap-3 py-3 text-sm" : "gap-4 py-3.5 text-base",
            i < rows.length - 1 && "border-b border-public-border",
          )}
        >
          <dt className={cn("shrink-0 text-public-text-muted", compact ? "w-[104px]" : "w-[140px]")}>
            {r.label}
          </dt>
          <dd className="min-w-0 grow font-semibold">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const textButton = cn("w-fit cursor-pointer text-sm font-semibold text-leaf-600 hover:underline", focusRing);

function MobileContent({
  listing,
  store,
  detail,
  title,
  following,
  onFollow,
}: {
  listing: Listing;
  store: Store;
  detail: ListingDetail;
  title: string;
  following: boolean;
  onFollow: () => void;
}) {
  const [allDetails, setAllDetails] = useState(false);
  const [wholeStory, setWholeStory] = useState(false);
  const copyLink = useCopyLink();

  const essentials = detail.details.filter((r) => r.essential);
  const short = essentials.length ? essentials : detail.details.slice(0, 5);
  const rows = allDetails ? detail.details : short;
  const canExpandDetails = detail.details.length > short.length;

  const summary = detail.summary ?? detail.description[0]!;
  const canExpandStory = !!detail.summary || detail.description.length > 1;

  return (
    <div className="flex flex-col gap-6 pt-5 desk:hidden">
      <SellerRow store={store} following={following} onFollow={onFollow} compact />

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-2xl leading-8 font-extrabold tracking-tight">{title}</h1>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tracking-tight">
              {formatPrice(listing.price)}
            </span>
            <span className="text-sm text-public-text-muted">{shippingLine(listing, store, true)}</span>
          </p>
          {listing.openToOffers && <OffersTag compact />}
        </div>
      </div>

      <div className="flex gap-3 rounded-md bg-leaf-100 px-4 py-3.5">
        <ShieldCheckIcon size={20} strokeWidth={2.2} className="shrink-0 text-leaf-600" />
        <p className="grow text-sm font-medium text-leaf-900">
          PayPal holds your money until {arrivesPhrase(detail)} and you have had 3 days to check it.{" "}
          {detail.arrives ? `Arrives ${detail.arrives}.` : `Pickup in ${city(store)}.`}
        </p>
      </div>

      <section className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Details</h2>
        <DetailList rows={rows} compact />
        {canExpandDetails && (
          <div className="pt-1">
            <button
              type="button"
              aria-expanded={allDetails}
              onClick={() => setAllDetails((v) => !v)}
              className={textButton}
            >
              {allDetails ? "Show fewer details" : `See all ${detail.details.length} details`}
            </button>
          </div>
        )}
        {allDetails && <p className="pt-2 text-sm text-public-text-muted">{detail.listedNote}</p>}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-xl font-extrabold tracking-tight">{aboutHeading(detail)}</h2>
        {wholeStory ? (
          detail.description.map((p) => (
            <p key={p} className="text-base">
              {p}
            </p>
          ))
        ) : (
          <p className="text-base">{summary}</p>
        )}
        {canExpandStory && (
          <button
            type="button"
            aria-expanded={wholeStory}
            onClick={() => setWholeStory((v) => !v)}
            className={textButton}
          >
            {wholeStory ? "Show less" : "Read the whole story"}
          </button>
        )}
        {wholeStory && (
          <div className="flex flex-col items-start gap-2 pt-2">
            <SiteLink href="/messages" className={cn(pill.outline, "h-11 px-5 text-sm font-semibold")}>
              Ask a question
            </SiteLink>
            <p className="text-sm text-public-text-muted">{askNote(store)}</p>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 border-t border-public-border pt-5">
        <SparkleIcon size={18} className="shrink-0 text-pink-400" />
        <p className="grow text-sm font-medium">Shopping with an agent? Send it this listing.</p>
        <button
          type="button"
          onClick={() => copyLink("Agent link copied. Paste it into your assistant.")}
          className={cn(textButton, "shrink-0")}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}

/** P9's buy bar. Sticky rather than fixed, so it parks above the footer instead of covering it. */
function MobileBuyBar({ listing }: { listing: Listing }) {
  return (
    <div className="sticky bottom-0 z-20 flex gap-2.5 border-t border-public-border bg-public-background px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] desk:hidden">
      {listing.openToOffers && (
        <SiteLink href={`/offer/${listing.slug}`} className={cn(pill.outline, "h-[52px] grow basis-0 text-base")}>
          Make an offer
        </SiteLink>
      )}
      <SiteLink href={`/checkout/${listing.slug}`} className={cn(pill.buy, "h-[52px] grow basis-0 text-base")}>
        Buy now, {formatPrice(listing.price)}
      </SiteLink>
    </div>
  );
}
