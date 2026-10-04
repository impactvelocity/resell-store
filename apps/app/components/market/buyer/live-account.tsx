"use client";

import { useState } from "react";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { answerAsBuyer, confirmOrder } from "../../../app/actions/commerce";
import type { OrderStatus } from "../../../lib/mock-buyer";
import type { PublicListing, StoreTone } from "../../../lib/mock-market";
import { ShieldIcon } from "./chat-parts";
import { useFollow } from "../discover/follow-button";
import { SiteLink, StoreLink } from "../links";
import { ListingCard, StoreAvatar } from "../parts";
import { AccountNav, Row } from "./account";
import { AlsoSelling } from "./live-empty";

/*
 * P8 for a real buyer: their orders, offers, saved things and the shops they follow, worked
 * out on the server into plain rows (see app/(market)/(browse)/account/page.tsx),
 * with the buttons that move them along. Each button calls a server action,
 * which refreshes the page with the new state.
 */

export type LiveStatus = OrderStatus & { muted?: boolean };

export type LiveOrderView = {
  id: string;
  /** Changed since their last visit */
  isNew?: boolean;
  title: string;
  photo: string | null;
  line: string;
  status: LiveStatus;
  /** "It's all good" once it's shipped */
  canConfirm: boolean;
  shopName: string;
  /** The order's own page (/account/orders/[id]): details, cancelling, problems. */
  href?: string;
  /** Paid, past the ship-by date: offer "Cancel for a refund" (on the order page). */
  canCancel?: boolean;
  /** A live problem: "open" while the two sides talk, "escalated" once resell.store is looking. */
  problem?: "open" | "escalated" | null;
  /** Done and not reviewed yet: "Leave a review" (on the order page). */
  canReview?: boolean;
};

export type LiveOfferView = {
  id: string;
  /** Changed since their last visit */
  isNew?: boolean;
  listingId: string;
  title: string;
  photo: string | null;
  line: string;
  status: LiveStatus;
  action: "withdraw" | "counter" | "pay" | null;
  /** The counter, in dollars, as "$130" */
  counter?: string;
  shopName: string;
};

export type LiveFollowView = {
  shopId: string;
  slug: string;
  name: string;
  initial: string;
  tone: StoreTone;
  picture: string | null;
  /** "4 for sale, new this week" */
  line: string;
};

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const pill =
  "flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold disabled:cursor-default disabled:opacity-60";
const quiet = cn(
  "cursor-pointer rounded-full text-center text-sm font-medium text-public-text-muted hover:text-text disabled:cursor-default",
  focusRing,
);
const seeAll = "text-sm font-semibold whitespace-nowrap text-leaf-600 hover:underline";

export function LiveAccount({
  firstName,
  summary,
  held,
  orders,
  offers,
  saved = [],
  following = [],
  sells = false,
  heldTest = true,
}: {
  firstName: string;
  /** "Two things need you today: …" */
  summary: string;
  /** "$144", or null when nothing is held */
  held: string | null;
  orders: LiveOrderView[];
  offers: LiveOfferView[];
  /** Liked listings, still for sale first */
  saved?: PublicListing[];
  following?: LiveFollowView[];
  /** They own a shop too: show the way back to it */
  sells?: boolean;
  /** The held money is from test checkouts only: say no money moved. */
  heldTest?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-6 pb-16 desk:flex-row desk:items-start desk:gap-12 desk:px-16 desk:pt-14 desk:pb-20 xl:gap-[72px]">
      <AccountNav
        live={{ orders: orders.length, offers: offers.length, saved: saved.length, following: following.length }}
        sells={sells}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-12 desk:gap-14">
        <section
          id="overview"
          className="flex scroll-mt-8 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-2.5">
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Hi {firstName}.</h1>
            <p className="text-lg text-public-text-muted">{summary}</p>
          </div>
          {held && (
            <p className="flex h-9 w-fit shrink-0 items-center gap-2 rounded-full bg-leaf-100 px-3.5 text-sm font-semibold text-leaf-600">
              <ShieldIcon />
              {held} held until it arrives{heldTest && " (test, no money moved)"}
            </p>
          )}
        </section>

        {sells && <AlsoSelling />}

        <section id="orders" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Orders" />
          {orders.length ? (
            <ul className="flex flex-col">
              {orders.map((o) => (
                <LiveOrderRow key={o.id} order={o} />
              ))}
            </ul>
          ) : (
            <Quiet>
              Nothing bought yet.{" "}
              <SiteLink href="/discover" className={seeAll}>
                Have a look around
              </SiteLink>
            </Quiet>
          )}
        </section>

        <section id="offers" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Offers" />
          {offers.length ? (
            <ul className="flex flex-col">
              {offers.map((o) => (
                <LiveOfferRow key={o.id} offer={o} />
              ))}
            </ul>
          ) : (
            <Quiet>
              No offers yet. Look for &ldquo;Open to offers&rdquo; on a listing to name your price.
            </Quiet>
          )}
        </section>

        <section id="saved" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Saved" />
          {saved.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 border-t border-public-border pt-5 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {saved.map((l) => (
                <SavedCard key={l.id ?? l.slug} listing={l} />
              ))}
            </div>
          ) : (
            <Quiet>
              Nothing saved yet. Tap the heart on anything you like and it waits for you here.
            </Quiet>
          )}
        </section>

        <section id="following" className="flex scroll-mt-8 flex-col gap-2">
          <SectionHead title="Following" />
          {following.length ? (
            <ul className="grid border-t border-public-border md:grid-cols-2 md:gap-x-12">
              {following.map((f) => (
                <FollowRow key={f.shopId} shop={f} />
              ))}
            </ul>
          ) : (
            <Quiet>
              No shops followed yet.{" "}
              <SiteLink href="/stores" className={seeAll}>
                Find some you like
              </SiteLink>
            </Quiet>
          )}
        </section>
      </main>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-public-border pt-5 text-base text-public-text-muted">{children}</p>;
}

/** Runs one action at a time for a row, with a toast either way. */
function useRowAction() {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  async function run(name: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    if (pending) return;
    setPending(name);
    const res = await fn();
    setPending(null);
    toast.add({ title: res.ok ? done : (res.error ?? "That didn't work. Try again?") });
  }
  return { pending, run };
}

function LiveOrderRow({ order }: { order: LiveOrderView }) {
  const { pending, run } = useRowAction();
  return (
    <Row photo={order.photo} title={order.title} line={order.line} status={order.status} fresh={order.isNew}>
      {order.problem && order.href && (
        <SiteLink href={order.href} className={cn(pill, "bg-leaf-900 text-white hover:bg-leaf-600", focusRing)}>
          See the problem
        </SiteLink>
      )}
      {!order.problem && order.canCancel && order.href && (
        <SiteLink href={order.href} className={cn(pill, "border border-leaf-900 hover:bg-public-photo", focusRing)}>
          Cancel for a refund
        </SiteLink>
      )}
      {!order.problem && order.canConfirm && (
        <>
          <button
            type="button"
            disabled={!!pending}
            onClick={() =>
              run(
                "confirm",
                () => confirmOrder({ orderId: order.id }),
                `Thanks. That wraps it up with ${order.shopName}.`,
              )
            }
            className={cn(pill, "bg-leaf-600 text-white hover:bg-leaf-900", focusRing)}
          >
            {pending === "confirm" ? "Saving..." : "It's all good"}
          </button>
          {order.href ? (
            <SiteLink href={`${order.href}?report=1`} className={quiet}>
              Report a problem
            </SiteLink>
          ) : (
            <span className="text-center text-xs text-public-text-muted">Once it&apos;s in your hands</span>
          )}
        </>
      )}
      {!order.problem && order.canReview && order.href && (
        <SiteLink href={`${order.href}?review=1`} className={cn(pill, "border border-leaf-900 hover:bg-public-photo", focusRing)}>
          Leave a review
        </SiteLink>
      )}
      {order.href && (
        <SiteLink href={order.href} className={cn(quiet, "font-semibold text-leaf-600 hover:underline")}>
          Order details
        </SiteLink>
      )}
    </Row>
  );
}

function LiveOfferRow({ offer }: { offer: LiveOfferView }) {
  const { pending, run } = useRowAction();
  return (
    <Row photo={offer.photo} title={offer.title} line={offer.line} status={offer.status} fresh={offer.isNew}>
      {offer.action === "pay" && (
        <SiteLink
          href={`/checkout/${offer.listingId}`}
          className={cn(pill, "bg-leaf-600 text-white hover:bg-leaf-900", focusRing)}
        >
          Pay now
        </SiteLink>
      )}
      {offer.action === "counter" && (
        <>
          <button
            type="button"
            disabled={!!pending}
            onClick={() =>
              run(
                "accept",
                () => answerAsBuyer({ offerId: offer.id, action: "accept-counter" }),
                `Deal at ${offer.counter}. Pay within two days to make it yours.`,
              )
            }
            className={cn(pill, "bg-leaf-900 text-white hover:bg-leaf-600", focusRing)}
          >
            {pending === "accept" ? "Accepting..." : `Accept ${offer.counter}`}
          </button>
          <button
            type="button"
            disabled={!!pending}
            onClick={() =>
              run(
                "decline",
                () => answerAsBuyer({ offerId: offer.id, action: "decline-counter" }),
                `Counter declined. We've let ${offer.shopName} know.`,
              )
            }
            className={quiet}
          >
            {pending === "decline" ? "Declining..." : "Decline"}
          </button>
        </>
      )}
      {offer.action === "withdraw" && (
        <button
          type="button"
          disabled={!!pending}
          onClick={() =>
            run(
              "withdraw",
              () => answerAsBuyer({ offerId: offer.id, action: "withdraw" }),
              "Offer taken back.",
            )
          }
          className={cn(pill, "border border-leaf-900 hover:bg-public-photo", focusRing)}
        >
          {pending === "withdraw" ? "Taking it back..." : "Take it back"}
        </button>
      )}
    </Row>
  );
}

/** A saved listing. Sold ones stay (it's nice to know) with a Sold sticker. */
function SavedCard({ listing }: { listing: PublicListing }) {
  return (
    <div className="relative">
      <div className={cn(listing.sold && "opacity-70")}>
        <ListingCard listing={listing} artSize={120} />
      </div>
      {listing.sold && (
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-leaf-900 px-3 py-1 text-sm font-bold text-white">
          Sold
        </span>
      )}
    </div>
  );
}

/** A followed shop: picture, name (to the store) and a way to stop following. */
function FollowRow({ shop }: { shop: LiveFollowView }) {
  const { following, toggle } = useFollow(shop.name, { shopId: shop.shopId, following: true });
  return (
    <li className="flex min-w-0 items-center gap-4 border-b border-public-border py-5">
      <StoreLink store={shop.slug} tabIndex={-1} aria-hidden className="shrink-0">
        <StoreAvatar store={{ ...shop, picture: shop.picture ?? undefined }} size={56} />
      </StoreLink>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <StoreLink store={shop.slug} className={cn("w-fit text-base font-bold hover:underline", focusRing)}>
          {shop.name}
        </StoreLink>
        <span className="text-sm text-public-text-muted">{shop.line}</span>
      </div>
      <button
        type="button"
        aria-pressed={following}
        aria-label={`${following ? "Unfollow" : "Follow"} ${shop.name}`}
        onClick={toggle}
        className={cn(
          "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border px-[18px] text-sm font-semibold transition-colors",
          following
            ? "border-public-border text-public-text-muted hover:border-leaf-900 hover:text-text"
            : "border-leaf-900 text-text hover:bg-public-photo",
          focusRing,
        )}
      >
        {following ? "Unfollow" : "Follow"}
      </button>
    </li>
  );
}
