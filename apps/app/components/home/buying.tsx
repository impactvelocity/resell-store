"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
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
import { BlanketIllustration, LampIllustration } from "./illustrations";
import { ItemGrid, Pill, SectionHeader, SidekickPromo } from "./parts";

/* A4 Home (buying). */

export type BuyingState = {
  paid: Record<string, boolean>;
  onPay: (offer: BuyerOffer) => void;
};

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
                className={cn(
                  "absolute top-0 right-0 rounded-full bg-accent",
                  ringClass,
                )}
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

function Offers({
  paid,
  onPay,
  desktop,
}: BuyingState & { desktop?: boolean }) {
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

/* ---------- Phone ---------- */

export function BuyingPhone(state: BuyingState) {
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
        <SectionHeader
          title="Your offers"
          href="/inbox"
          action="See all"
          className="px-1"
        />
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
  return (
    <div className="flex flex-col gap-7">
      <HomeSearch />
      <div className="flex flex-col items-start gap-7 xl:flex-row">
        <div className="flex w-full min-w-0 flex-col gap-7 xl:flex-1">
          <section className="flex flex-col gap-[14px]">
            <SectionHeader
              title="New from your shops"
              href="/search"
              action="See all"
            />
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
