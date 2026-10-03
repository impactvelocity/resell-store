"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon, SparkleIcon, TruckIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { shops, visibilityLabel, type Shop } from "../../lib/mock";
import { earnings, jessOffer, shipTask } from "../../lib/mock-home";
import { EmptyState } from "../empty-state";
import type { SellerOffer, SellerOrder } from "../seller-live/data";
import { money, shipToLine, versusLowest } from "../seller-live/format";
import { DepositBadge } from "../seller-live/parts";
import { ShopTile } from "./illustrations";
import { Pill, SectionHeader, SidekickPromo } from "./parts";

/*
 * A3 Home (selling). With `live`, the person's real shops, the newest offer
 * to answer, the oldest sale to ship and what they've sold (test payments).
 * Before any of that, those spots show the next thing to do.
 */

export type LiveShop = Shop & { picture: string | null };

export type SellingLive = {
  shops: LiveShop[];
  totalListings: number;
  /** The draft touched last, to pick up again. */
  draft: { name: string; shopName: string; stepLabel: string; href: string } | null;
  /** Offers to answer and sales to ship; "All quiet" until the first of either. */
  tasks?: SellingTasks;
};

export type SellingTasks = {
  /** The newest open offer. */
  offer: SellerOffer | null;
  openOffers: number;
  /** The oldest paid order still to ship. */
  ship: SellerOrder | null;
  toShip: number;
  /** All sales so far (test money): held plus released. */
  earnings: { totalCents: number; sales: number } | null;
  /** Any offer at all, ever, on their shops. */
  everOffered?: boolean;
  /** Any sale at all, ever. */
  everSold?: boolean;
};

export type SellingState = {
  offerAccepted: boolean;
  onAcceptOffer: () => void;
  live?: SellingLive;
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function VisibilityPill({ shop }: { shop: Shop }) {
  const tone =
    shop.visibility === "public" ? "secondary" : shop.visibility === "link" ? "primary" : "muted";
  return (
    <Pill tone={tone} dot={shop.visibility === "public"}>
      {visibilityLabel[shop.visibility]}
    </Pill>
  );
}

function shopSummary(shop: Shop) {
  if (shop.visibility === "private" && shop.live === 0) {
    return `Not open yet, ${plural(shop.drafts, "draft")}`;
  }
  const extra =
    shop.offers > 0
      ? `, ${shop.offers} offers waiting`
      : shop.drafts > 0
        ? `, ${plural(shop.drafts, "draft")}`
        : "";
  return `${shop.live} live${extra}`;
}

/** Up to three numbers for a shop card: live, offers or drafts, this week. */
function shopStats(shop: Shop) {
  const stats: { value: string; label: string }[] = [{ value: String(shop.live), label: "live" }];
  if (shop.offers > 0) {
    stats.push({ value: String(shop.offers), label: "offers" });
  } else if (shop.drafts > 0) {
    stats.push({
      value: String(shop.drafts),
      label: shop.drafts === 1 ? "draft" : "drafts",
    });
  }
  if (shop.thisWeek > 0) {
    stats.push({ value: `$${shop.thisWeek}`, label: "this week" });
  }
  return stats;
}

function EarningsFigure() {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-5xl font-extrabold tracking-tight">
        ${earnings.thisWeek}
      </span>
      <span className="text-base font-medium text-text-muted">from {earnings.sales} sales</span>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="text-base font-semibold text-text-muted">
      You made this week
    </div>
  );
}

function AgentBadge({ size }: { size: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent text-text",
        size === "sm" ? "size-8" : "size-10",
      )}
    >
      <SparkleIcon size={size === "sm" ? 16 : 18} />
    </span>
  );
}

function OfferActions({ accepted, onAccept }: { accepted: boolean; onAccept: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {accepted ? (
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary-soft px-5 text-sm font-bold text-secondary">
          <CheckIcon size={16} strokeWidth={2.8} />
          Accepted ${jessOffer.amount}
        </span>
      ) : (
        <Button variant="secondary" size="md" onClick={onAccept}>
          Accept ${jessOffer.amount}
        </Button>
      )}
      <Button
        variant="ghost"
        size="md"
        render={<Link href={`/offers/${jessOffer.id}`} />}
        nativeButton={false}
      >
        See the offer
      </Button>
    </div>
  );
}

const offerTitle = `${jessOffer.buyer} offered $${jessOffer.amount} for ${jessOffer.item}`;

/* ---------- Phone ---------- */

function ShopRow({ shop }: { shop: Shop & { picture?: string | null } }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-[14px] transition-colors hover:bg-surface-muted"
    >
      <ShopTile shop={shop} image={shop.picture} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{shop.name}</span>
        <span className="truncate text-sm text-text-muted">{shopSummary(shop)}</span>
      </span>
      <VisibilityPill shop={shop} />
    </Link>
  );
}

function AgentPromo({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-xl bg-secondary p-6", className)}>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-on-secondary">
          Let your own AI run the shop
        </h2>
        <p className="text-base text-leaf-100">
          Connect Claude or ChatGPT and it can list things, answer buyers, and tell you how sales
          are going.
        </p>
      </div>
      <Button
        size="md"
        className="w-fit"
        render={<Link href="/tools/agent" />}
        nativeButton={false}
      >
        Connect your agent
      </Button>
    </div>
  );
}

export function SellingPhone({ offerAccepted, onAcceptOffer, live }: SellingState) {
  if (live) return <SellingPhoneLive live={live} />;
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 px-4 pt-7">
        <Link href="/sales" className="flex flex-col gap-1 px-1">
          <Eyebrow />
          <EarningsFigure />
        </Link>
        <Button
          className="h-[60px] w-full px-7"
          render={<Link href="/list/new" />}
          nativeButton={false}
        >
          <SparkleIcon size={20} />
          List something new
        </Button>
      </div>

      <div className="px-4 pt-5">
        <div className="flex flex-col gap-[14px] rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2.5">
            <AgentBadge size="sm" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-accent-text">
              {jessOffer.meta}
            </span>
            <Pill tone="secondary">${jessOffer.hold} hold paid</Pill>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg leading-6 font-bold">{offerTitle}</h2>
            <p className="text-base text-text-muted">{jessOffer.note}</p>
          </div>
          <OfferActions accepted={offerAccepted} onAccept={onAcceptOffer} />
        </div>
      </div>

      <section className="flex flex-col gap-3 px-4 pt-8">
        <SectionHeader title="Your shops" href="/shops/new" action="New shop" className="px-1" />
        {shops.map((shop) => (
          <ShopRow key={shop.slug} shop={shop} />
        ))}
      </section>

      <div className="flex flex-col gap-3 px-4 pt-8">
        <AgentPromo />
        <SidekickPromo />
      </div>
    </div>
  );
}

/* ---------- Desktop ---------- */

function ShopCard({ shop }: { shop: Shop & { picture?: string | null } }) {
  const stats = shopStats(shop);
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-text-muted/40 hover:bg-surface-muted/40"
    >
      <span className="flex w-full items-center gap-3">
        <ShopTile shop={shop} image={shop.picture} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-bold">{shop.shortName}</span>
          {shop.visibility === "private" ? (
            <span className="truncate text-sm font-medium text-text-muted">Not open yet</span>
          ) : (
            <span className="truncate text-sm font-medium text-secondary">{shop.domain}</span>
          )}
        </span>
        <VisibilityPill shop={shop} />
      </span>
      <span className="grid w-full grid-cols-3 border-t border-border pt-[14px]">
        {stats.map((stat) => (
          <span key={stat.label} className="flex flex-col">
            <span className="font-display text-xl font-extrabold">{stat.value}</span>
            <span className="text-sm font-medium text-text-muted">{stat.label}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}

export function SellingDesktop({ offerAccepted, onAcceptOffer, live }: SellingState) {
  const toast = useToast();
  if (live) return <SellingDesktopLive live={live} />;
  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row">
        <Link
          href="/sales"
          className="group flex min-w-0 flex-col justify-between gap-6 rounded-xl xl:flex-1 border border-border bg-surface p-7 transition-colors hover:bg-surface-muted/40"
        >
          <span className="flex flex-col gap-1.5">
            <Eyebrow />
            <EarningsFigure />
          </span>
          <span className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-sm font-medium text-text-muted">
              ${earnings.payout} lands in your PayPal on {earnings.payoutDay}
            </span>
            <span className="text-sm font-bold text-secondary group-hover:underline">
              See sales
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 grow-[1.4] basis-auto flex-col rounded-xl border xl:basis-0 border-border bg-surface px-6 py-2">
          <div className="flex w-full items-start gap-[14px] border-b border-border py-[18px]">
            <AgentBadge size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="text-lg leading-6 font-bold">{offerTitle}</h2>
                  <Pill tone="secondary">${jessOffer.hold} hold paid</Pill>
                </div>
                <p className="text-base text-text-muted">{jessOffer.note}</p>
              </div>
              <OfferActions accepted={offerAccepted} onAccept={onAcceptOffer} />
            </div>
          </div>
          <div className="flex w-full items-center gap-[14px] py-[18px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <TruckIcon size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="text-base font-bold">{shipTask.title}</div>
              <div className="text-sm text-text-muted">{shipTask.detail}</div>
            </div>
            <Button
              variant="soft"
              size="md"
              onClick={() => toast.add({ title: "Label ready. Print it and tape it on." })}
            >
              Get the label
            </Button>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-[14px]">
        <SectionHeader title="Your shops" href="/shops/new" action="New shop" />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.slug} shop={shop} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <AgentPromo className="min-w-0 lg:grow-[1.4] lg:basis-0" />
        <SidekickPromo className="min-w-0 lg:flex-1" />
      </div>
    </>
  );
}

/* ---------- Live: what to do next ---------- */

/** Where "List something new" goes: straight into the only shop, or ask. */
function newListingHref(live: SellingLive) {
  return live.shops.length === 1 ? `/list/new?shop=${live.shops[0]!.slug}` : "/list/new";
}

const primaryLink =
  "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-on-primary transition-colors hover:bg-lemon-300";

/** No shops yet: the one thing to do. */
function OpenFirstShop() {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <EmptyState
        sticker="Start here"
        title="Open your first shop"
        actions={
          <Link href="/shops/new" className={primaryLink}>
            Open my first shop
          </Link>
        }
      >
        Pick a name and a link. It takes a minute, and you can change all of it later.
      </EmptyState>
    </div>
  );
}

/** Shops, but nothing in them yet. */
function ListFirstThing({ live }: { live: SellingLive }) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <EmptyState
        sticker="Nothing yet"
        tone="leaf"
        title="List your first thing"
        actions={
          <Link href={newListingHref(live)} className={primaryLink}>
            <SparkleIcon size={20} />
            List something
          </Link>
        }
      >
        Snap a photo or say what it is. Your agent looks it up, prices it and writes it for you.
      </EmptyState>
    </div>
  );
}

/** A draft in progress, or a summary of what's live. Sits where earnings will go. */
function NextStepCard({ live, className }: { live: SellingLive; className?: string }) {
  const liveCount = live.shops.reduce((n, s) => n + s.live, 0);
  const draft = live.draft;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-5 rounded-xl border border-border bg-surface p-6 desk:p-7",
        className,
      )}
    >
      {draft ? (
        <div className="flex flex-col gap-3">
          <LiveEyebrow>Pick up where you left off</LiveEyebrow>
          <Link href={draft.href} className="group flex items-center gap-3.5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-primary-soft text-text">
              <SparkleIcon size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-lg font-bold group-hover:underline">{draft.name}</span>
              <span className="truncate text-sm text-text-muted">
                {draft.stepLabel}, in {draft.shopName}
              </span>
            </span>
          </Link>
        </div>
      ) : live.tasks?.earnings ? (
        <Link href="/sales" className="group flex flex-col gap-1.5">
          <LiveEyebrow>Sold so far (test)</LiveEyebrow>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-extrabold tracking-tight">
              {money(live.tasks.earnings.totalCents)}
            </span>
            <span className="text-base font-medium text-text-muted">
              from {plural(live.tasks.earnings.sales, "sale")}
            </span>
          </div>
          <p className="text-sm text-text-muted group-hover:underline">
            {liveCount} still live. Test checkout: no money moves yet. PayPal is next.
          </p>
        </Link>
      ) : (
        <div className="flex flex-col gap-1.5">
          <LiveEyebrow>Out there now</LiveEyebrow>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-extrabold tracking-tight">{liveCount}</span>
            <span className="text-base font-medium text-text-muted">
              {liveCount === 1 ? "thing live" : "things live"}
            </span>
          </div>
          <p className="text-sm text-text-muted">
            What you make shows up here once something sells.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {draft && (
          <Button
            variant="secondary"
            size="md"
            render={<Link href={draft.href} />}
            nativeButton={false}
          >
            Keep going
          </Button>
        )}
        <Button
          variant={draft ? "ghost" : "secondary"}
          size="md"
          render={<Link href={newListingHref(live)} />}
          nativeButton={false}
        >
          List something new
        </Button>
      </div>
    </div>
  );
}

/** Offers and things to ship, before there are any. */
function AllQuiet({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-xl border border-border bg-surface",
        className,
      )}
    >
      <EmptyState size="sm" tone="muted" sticker="All quiet" title="Offers and sales land here">
        When a buyer makes an offer or something sells, you&apos;ll see it here with what to do
        next.
      </EmptyState>
    </div>
  );
}

const moneyIcon = (
  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg leading-6 font-extrabold text-on-primary">
    $
  </span>
);

/** The offer flagged for an answer and the next thing to ship, replacing "All quiet". */
function TasksCard({ tasks, className }: { tasks: SellingTasks; className?: string }) {
  const { offer, ship } = tasks;
  const vs = offer ? versusLowest(offer.amountCents, offer.lowestCents) : null;
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-surface px-5 py-1 desk:px-6 desk:py-2", className)}>
      {offer && (
        <div className="flex w-full items-start gap-[14px] border-b border-border py-[18px] last:border-b-0">
          {moneyIcon}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 className="text-lg leading-6 font-bold">
                  {offer.buyer.firstName} offered {money(offer.amountCents)} for {offer.listing.title}
                </h2>
                {offer.depositCents ? <DepositBadge cents={offer.depositCents} /> : null}
              </div>
              <p className="text-base text-text-muted">
                {[vs?.label, offer.timeLeft, offer.note && `“${offer.note}”`].filter(Boolean).join(". ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="md" render={<Link href={`/offers/${offer.id}`} />} nativeButton={false}>
                Answer {offer.buyer.firstName}
              </Button>
              {tasks.openOffers > 1 && (
                <Button variant="ghost" size="md" render={<Link href="/inbox" />} nativeButton={false}>
                  {plural(tasks.openOffers - 1, "more offer")} waiting
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {ship && (
        <div className="flex w-full items-center gap-[14px] py-[18px]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <TruckIcon size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-base font-bold">
              Ship {ship.listing.title}
              {tasks.toShip > 1 && <span className="font-semibold text-text-muted"> and {tasks.toShip - 1} more</span>}
            </div>
            <div className="text-sm text-text-muted">
              To {shipToLine(ship)}. {ship.soldOn}.
            </div>
          </div>
          <Button variant="soft" size="md" render={<Link href="/sales" />} nativeButton={false}>
            Ship it
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The offer to answer and the sale to ship. "All quiet" explains the spot to
 * someone who's never had either; after that, nothing to do means nothing here.
 */
function TasksOrQuiet({ live, className }: { live: SellingLive; className?: string }) {
  const tasks = live.tasks;
  if (tasks && (tasks.offer || tasks.ship)) return <TasksCard tasks={tasks} className={className} />;
  if (tasks?.everOffered || tasks?.everSold) return null;
  return <AllQuiet className={className} />;
}

function LiveEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-semibold tracking-wide text-text-muted uppercase">{children}</div>
  );
}

function SellingPhoneLive({ live }: { live: SellingLive }) {
  const hasShops = live.shops.length > 0;
  return (
    <div className="flex flex-col">
      {!hasShops ? (
        <div className="px-4 pt-5">
          <OpenFirstShop />
        </div>
      ) : live.totalListings === 0 ? (
        <div className="px-4 pt-5">
          <ListFirstThing live={live} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pt-5">
          <NextStepCard live={live} />
          <TasksOrQuiet live={live} />
        </div>
      )}

      {hasShops && (
        <section className="flex flex-col gap-3 px-4 pt-8">
          <SectionHeader title="Your shops" href="/shops/new" action="New shop" className="px-1" />
          {live.shops.map((shop) => (
            <ShopRow key={shop.slug} shop={shop} />
          ))}
        </section>
      )}

      <div className="flex flex-col gap-3 px-4 pt-8">
        <AgentPromo />
        <SidekickPromo />
      </div>
    </div>
  );
}

function SellingDesktopLive({ live }: { live: SellingLive }) {
  const hasShops = live.shops.length > 0;
  return (
    <>
      {!hasShops ? (
        <OpenFirstShop />
      ) : live.totalListings === 0 ? (
        <ListFirstThing live={live} />
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row">
          <NextStepCard live={live} className="xl:flex-1" />
          <TasksOrQuiet live={live} className="xl:grow-[1.4] xl:basis-0" />
        </div>
      )}

      {hasShops && (
        <section className="flex flex-col gap-[14px]">
          <SectionHeader title="Your shops" href="/shops/new" action="New shop" />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {live.shops.map((shop) => (
              <ShopCard key={shop.slug} shop={shop} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <AgentPromo className="min-w-0 lg:grow-[1.4] lg:basis-0" />
        <SidekickPromo className="min-w-0 lg:flex-1" />
      </div>
    </>
  );
}
