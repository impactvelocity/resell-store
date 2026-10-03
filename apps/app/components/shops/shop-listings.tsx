"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@repo/ui/icons";
import { SearchField } from "@repo/ui/search-field";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import type { Shop } from "../../lib/mock";
import type { ShopData, ShopListing } from "../../lib/mock-shops";
import { EmptyState } from "../empty-state";
import { useViewer } from "../viewer";
import {
  Badge,
  CopySmallIcon,
  ListingThumb,
  Menu,
  MenuItem,
  ShopTile,
  SlidersIcon,
  SparkleSolid,
  VisibilityTag,
  roundButton,
  softPill,
  useShareShop,
} from "./parts";

/*
 * B2 Shop listings. One shop's header, numbers and its listings by status.
 * With `live`, the numbers are only the ones we really keep (no views, saves
 * or offers yet) and the links go to the real store and listings.
 */

type Tab = "live" | "draft" | "sold";

const PAGE = 4;

export type ShopListingsLive = {
  /** The store's real address, for See shop and Share. */
  storeUrl: string;
  picture: string | null;
  paused: boolean;
};

function listingHref(listing: ShopListing) {
  if (listing.href) return listing.href;
  return listing.status === "draft" ? "/list/dutch-oven/details" : "/listings/linen-dress";
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", Number.isInteger(n) ? {} : { minimumFractionDigits: 2 })}`;
}

export function ShopListings({
  shop,
  data,
  live,
}: {
  shop: Shop;
  data: ShopData;
  live?: ShopListingsLive;
}) {
  const toast = useToast();
  const share = useShareShop();
  const { shops } = useViewer();
  const newHref = live ? `/list/new?shop=${shop.slug}` : "/list/new";
  const [tab, setTab] = useState<Tab>(
    data.counts.live > 0 || data.counts.drafts === 0 ? "live" : "draft",
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const inTab = data.listings.filter((l) => l.status === tab);
  const matching = query.trim()
    ? inTab.filter((l) => l.title.toLowerCase().includes(query.trim().toLowerCase()))
    : inTab;
  const visible = expanded ? matching : matching.slice(0, PAGE);
  const tabTotal =
    tab === "live" ? data.counts.live : tab === "draft" ? data.counts.drafts : data.counts.sold;
  const total = query.trim() ? matching.length : tabTotal;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "live", label: "Live", count: data.counts.live },
    { value: "draft", label: "Drafts", count: data.counts.drafts },
    { value: "sold", label: "Sold", count: data.counts.sold },
  ];

  function seeShop() {
    if (live && shop.visibility !== "private") {
      window.open(live.storeUrl, "_blank", "noopener");
      return;
    }
    toast.add({
      title:
        shop.visibility === "private"
          ? "This shop isn't open yet. Only you can see it."
          : `Opening ${shop.domain}`,
    });
  }

  const isPrivate = shop.visibility === "private";

  const linkLine = (size: "sm" | "base") =>
    isPrivate ? (
      <span className={cn("font-medium text-text-muted", size === "sm" ? "text-sm" : "text-base")}>
        Not open yet
      </span>
    ) : (
      <button
        type="button"
        onClick={() => share(shop, live?.storeUrl)}
        className={cn(
          "flex w-fit cursor-pointer items-center gap-1.5 rounded-sm font-semibold whitespace-nowrap text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-secondary",
          size === "sm" ? "text-sm" : "text-base",
        )}
        aria-label={`Copy ${shop.domain}`}
      >
        {shop.domain}
        <CopySmallIcon />
      </button>
    );

  const tabChips = (
    <ChipGroup
      value={[tab]}
      onValueChange={(value) => {
        const next = value[0] as Tab | undefined;
        if (next) {
          setTab(next);
          setExpanded(false);
        }
      }}
      className="flex-nowrap"
    >
      {tabs.map((t) => (
        <Chip key={t.value} value={t.value} className="group gap-1.5 px-4">
          {t.label}
          <span className="text-text-muted group-data-pressed:text-leaf-300">{t.count}</span>
        </Chip>
      ))}
    </ChipGroup>
  );

  const empty = (
    <div className="flex flex-col items-center gap-1 py-10 text-center">
      <span className="font-bold">
        {query.trim()
          ? `Nothing called "${query.trim()}" here.`
          : tab === "live"
            ? "Nothing live in this shop yet."
            : tab === "draft"
              ? "No drafts. Everything's out there."
              : "Nothing sold yet. It'll come."}
      </span>
      {!query.trim() && tab !== "sold" && (
        <Link href={newHref} className="text-sm font-bold text-secondary hover:underline">
          List something new
        </Link>
      )}
    </div>
  );

  const nothingYet = !!live && data.listings.length === 0;
  const firstListing = (
    <EmptyState
      sticker="Nothing yet"
      title="Your shop is ready for its first thing"
      actions={
        <Link
          href={newHref}
          className="flex h-14 items-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-on-primary transition-colors hover:bg-lemon-300"
        >
          <SparkleSolid size={18} />
          List something
        </Link>
      }
    >
      Snap a photo or say what it is. Your agent looks it up, prices it and writes it for you.
    </EmptyState>
  );

  const pausedNote = live?.paused && (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3">
      <span className="min-w-0 flex-1 text-sm font-medium">
        This shop is paused. Nobody else can see it right now.
      </span>
      <Link
        href={`/shops/${shop.slug}/settings`}
        className="shrink-0 text-sm font-bold text-secondary hover:underline"
      >
        Open it again
      </Link>
    </div>
  );

  const phoneStats = live
    ? [
        { value: String(data.counts.live), label: "live" },
        { value: data.viewsThisWeek.toLocaleString("en-US"), label: "views this week" },
        { value: String(data.offersWaiting), label: "offers waiting" },
      ]
    : [
        { value: money(data.madeThisWeek), label: "this week" },
        { value: String(data.counts.live), label: "live" },
        { value: String(data.offersWaiting), label: "offers waiting" },
      ];

  const deskTiles = live
    ? [
        { label: "Made this week", value: money(data.madeThisWeek) },
        { label: "Live listings", value: String(data.counts.live) },
        { label: "Offers waiting", value: String(data.offersWaiting) },
        { label: "Views this week", value: data.viewsThisWeek.toLocaleString("en-US") },
      ]
    : [
        { label: "Made this week", value: money(data.madeThisWeek) },
        { label: "Live listings", value: String(data.counts.live) },
        { label: "Offers waiting", value: String(data.offersWaiting) },
        {
          label: "Views this week",
          value: data.viewsThisWeek.toLocaleString("en-US"),
        },
      ];


  // Live: followers, likes and shares in one quiet line, into the full stats
  const miniStats = live && (
    <Link
      href={`/stats?shop=${shop.slug}`}
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-muted hover:text-text"
    >
      {[
        `${(data.followers ?? 0).toLocaleString("en-US")} ${data.followers === 1 ? "follower" : "followers"}`,
        `${(data.likes ?? 0).toLocaleString("en-US")} ${data.likes === 1 ? "like" : "likes"}`,
        `${(data.shares ?? 0).toLocaleString("en-US")} ${data.shares === 1 ? "share" : "shares"}`,
        `${data.counts.drafts} ${data.counts.drafts === 1 ? "draft" : "drafts"}, ${data.counts.sold} sold`,
      ].join(" · ")}
      <span className="font-semibold text-secondary">All stats</span>
    </Link>
  );

  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href="/me" aria-label="Back" className={roundButton}>
            <ChevronLeftIcon />
          </Link>
          <Menu label={shop.shortName} align="center" aria-label="Switch shop">
            {(close) => (
              <>
                {shops.map((s) => (
                  <MenuItem
                    key={s.slug}
                    href={`/shops/${s.slug}`}
                    selected={s.slug === shop.slug}
                    onClick={close}
                  >
                    {s.name}
                  </MenuItem>
                ))}
                <MenuItem href="/shops/new" onClick={close} className="text-secondary">
                  <PlusIcon size={18} strokeWidth={2.6} />
                  New shop
                </MenuItem>
              </>
            )}
          </Menu>
          <Link
            href={`/shops/${shop.slug}/settings`}
            aria-label="Shop settings"
            className={roundButton}
          >
            <SlidersIcon />
          </Link>
        </div>

        <section className="flex flex-col gap-4 px-4 pt-6">
          <div className="flex items-center gap-3.5 px-1">
            <ShopTile shop={shop} size={64} art={38} image={live?.picture} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="font-display text-2xl font-extrabold tracking-tight">{shop.name}</h1>
              {linkLine("sm")}
            </div>
            <VisibilityTag visibility={shop.visibility} />
          </div>
          {pausedNote}
          <div className="flex items-start border-y border-border px-1 py-4">
            {phoneStats.map((stat) => (
              <div key={stat.label} className="flex flex-1 flex-col">
                <span className="font-display text-2xl font-extrabold tracking-tight">
                  {stat.value}
                </span>
                <span className="text-sm font-medium text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
          {miniStats && <div className="-mt-1 px-1">{miniStats}</div>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={seeShop} className={cn(softPill, "flex-1 px-0")}>
              See shop
            </button>
            <button
              type="button"
              onClick={() => share(shop, live?.storeUrl)}
              className={cn(softPill, "flex-1 px-0")}
            >
              Share
            </button>
            <Link href={`/stats?shop=${shop.slug}`} className={cn(softPill, "flex-1 px-0")}>
              Stats
            </Link>
          </div>
        </section>

        {nothingYet ? (
          <section className="px-4 pt-2 pb-6">{firstListing}</section>
        ) : (
          <section className="flex flex-col gap-3 px-4 pt-7">
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">{tabChips}</div>
            <div className="flex flex-col rounded-lg border border-border bg-surface px-3.5 py-0.5">
              {visible.length === 0
                ? empty
                : visible.map((listing, i) => (
                    <Link
                      key={listing.id}
                      href={listingHref(listing)}
                      className={cn(
                        "flex items-center gap-3 py-3 outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-secondary",
                        i < visible.length - 1 && "border-b border-border",
                      )}
                    >
                      <ListingThumb listing={listing} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base font-bold">{listing.title}</span>
                        <span className="truncate text-sm text-text-muted">
                          {listing.status === "live"
                            ? live && !listing.views
                              ? `${money(listing.price)}, ${listing.listed.toLowerCase()}`
                              : `${money(listing.price)}, ${listing.views} ${listing.views === 1 ? "view" : "views"}`
                            : listing.status === "sold"
                              ? `${listing.listed}, ${money(listing.price)}`
                              : listing.detail}
                        </span>
                      </span>
                      <span className="flex w-[88px] shrink-0 justify-end">
                        {listing.offers > 0 ? (
                          <Badge tone="accent">
                            {listing.offers} {listing.offers === 1 ? "offer" : "offers"}
                          </Badge>
                        ) : listing.isNew ? (
                          <Badge tone="lemon">New</Badge>
                        ) : listing.status === "draft" ? (
                          <Badge tone="muted">Draft</Badge>
                        ) : (
                          <ChevronRightIcon
                            size={18}
                            strokeWidth={2.2}
                            className="text-text-muted"
                          />
                        )}
                      </span>
                    </Link>
                  ))}
            </div>
            {live && matching.length > PAGE && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="cursor-pointer self-center py-1 text-sm font-bold text-secondary hover:underline"
              >
                {expanded ? "Show less" : `Show all ${matching.length}`}
              </button>
            )}
            <Link
              href={newHref}
              className="flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-on-primary transition-colors hover:bg-lemon-300"
            >
              <SparkleSolid size={20} />
              List something new
            </Link>
          </section>
        )}
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-8 pb-14 desk:flex">
        <nav aria-label="Your shops" className="flex flex-wrap items-center gap-2">
          {shops.map((s) => (
            <Link
              key={s.slug}
              href={`/shops/${s.slug}`}
              aria-current={s.slug === shop.slug ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-full px-[18px] text-sm font-semibold transition-colors",
                s.slug === shop.slug
                  ? "bg-text text-background"
                  : "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted",
              )}
            >
              {s.name}
            </Link>
          ))}
          <Link
            href="/shops/new"
            className="flex h-10 items-center gap-1.5 rounded-full pr-4 pl-3 text-sm font-bold text-secondary transition-colors hover:bg-secondary-soft"
          >
            <PlusIcon size={18} strokeWidth={2.6} />
            New shop
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-5">
          <ShopTile shop={shop} size={80} art={48} image={live?.picture} />
          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">{shop.name}</h1>
              <VisibilityTag visibility={shop.visibility} />
            </div>
            {linkLine("base")}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={seeShop} className={softPill}>
              See shop
            </button>
            <button type="button" onClick={() => share(shop, live?.storeUrl)} className={softPill}>
              Share
            </button>
            <Link href={`/shops/${shop.slug}/settings`} className={softPill}>
              Settings
            </Link>
          </div>
        </div>

        {pausedNote}

        <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {deskTiles.map((tile) => (
            <Link
              key={tile.label}
              href={`/stats?shop=${shop.slug}`}
              className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-text-muted/40"
            >
              <span className="text-sm font-medium text-text-muted">{tile.label}</span>
              <span className="font-display text-2xl font-extrabold tracking-tight">
                {tile.value}
              </span>
            </Link>
          ))}
        </div>
        {miniStats}
        </div>

        {nothingYet ? (
          <div className="rounded-xl border border-border bg-surface">{firstListing}</div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-4">
              {tabChips}
              <SearchField
                placeholder="Search this shop"
                aria-label="Search this shop"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                containerClassName="h-11 w-[300px] shrink gap-2.5 px-[18px]"
                className="text-sm"
              />
            </div>
            <div className="flex flex-col rounded-lg border border-border bg-surface px-6 py-1">
              <div className="flex items-center gap-4 border-b border-border pt-3.5 pb-2.5 text-sm font-semibold text-text-muted">
                <span className="flex-1">Item</span>
                <span className="w-[72px] shrink-0 text-right">Price</span>
                <span className="w-[72px] shrink-0 text-right">Views</span>
                <span className="hidden w-[72px] shrink-0 text-right xl:block">{live ? "Likes" : "Saves"}</span>
                <span className="hidden w-[120px] shrink-0 xl:block">
                  {live && tab === "draft" ? "Started" : live && tab === "sold" ? "Sold" : "Listed"}
                </span>
                <span className="w-[110px] shrink-0">Offers</span>
                <span className="w-[18px] shrink-0" />
              </div>
              {visible.length === 0
                ? empty
                : visible.map((listing) => (
                    <Link
                      key={listing.id}
                      href={listingHref(listing)}
                      className="group flex items-center gap-4 border-b border-border py-3 outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-secondary"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3.5">
                        <ListingThumb listing={listing} size={48} art={30} />
                        <span className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-base font-bold group-hover:underline">
                              {listing.title}
                            </span>
                            {listing.isNew && (
                              <span className="flex h-6 shrink-0 items-center rounded-full bg-primary-soft px-2.5 text-sm font-semibold">
                                New
                              </span>
                            )}
                          </span>
                          <span className="truncate text-sm text-text-muted">{listing.detail}</span>
                        </span>
                      </span>
                      <span className="w-[72px] shrink-0 text-right text-base font-bold">
                        {listing.price ? money(listing.price) : "Not set"}
                      </span>
                      {
                        <>
                          <span className="w-[72px] shrink-0 text-right text-base font-medium">
                            {listing.views}
                          </span>
                          <span className="hidden w-[72px] shrink-0 text-right text-base font-medium xl:block">
                            {listing.saves}
                          </span>
                          <span className="hidden w-[120px] shrink-0 text-sm text-text-muted xl:block">
                            {listing.listed}
                          </span>
                          <span className="flex w-[110px] shrink-0">
                            {listing.offers > 0 ? (
                              <Badge tone="accent">{listing.offers} waiting</Badge>
                            ) : (
                              <span className="text-sm text-text-muted">
                                {listing.status === "draft"
                                  ? "Draft"
                                  : listing.status === "sold"
                                    ? "Sold"
                                    : "None yet"}
                              </span>
                            )}
                          </span>
                        </>
                      }
                      <ChevronRightIcon
                        size={18}
                        strokeWidth={2.2}
                        className="text-text-muted transition-colors group-hover:text-text"
                      />
                    </Link>
                  ))}
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-text-muted">
                  Showing {visible.length} of {total}
                </span>
                {matching.length > PAGE && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="cursor-pointer font-bold text-secondary hover:underline"
                  >
                    {expanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
