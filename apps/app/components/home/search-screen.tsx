"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { ItemCard } from "@repo/ui/item-card";
import { cn } from "@repo/ui/lib/utils";
import { SearchField } from "@repo/ui/search-field";
import { useToast } from "@repo/ui/toast";
import { loadMoreListings } from "../../app/actions/market";
import { shopItems, type ShopItem } from "../../lib/mock-home";
import { categories as marketCategories, type PublicListing } from "../../lib/mock-market";
import { storeUrl } from "../../lib/urls";
import { EmptyState } from "../empty-state";
import { ListingImage } from "../market/parts";
import { BellButton, MobileTopBar, Page, PageHeader } from "../shell/page";
import { ItemGrid } from "./parts";

/*
 * Search (tab bar). Not designed: the A4 search field and item cards,
 * filtering the things in shops you follow.
 */

const categories = ["Everything", "Clothes", "Home", "Records"] as const;
type Category = (typeof categories)[number];

function matches(item: ShopItem, query: string, category: Category) {
  if (category !== "Everything" && item.category !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.title, item.meta, item.shop, item.category].some((text) =>
    text.toLowerCase().includes(q),
  );
}

export function SearchScreen() {
  const router = useRouter();
  const initialQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  // A new ?q= from elsewhere (e.g. a shop avatar on Home) replaces the text
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  if (initialQuery !== seenQuery) {
    setSeenQuery(initialQuery);
    setQuery(initialQuery);
  }
  const [category, setCategory] = useState<Category>("Everything");
  const results = shopItems.filter((item) => matches(item, query, category));

  function updateUrl(value: string) {
    const v = value.trim();
    router.replace(v ? `/search?q=${encodeURIComponent(v)}` : "/search", {
      scroll: false,
    });
  }

  const field = (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        updateUrl(query);
      }}
    >
      <SearchField
        placeholder="Search shops and things"
        value={query}
        autoFocus={!initialQuery}
        onChange={(event) => setQuery(event.target.value)}
        containerClassName="desk:h-14 desk:gap-3 desk:px-[22px]"
      />
    </form>
  );

  const chips = (
    <ChipGroup
      aria-label="Category"
      value={[category]}
      onValueChange={(value) => setCategory((value[0] as Category) ?? "Everything")}
      className="flex-nowrap overflow-x-auto [scrollbar-width:none] desk:flex-wrap"
    >
      {categories.map((c) => (
        <Chip key={c} value={c}>
          {c}
        </Chip>
      ))}
    </ChipGroup>
  );

  const body =
    results.length > 0 ? (
      <div className="flex flex-col gap-3 desk:gap-4">
        <p className="px-1 text-sm font-medium text-text-muted desk:px-0">
          {query.trim()
            ? `${results.length} ${results.length === 1 ? "thing matches" : "things match"} “${query.trim()}”`
            : `${results.length} ${results.length === 1 ? "thing" : "things"} from shops you follow`}
        </p>
        <ItemGrid items={results} className="desk:grid-cols-3 xl:grid-cols-4" />
      </div>
    ) : (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
        <p className="font-display text-xl font-extrabold tracking-[-0.02em]">
          Nothing matches yet
        </p>
        <p className="max-w-sm text-base text-text-muted">
          None of the shops you follow have that right now. Try another word or
          look at everything.
        </p>
        <Button
          variant="soft"
          size="md"
          onClick={() => {
            setQuery("");
            setCategory("Everything");
            updateUrl("");
          }}
        >
          Clear search
        </Button>
      </div>
    );

  return (
    <>
      {/* Phone */}
      <div className="flex flex-col desk:hidden">
        <MobileTopBar />
        <div className="flex flex-col gap-4 px-4 pt-5">
          <h1 className="px-1 font-display text-3xl font-extrabold tracking-tight">
            Search
          </h1>
          {field}
          <div className="-mx-4 px-4">{chips}</div>
          {body}
        </div>
      </div>

      {/* Desktop */}
      <Page className="hidden desk:flex desk:gap-6">
        <PageHeader
          title="Search"
          description="Things for sale in the shops you follow."
          actions={<BellButton size="lg" />}
        />
        {field}
        {chips}
        {body}
      </Page>
    </>
  );
}

/* Live search: the same hybrid search as the marketplace's /discover. */

const liveCategories = ["Everything", ...marketCategories] as const;

function searchHref(q: string, category: string | null) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (category) params.set("category", category.toLowerCase());
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** A search result card, linking to the listing on its store. */
function ResultCard({ listing }: { listing: PublicListing }) {
  const seller = listing.seller?.name;
  return (
    <ItemCard
      title={
        <a
          href={storeUrl(listing.store, `/${listing.slug}`)}
          // The whole card is the link; the heart sits above it
          className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-secondary"
        >
          {listing.title}
        </a>
      }
      meta={[listing.short, seller].filter(Boolean).join(" · ")}
      price={`$${listing.price.toLocaleString("en-US")}`}
      image={<ListingImage photo={listing.photo} alt="" />}
      className="relative min-w-0 gap-2.5 [&_button]:z-10 [&>div:first-child]:h-[196px]"
    />
  );
}

/**
 * A-series Search with real listings. Typing updates ?q= after a short pause and
 * the server runs the search; chips set ?category=; "Show more" pages on.
 */
export function LiveSearchScreen({
  query: initialQuery,
  category,
  results,
  pageSize,
}: {
  query: string;
  category: string | null;
  results: { listings: PublicListing[]; total: number };
  pageSize: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [listings, setListings] = useState(results.listings);
  // Fresh results from the server (a new search) replace any pages loaded by "Show more"
  const [seenResults, setSeenResults] = useState(results);
  if (results !== seenResults) {
    setSeenResults(results);
    setListings(results.listings);
  }
  // A new ?q= from elsewhere (e.g. a link) replaces the text; our own updates don't,
  // so a slow response never overwrites what's been typed since
  const [pushed, setPushed] = useState<string | null>(null);
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  if (initialQuery !== seenQuery) {
    setSeenQuery(initialQuery);
    if (initialQuery !== pushed) setQuery(initialQuery);
  }
  const [pending, startTransition] = useTransition();
  const [loadingMore, startLoadingMore] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  function go(q: string, c: string | null) {
    if (debounce.current) clearTimeout(debounce.current);
    setPushed(q.trim());
    startTransition(() => router.replace(searchHref(q, c), { scroll: false }));
  }

  function type(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go(value, category), 350);
  }

  function showMore() {
    startLoadingMore(async () => {
      try {
        const next = await loadMoreListings({
          q: initialQuery,
          category,
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
  }

  const searching = Boolean(initialQuery || category);
  const q = initialQuery.trim();

  const field = (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(query, category);
      }}
    >
      <SearchField
        placeholder="Search things and stores"
        value={query}
        autoFocus={!initialQuery}
        onChange={(event) => type(event.target.value)}
        containerClassName="desk:h-14 desk:gap-3 desk:px-[22px]"
      />
    </form>
  );

  const chips = (
    <ChipGroup
      aria-label="Category"
      value={[category ?? "Everything"]}
      onValueChange={(value) => {
        const next = (value[0] as string | undefined) ?? "Everything";
        go(query, next === "Everything" ? null : next);
      }}
      className="flex-nowrap overflow-x-auto [scrollbar-width:none] desk:flex-wrap"
    >
      {liveCategories.map((c) => (
        <Chip key={c} value={c}>
          {c}
        </Chip>
      ))}
    </ChipGroup>
  );

  const body =
    listings.length > 0 ? (
      <div className={cn("flex flex-col gap-3 transition-opacity desk:gap-4", pending && "opacity-60")}>
        <p className="px-1 text-sm font-medium text-text-muted desk:px-0">
          {q
            ? `${results.total} ${results.total === 1 ? "thing matches" : "things match"} “${q}”`
            : `${results.total} ${results.total === 1 ? "thing" : "things"} for sale`}
        </p>
        <div className="grid grid-cols-2 gap-3 desk:grid-cols-3 desk:gap-4 xl:grid-cols-4">
          {listings.map((l) => (
            <ResultCard key={l.id ?? `${l.store}/${l.slug}`} listing={l} />
          ))}
        </div>
        {listings.length < results.total && (
          <div className="flex justify-center pt-3">
            <Button variant="soft" size="md" onClick={showMore} disabled={loadingMore}>
              {loadingMore ? "Finding more…" : "Show more"}
            </Button>
          </div>
        )}
      </div>
    ) : searching ? (
      <EmptyState
        art="garden"
        sticker="Not yet"
        title="Nothing matches yet"
        actions={
          <Button
            variant="soft"
            size="md"
            onClick={() => {
              setQuery("");
              go("", null);
            }}
          >
            Clear search
          </Button>
        }
        className="rounded-xl border border-border bg-surface"
      >
        Nobody&apos;s selling that right now. Try another word, or look at everything.
      </EmptyState>
    ) : (
      <EmptyState
        art="seedling"
        sticker="Just opened"
        tone="leaf"
        title="The shelves are still filling up"
        actions={
          <Button variant="primary" size="md" render={<Link href="/home" />} nativeButton={false}>
            Back to home
          </Button>
        }
        className="rounded-xl border border-border bg-surface"
      >
        resell.store just opened, so there&apos;s nothing to search yet. Things show up here the
        moment they&apos;re listed.
      </EmptyState>
    );

  return (
    <>
      {/* Phone */}
      <div className="flex flex-col desk:hidden">
        <MobileTopBar />
        <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
          <h1 className="px-1 font-display text-3xl font-extrabold tracking-tight">Search</h1>
          {field}
          <div className="-mx-4 px-4">{chips}</div>
          {body}
        </div>
      </div>

      {/* Desktop */}
      <Page className="hidden desk:flex desk:gap-6">
        <PageHeader
          title="Search"
          description="Things for sale across resell.store."
          actions={<BellButton size="lg" />}
        />
        {field}
        {chips}
        {body}
      </Page>
    </>
  );
}
