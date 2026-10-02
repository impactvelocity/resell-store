"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import {
  categories,
  discoverOrder,
  getStore,
  listings,
  suggestedStores,
  type Category,
  type Listing,
} from "../../../lib/mock-market";
import { SiteLink } from "../links";
import { ListingCard } from "../parts";
import { DropMenu, type DropOption } from "./drop-menu";
import { StoreFollowRow } from "./store-follow-row";

type Sort = "newest" | "price-asc" | "price-desc";
type Price = "any" | "under-25" | "25-100" | "over-100";
type ShipsTo = "canada" | "us" | "anywhere";

const sortOptions: DropOption<Sort>[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
];

const priceOptions: DropOption<Price>[] = [
  { value: "any", label: "Any price" },
  { value: "under-25", label: "Under $25" },
  { value: "25-100", label: "$25 to $100" },
  { value: "over-100", label: "Over $100" },
];

const shipsOptions: DropOption<ShipsTo>[] = [
  { value: "canada", label: "Ships to Canada" },
  { value: "us", label: "Ships to United States" },
  { value: "anywhere", label: "Ships anywhere" },
];

const priceTest: Record<Price, (n: number) => boolean> = {
  any: () => true,
  "under-25": (n) => n < 25,
  "25-100": (n) => n >= 25 && n <= 100,
  "over-100": (n) => n > 100,
};

/** How many tiles show before "Show more things". */
const pageSize = 8;

/** The grid's base order: the design's eight first, then everything else. */
const ordered: Listing[] = [
  ...discoverOrder.map((slug) => listings.find((l) => l.slug === slug)!),
  ...listings.filter((l) => !discoverOrder.includes(l.slug)),
];

/** Pre-liked in the design. */
const likedByDefault = new Set(["chunky-knit-sweater"]);
const followingByDefault = new Set(["secondshutter"]);

/** P1 Marketplace: browse everything, filter by category, search via ?q=. */
export function DiscoverView({
  q,
  initialCategory,
}: {
  q: string;
  initialCategory: Category | null;
}) {
  const toast = useToast();
  const [category, setCategoryState] = useState<Category | null>(initialCategory);
  const [offersOnly, setOffersOnly] = useState(false);
  const [price, setPrice] = useState<Price>("any");
  const [shipsTo, setShipsTo] = useState<ShipsTo>("canada");
  const [sort, setSort] = useState<Sort>("newest");
  const [expanded, setExpanded] = useState(false);

  const setCategory = (next: Category | null) => {
    setCategoryState(next);
    setExpanded(false);
    // Keep ?category= in the address bar so the view is shareable
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("category", next.toLowerCase());
    else url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  };

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const found = ordered.filter((l) => {
      if (category && l.category !== category) return false;
      if (offersOnly && !l.openToOffers) return false;
      if (!priceTest[price](l.price)) return false;
      if (!needle) return true;
      const store = getStore(l.store);
      return [l.title, l.short, store?.name ?? ""].some((s) =>
        s.toLowerCase().includes(needle),
      );
    });
    if (sort === "price-asc") return [...found].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...found].sort((a, b) => b.price - a.price);
    return found;
  }, [q, category, offersOnly, price, sort]);

  const shown = expanded ? results : results.slice(0, pageSize);
  const filtered = Boolean(q || category || offersOnly || price !== "any");
  const storeCount = new Set(results.map((l) => l.store)).size;

  const notYet = (what: string) =>
    toast.add({ title: `${what} filters are coming soon.` });

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 desk:gap-8 desk:px-16 desk:pt-12 desk:pb-[72px]">
      <div className="flex flex-col gap-2 desk:flex-row desk:items-end desk:justify-between desk:gap-8">
        <h1 className="min-w-0 font-display text-3xl font-extrabold tracking-tight break-words desk:text-4xl">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : "Shop everything"}
        </h1>
        <p className="text-base text-public-text-muted desk:text-right">
          {filtered && results.length === 0
            ? "No matches yet."
            : filtered
            ? `${results.length} ${results.length === 1 ? "thing" : "things"} from ${storeCount} ${storeCount === 1 ? "store" : "stores"}.`
            : "12,480 things from 1,932 stores. New ones every few minutes."}
        </p>
      </div>

      <div
        role="group"
        aria-label="Categories"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:flex-wrap desk:overflow-visible desk:px-0"
      >
        <CategoryChip active={!category} onClick={() => setCategory(null)}>
          Everything
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </CategoryChip>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-b border-public-border pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <DropMenu
            label={
              price === "any"
                ? "Price"
                : priceOptions.find((o) => o.value === price)!.label
            }
            options={priceOptions}
            value={price}
            onChange={(v) => {
              setPrice(v);
              setExpanded(false);
            }}
          />
          <FakeDrop onClick={() => notYet("Condition")}>Condition</FakeDrop>
          <FakeDrop onClick={() => notYet("Size")}>Size</FakeDrop>
          <DropMenu
            label={shipsOptions.find((o) => o.value === shipsTo)!.label}
            options={shipsOptions}
            value={shipsTo}
            onChange={setShipsTo}
          />
          <button
            type="button"
            aria-pressed={offersOnly}
            onClick={() => {
              setOffersOnly((o) => !o);
              setExpanded(false);
            }}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              offersOnly
                ? "border-transparent bg-leaf-100 text-leaf-600"
                : "border-public-border text-text hover:bg-public-photo",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                offersOnly ? "bg-leaf-600" : "bg-public-text-muted",
              )}
            />
            Open to offers
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-public-text-muted">Sort by</span>
          <DropMenu
            label={sortOptions.find((o) => o.value === sort)!.label}
            options={sortOptions}
            value={sort}
            onChange={setSort}
            align="right"
            triggerClassName="font-semibold"
          />
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 desk:grid-cols-4 desk:gap-y-10">
          {shown.map((l) => (
            <ListingCard
              key={l.slug}
              listing={l}
              defaultLiked={likedByDefault.has(l.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="font-display text-2xl font-extrabold tracking-tight">
            {q ? <>Nothing for &ldquo;{q}&rdquo; yet</> : "Nothing here yet"}
          </p>
          <p className="max-w-sm text-base text-public-text-muted">
            {q
              ? "Try a different word, or browse everything."
              : "New things are listed every few minutes. Try fewer filters, or browse everything."}
          </p>
          <SiteLink
            href="/discover"
            onClick={() => {
              setCategory(null);
              setOffersOnly(false);
              setPrice("any");
            }}
            className="mt-2 inline-flex h-11 items-center rounded-full border border-leaf-900 px-5 text-sm font-semibold hover:bg-public-photo"
          >
            Browse everything
          </SiteLink>
        </div>
      )}

      <section className="flex flex-col gap-6 border-y border-public-border py-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight desk:text-2xl">
            Stores worth a follow
          </h2>
          <SiteLink
            href="/stores"
            className="shrink-0 text-sm font-semibold text-leaf-600 hover:underline"
          >
            See all stores
          </SiteLink>
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-12">
          {suggestedStores.map((slug) => {
            const store = getStore(slug);
            if (!store) return null;
            return (
              <StoreFollowRow
                key={slug}
                store={store}
                defaultFollowing={followingByDefault.has(slug)}
              />
            );
          })}
        </div>
      </section>

      {!expanded && results.length > pageSize && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex h-[52px] cursor-pointer items-center rounded-full border border-leaf-900 px-7 text-base font-semibold transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Show more things
          </button>
        </div>
      )}
    </main>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border px-[18px] text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        active
          ? "border-leaf-900 bg-leaf-900 text-white"
          : "border-public-border text-text hover:bg-public-photo",
      )}
    >
      {children}
    </button>
  );
}

/** Looks like a filter dropdown; the prototype doesn't have these filters yet. */
function FakeDrop({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      {children}
      <ChevronDownIcon size={14} />
    </button>
  );
}
