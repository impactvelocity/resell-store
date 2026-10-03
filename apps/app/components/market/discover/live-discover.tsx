"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@repo/ui/lib/utils";
import { useToast } from "@repo/ui/toast";
import { loadMoreListings } from "../../../app/actions/market";
import {
  categories,
  type Category,
  type PublicListing,
  type PublicStore,
} from "../../../lib/mock-market";
import { EmptyState } from "../../empty-state";
import { SiteLink } from "../links";
import { ListingCard, pillLink } from "../parts";
import { CategoryChip, FakeDrop, priceOptions, sortOptions } from "./discover-view";
import { DropMenu, type DropOption } from "./drop-menu";
import type { FollowLive } from "./follow-button";
import { StoreFollowRow } from "./store-follow-row";

type Price = "any" | "under-25" | "25-100" | "over-100";
type Sort = "best" | "newest" | "price-asc" | "price-desc";

export type DiscoverFilters = {
  q: string;
  category: Category | null;
  price: Price;
  offers: boolean;
  sort: Sort;
};

const searchSorts: DropOption<Sort>[] = [{ value: "best", label: "Best match" }, ...sortOptions];

/** The address for a set of filters, leaving defaults out so links stay short. */
function discoverHref(f: DiscoverFilters) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category.toLowerCase());
  if (f.price !== "any") params.set("price", f.price);
  if (f.offers) params.set("offers", "1");
  if (f.sort !== (f.q ? "best" : "newest")) params.set("sort", f.sort);
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * P1 with real listings. Filters live in the URL: changing one asks the server
 * for fresh results (search, filters and sort all run in Postgres), and "Show
 * more things" fetches the next page. Follows save; likes stay local for now.
 */
export function LiveDiscoverView({
  filters,
  initial,
  counts,
  suggested,
  follows,
  pageSize,
}: {
  filters: DiscoverFilters;
  initial: { listings: PublicListing[]; total: number; stores: number };
  /** Everything listed right now, for the unfiltered header line. */
  counts: { things: number; stores: number };
  suggested: PublicStore[];
  /** Follow buttons for the suggested stores, by slug */
  follows?: Record<string, FollowLive>;
  pageSize: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [loadingMore, startLoadingMore] = useTransition();
  const [listings, setListings] = useState(initial.listings);

  const { q, category, price, offers, sort } = filters;
  const filtered = Boolean(q || category || offers || price !== "any");
  const hasMore = listings.length < initial.total;

  const go = (patch: Partial<DiscoverFilters>) => {
    startTransition(() => {
      router.replace(discoverHref({ ...filters, ...patch }), { scroll: false });
    });
  };

  const showMore = () => {
    startLoadingMore(async () => {
      try {
        const next = await loadMoreListings({
          q,
          category,
          price,
          offers,
          sort,
          offset: listings.length,
          limit: pageSize,
        });
        setListings((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...next.listings.filter((l) => !seen.has(l.id))];
        });
      } catch {
        toast.add({ title: "Couldn't load more just now. Try again in a moment." });
      }
    });
  };

  const notYet = (what: string) => toast.add({ title: `${what} filters are coming soon.` });

  // Nothing listed anywhere yet: no point offering filters
  if (counts.things === 0 && !filtered) {
    return (
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 desk:gap-8 desk:px-16 desk:pt-12 desk:pb-[72px]">
        <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-4xl">
          Shop everything
        </h1>
        <EmptyState
          surface="public"
          size="lg"
          art="seedling"
          sticker="Just opened"
          tone="leaf"
          title="The first shops are opening"
          actions={
            <SiteLink href="/welcome" className={pillLink.primary}>
              Open a shop
            </SiteLink>
          }
          footnote="Opening a shop is free. Your agent helps with the photos, the price and the words."
        >
          resell.store is brand new, so the shelves are still empty. Got something good you no
          longer use? Your shop could be one of the first things people find here.
        </EmptyState>
      </main>
    );
  }

  return (
    <main
      aria-busy={pending}
      className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 desk:gap-8 desk:px-16 desk:pt-12 desk:pb-[72px]"
    >
      <div className="flex flex-col gap-2 desk:flex-row desk:items-end desk:justify-between desk:gap-8">
        <h1 className="min-w-0 font-display text-3xl font-extrabold tracking-tight break-words desk:text-4xl">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : "Shop everything"}
        </h1>
        <p className="text-base text-public-text-muted desk:text-right">
          {filtered && initial.total === 0
            ? "No matches yet."
            : filtered
              ? `${plural(initial.total, "thing", "things")} from ${plural(initial.stores, "store", "stores")}.`
              : `${plural(counts.things, "thing", "things")} from ${plural(counts.stores, "store", "stores")}.`}
        </p>
      </div>

      <div
        role="group"
        aria-label="Categories"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:flex-wrap desk:overflow-visible desk:px-0"
      >
        <CategoryChip active={!category} onClick={() => go({ category: null })}>
          Everything
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => go({ category: category === c ? null : c })}
          >
            {c}
          </CategoryChip>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-b border-public-border pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <DropMenu
            label={price === "any" ? "Price" : priceOptions.find((o) => o.value === price)!.label}
            options={priceOptions}
            value={price}
            onChange={(v) => go({ price: v })}
          />
          <FakeDrop onClick={() => notYet("Condition")}>Condition</FakeDrop>
          <FakeDrop onClick={() => notYet("Size")}>Size</FakeDrop>
          <button
            type="button"
            aria-pressed={offers}
            onClick={() => go({ offers: !offers })}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              offers
                ? "border-transparent bg-leaf-100 text-leaf-600"
                : "border-public-border text-text hover:bg-public-photo",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                offers ? "bg-leaf-600" : "bg-public-text-muted",
              )}
            />
            Open to offers
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-public-text-muted">Sort by</span>
          <DropMenu
            label={(q ? searchSorts : sortOptions).find((o) => o.value === sort)?.label ?? "Newest first"}
            options={q ? searchSorts : (sortOptions as DropOption<Sort>[])}
            value={sort}
            onChange={(v) => go({ sort: v })}
            align="right"
            triggerClassName="font-semibold"
          />
        </div>
      </div>

      {listings.length > 0 ? (
        <div
          className={cn(
            "grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity md:grid-cols-3 md:gap-x-6 desk:grid-cols-4 desk:gap-y-10",
            pending && "opacity-60",
          )}
        >
          {listings.map((l) => (
            <ListingCard key={l.id ?? `${l.store}/${l.slug}`} listing={l} />
          ))}
        </div>
      ) : (
        <EmptyState
          surface="public"
          art="garden"
          sticker="Not yet"
          title={q ? <>Nothing for &ldquo;{q}&rdquo; yet</> : "Nothing here yet"}
          actions={
            <SiteLink href="/discover" className={pillLink.outline}>
              Browse everything
            </SiteLink>
          }
        >
          {q
            ? "Try a different word, or fewer filters. New things are listed all the time."
            : "Nothing matches these filters right now. Try fewer, or browse everything."}
        </EmptyState>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={showMore}
            disabled={loadingMore}
            className="inline-flex h-[52px] cursor-pointer items-center rounded-full border border-leaf-900 px-7 text-base font-semibold transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? "Finding more…" : "Show more things"}
          </button>
        </div>
      )}

      {suggested.length > 0 && (
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
            {suggested.map((store) => (
              <StoreFollowRow key={store.slug} store={store} follow={follows?.[store.slug]} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
