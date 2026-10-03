"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { ItemCard } from "@repo/ui/item-card";
import { SearchField } from "@repo/ui/search-field";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  buyerOffers,
  followedCount,
  followedShops,
  shopItems,
  type BuyerOffer,
  type FollowedShop,
} from "../../lib/mock-home";
import { formatPrice, type StoreTone } from "../../lib/mock-market";
import type { FollowedShop as LiveFollowedShop } from "../../lib/server/follows";
import { storeUrl } from "../../lib/urls";
import { EmptyState } from "../empty-state";
import { BlanketIllustration, LampIllustration } from "./illustrations";
import { ItemGrid, Pill, SectionHeader, SidekickPromo } from "./parts";

/*
 * A4 Home (buying). With `live`, the shops the person follows and what they
 * listed lately; before they follow any, a nudge towards the marketplace.
 * Orders and offers live in the buyer account, so Home points there.
 */

export type BuyingState = {
  paid: Record<string, boolean>;
  onPay: (offer: BuyerOffer) => void;
  live?: boolean;
  /** Live: the shops they follow, newest follow first */
  followed?: LiveFollowedShop[];
};

function NothingFollowed() {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <EmptyState
        sticker="Go explore"
        tone="pink"
        title="Find shops you like"
        actions={
          <Link
            href="/discover"
            className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-7 text-base font-bold text-on-primary transition-colors hover:bg-lemon-300"
          >
            Look around
          </Link>
        }
      >
        Follow a shop or save something and it shows up here, with any offers you make.
      </EmptyState>
    </div>
  );
}

/** Search field that sends you to /search with what you typed. */
export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
    >
      <SearchField
        placeholder="Search shops and things"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        containerClassName="desk:h-14 desk:gap-3 desk:px-[22px]"
      />
    </form>
  );
}

const avatarTones: Record<FollowedShop["tone"], string> = {
  primary: "bg-primary text-on-primary",
  leaf: "bg-leaf-300 text-text",
  pink: "bg-accent-soft text-text",
  secondary: "bg-secondary text-on-secondary",
};

function FollowedShopAvatars({ ringClass }: { ringClass: string }) {
  return (
    <div className="flex w-full items-start justify-between">
      {followedShops.map((shop) => (
        <Link
          key={shop.name}
          href={`/search?q=${encodeURIComponent(shop.name)}`}
          className="group flex w-[72px] shrink-0 flex-col items-center gap-2"
        >
          <span
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full font-display text-2xl font-extrabold transition-transform group-hover:-rotate-6",
              avatarTones[shop.tone],
            )}
          >
            {shop.initial}
            {shop.hasNew && (
              <span
                aria-label="New things"
                className={cn("absolute top-0 right-0 rounded-full bg-accent", ringClass)}
              />
            )}
          </span>
          <span className="text-center text-sm font-semibold">{shop.name}</span>
        </Link>
      ))}
    </div>
  );
}

function OfferCard({
  offer,
  paid,
  onPay,
  desktop = false,
}: {
  offer: BuyerOffer;
  paid: boolean;
  onPay: () => void;
  desktop?: boolean;
}) {
  const accepted = offer.status === "accepted";
  const Icon = offer.icon === "lamp" ? LampIllustration : BlanketIllustration;
  const row = (
    <div className={cn("flex w-full items-center", desktop ? "gap-[14px]" : "gap-3")}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md",
          offer.tone === "lemon" ? "bg-primary-soft" : "bg-leaf-100",
          desktop ? "size-[52px]" : "size-14",
        )}
      >
        <Icon size={desktop ? 30 : 34} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{offer.item}</span>
        <span className="text-sm text-text-muted">
          {paid ? `Paid $${offer.amount}. ${offer.seller} is packing it.` : offer.detail}
        </span>
      </span>
      {accepted ? (
        <Pill tone="secondary">{paid ? "Paid" : "Accepted"}</Pill>
      ) : (
        <Pill tone="primary">Waiting</Pill>
      )}
    </div>
  );
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[14px] rounded-lg border border-border bg-surface",
        desktop ? "p-[18px]" : "p-4",
      )}
    >
      {row}
      {accepted && !paid && (
        <Button variant="secondary" size="md" className="w-full" onClick={onPay}>
          Pay ${offer.amount} to keep it
        </Button>
      )}
    </div>
  );
}

function Offers({ paid, onPay, desktop }: BuyingState & { desktop?: boolean }) {
  return (
    <>
      {buyerOffers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          paid={!!paid[offer.id]}
          onPay={() => onPay(offer)}
          desktop={desktop}
        />
      ))}
    </>
  );
}

const newItems = shopItems.slice(0, 3);

/* ---------- Live: real follows ---------- */

const liveTones: Record<StoreTone, string> = {
  lemon: "bg-primary text-on-primary",
  mint: "bg-leaf-300 text-text",
  pink: "bg-accent-soft text-text",
  leaf: "bg-leaf-100 text-text",
  forest: "bg-secondary text-on-secondary",
  ink: "bg-text text-background",
};

/** The followed shops as a row of avatars, each off to its store. Scrolls sideways when there are lots. */
function LiveFollowedAvatars({ shops, ringClass }: { shops: LiveFollowedShop[]; ringClass: string }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {shops.map((shop) => (
        <a
          key={shop.shopId}
          href={storeUrl(shop.slug)}
          className="group flex w-[72px] shrink-0 flex-col items-center gap-2"
        >
          <span
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full font-display text-2xl font-extrabold transition-transform group-hover:-rotate-6",
              liveTones[shop.tone],
            )}
          >
            {shop.picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own route
              <img src={shop.picture} alt="" className="size-full rounded-full object-cover" />
            ) : (
              shop.initial
            )}
            {shop.hasNew && (
              <span
                aria-label="New this week"
                className={cn("absolute top-0 right-0 rounded-full bg-accent", ringClass)}
              />
            )}
          </span>
          <span className="w-full truncate text-center text-sm font-semibold">{shop.name}</span>
        </a>
      ))}
    </div>
  );
}

/** The newest from each followed shop in turn, so one busy shop doesn't fill the grid. */
function newestAcross(shops: LiveFollowedShop[], limit: number) {
  const out: { shop: LiveFollowedShop; item: LiveFollowedShop["newest"][number] }[] = [];
  const depth = Math.max(0, ...shops.map((s) => s.newest.length));
  for (let i = 0; i < depth && out.length < limit; i++) {
    for (const shop of shops) {
      const item = shop.newest[i];
      if (item && out.length < limit) out.push({ shop, item });
    }
  }
  return out;
}

function LiveItemGrid({ shops, limit }: { shops: LiveFollowedShop[]; limit: number }) {
  const items = newestAcross(shops, limit);
  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-surface-muted px-5 py-4 text-base text-text-muted">
        Nothing new from them right now. Their next listings show up here.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 desk:grid-cols-3 desk:gap-4">
      {items.map(({ shop, item }) => {
        const href = storeUrl(shop.slug, `/${item.slug}`);
        return (
          <ItemCard
            key={item.id}
            title={
              <a href={href} className="hover:underline">
                {item.title}
              </a>
            }
            meta={shop.name}
            price={formatPrice(item.price)}
            image={
              <a href={href} tabIndex={-1} aria-hidden className="flex size-full items-center justify-center">
                {item.photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own route
                  <img src={item.photo} alt="" className="size-full object-cover" />
                )}
              </a>
            }
            className="min-w-0 gap-2.5 [&>div:first-child]:h-[196px]"
          />
        );
      })}
    </div>
  );
}

/** Orders, offers and follows live on the marketplace account. */
function AccountCard({ className }: { className?: string }) {
  return (
    <Link
      href="/account"
      className={cn(
        "group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-muted/40",
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-bold">Your buyer account</span>
        <span className="text-sm text-text-muted">
          Your orders, offers and shops you follow are all there.
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-secondary group-hover:underline">
        Open it
        <ArrowUpRightIcon size={18} strokeWidth={2.4} />
      </span>
    </Link>
  );
}

function FollowedHeader({ shops, className }: { shops: LiveFollowedShop[]; className?: string }) {
  return (
    <SectionHeader
      title="Shops you follow"
      href="/account#following"
      action={shops.length > 4 ? `See all ${shops.length}` : "Manage"}
      className={className}
    />
  );
}

/* ---------- Phone ---------- */

export function BuyingPhone(state: BuyingState) {
  if (state.live) {
    const followed = state.followed ?? [];
    return (
      <div className="flex flex-col">
        <HomeSearch className="px-4 pt-4" />
        {followed.length ? (
          <>
            <section className="flex flex-col gap-[14px] px-4 pt-7">
              <FollowedHeader shops={followed} className="px-1" />
              <div className="px-1">
                <LiveFollowedAvatars shops={followed} ringClass="size-4 border-[3px] border-background" />
              </div>
            </section>
            <section className="flex flex-col gap-3 px-4 pt-8">
              <SectionHeader title="New from your shops" className="px-1" />
              <LiveItemGrid shops={followed} limit={4} />
            </section>
          </>
        ) : (
          <div className="px-4 pt-5">
            <NothingFollowed />
          </div>
        )}
        <div className="flex flex-col gap-3 px-4 pt-8">
          <AccountCard />
          <SidekickPromo />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <HomeSearch className="px-4 pt-4" />

      <section className="flex flex-col gap-[14px] px-4 pt-7">
        <SectionHeader
          title="Shops you follow"
          href="/search"
          action={`See all ${followedCount}`}
          className="px-1"
        />
        <div className="px-1">
          <FollowedShopAvatars ringClass="size-4 border-[3px] border-background" />
        </div>
      </section>

      <section className="flex flex-col gap-3 px-4 pt-8">
        <SectionHeader title="Your offers" href="/inbox" action="See all" className="px-1" />
        <Offers {...state} />
      </section>

      <section className="flex flex-col gap-3 px-4 pt-8">
        <SectionHeader
          title="New from your shops"
          href="/search"
          action="See all"
          className="px-1"
        />
        <ItemGrid items={newItems.slice(0, 2)} />
      </section>

      <div className="px-4 pt-8">
        <SidekickPromo />
      </div>
    </div>
  );
}

/* ---------- Desktop ---------- */

export function BuyingDesktop(state: BuyingState) {
  if (state.live) {
    const followed = state.followed ?? [];
    if (!followed.length) {
      return (
        <div className="flex flex-col gap-7">
          <HomeSearch />
          <NothingFollowed />
          <div className="flex flex-col gap-4 lg:flex-row">
            <AccountCard className="min-w-0 lg:grow-[1.4] lg:basis-0" />
            <SidekickPromo className="min-w-0 lg:flex-1" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-7">
        <HomeSearch />
        <div className="flex flex-col items-start gap-7 xl:flex-row">
          <section className="flex w-full min-w-0 flex-col gap-[14px] xl:flex-1">
            <SectionHeader title="New from your shops" />
            <LiveItemGrid shops={followed} limit={6} />
          </section>
          <div className="flex w-full shrink-0 flex-col gap-6 xl:w-[400px]">
            <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
              <FollowedHeader shops={followed} />
              <LiveFollowedAvatars shops={followed} ringClass="size-[14px] border-2 border-surface" />
            </section>
            <AccountCard />
            <SidekickPromo />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-7">
      <HomeSearch />
      <div className="flex flex-col items-start gap-7 xl:flex-row">
        <div className="flex w-full min-w-0 flex-col gap-7 xl:flex-1">
          <section className="flex flex-col gap-[14px]">
            <SectionHeader title="New from your shops" href="/search" action="See all" />
            <ItemGrid items={newItems} />
          </section>
          <div className="flex items-center justify-between gap-6 rounded-xl bg-primary-soft px-7 py-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                Shopping sidekick
              </h2>
              <p className="text-base">
                About to buy something? See what it will resell for first.
              </p>
            </div>
            <Button
              size="md"
              className="bg-text text-background hover:bg-leaf-600"
              render={<Link href="/tools/sidekick" />}
              nativeButton={false}
            >
              Check something
            </Button>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-6 xl:w-[400px]">
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
            <SectionHeader
              title="Shops you follow"
              href="/search"
              action={`See all ${followedCount}`}
            />
            <FollowedShopAvatars ringClass="size-[14px] border-2 border-surface" />
          </section>
          <section className="flex flex-col gap-3">
            <SectionHeader title="Your offers" href="/inbox" action="See all" />
            <Offers {...state} desktop />
          </section>
        </div>
      </div>
    </div>
  );
}
