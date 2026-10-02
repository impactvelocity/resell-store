"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { ChevronDownIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { SearchField } from "@repo/ui/search-field";
import { useToast } from "@repo/ui/toast";
import type { Listing, Review, SoldItem, Store } from "../../../lib/mock-market";
import { ListingCard } from "../parts";
import { sectionCounts } from "./store-data";
import { EmptyLine, ReviewList, SectionHeader, SoldGrid } from "./store-sections";

type Tab = "sale" | "sold" | "reviews";
type Sort = "newest" | "low" | "high";

const UNDER = 25;

/**
 * Everything under a store's intro: For sale / Sold / Reviews tabs, the search,
 * sort and section chips that filter the grid, then recent sales and reviews.
 */
export function StoreShelves({
  store,
  listings,
  sold,
  reviews,
}: {
  store: Store;
  listings: Listing[];
  sold: SoldItem[];
  reviews: Review[];
}) {
  const [tab, setTab] = useState<Tab>("sale");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [section, setSection] = useState("all");
  const tabsRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const chips = useMemo(() => sectionChips(store, listings), [store, listings]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listings.filter(
      (l) =>
        (section === "all" ||
          (section === "under" ? l.price < UNDER : l.section === section)) &&
        (!q || `${l.title} ${l.short} ${l.section ?? ""}`.toLowerCase().includes(q)),
    );
    if (sort === "low") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [listings, query, section, sort]);

  function openTab(next: Tab) {
    setTab(next);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showAll() {
    if (section !== "all" || query) {
      setSection("all");
      setQuery("");
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      toast.add({ title: `More from ${store.name} is on its way.` });
    }
  }

  return (
    <>
      <section className="flex flex-col gap-6">
        <div
          ref={tabsRef}
          className="flex scroll-mt-6 flex-col gap-4 desk:flex-row desk:items-end desk:justify-between desk:gap-8 desk:border-b desk:border-public-border"
        >
          <StoreTabs
            tab={tab}
            onChange={setTab}
            counts={{ sale: store.forSale, sold: store.sold, reviews: store.ratings }}
          />
          {tab === "sale" && (
            <div className="flex items-center gap-5 desk:pb-3">
              <SearchField
                aria-label={`Search ${store.name}`}
                placeholder={`Search ${store.name}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                containerClassName="h-10 min-w-0 flex-1 gap-2 border-0 bg-public-photo px-3.5 text-text desk:w-[260px] desk:flex-none [&_svg]:size-4"
                className="text-sm placeholder:text-public-text-muted"
              />
              <SortSelect value={sort} onChange={setSort} />
            </div>
          )}
        </div>

        <div role="tabpanel" id={`store-panel-${tab}`} aria-labelledby={`store-tab-${tab}`}>
          {tab === "sale" && (
            <div className="flex flex-col gap-8">
              {chips.length > 1 && (
                <ChipGroup
                  aria-label="Sections"
                  value={[section]}
                  onValueChange={(v) => setSection((v[0] as string | undefined) ?? "all")}
                  className="-mx-4 flex-nowrap overflow-x-auto px-4 [scrollbar-width:none] desk:mx-0 desk:flex-wrap desk:px-0"
                >
                  {chips.map((c) => (
                    <Chip
                      key={c.value}
                      value={c.value}
                      className="border border-public-border bg-public-background hover:bg-public-photo data-pressed:border-leaf-900 data-pressed:bg-leaf-900 data-pressed:text-white"
                    >
                      {c.label}
                    </Chip>
                  ))}
                </ChipGroup>
              )}

              {shown.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 desk:grid-cols-4 desk:gap-x-6 desk:gap-y-10">
                  {shown.map((l) => (
                    <ListingCard key={l.slug} listing={l} showStore={false} />
                  ))}
                </div>
              ) : (
                <EmptyLine>
                  Nothing here matches{query ? ` "${query.trim()}"` : ""}.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSection("all");
                    }}
                    className="cursor-pointer font-semibold text-leaf-600 hover:underline"
                  >
                    Show everything
                  </button>
                </EmptyLine>
              )}
            </div>
          )}

          {tab === "sold" &&
            (sold.length > 0 ? (
              <SoldGrid items={sold} />
            ) : (
              <EmptyLine>Things {store.owner} has sold will show up here.</EmptyLine>
            ))}

          {tab === "reviews" &&
            (reviews.length > 0 ? (
              <ReviewList reviews={reviews} className="pt-2" />
            ) : (
              <EmptyLine>Reviews from {store.owner}&apos;s buyers will show up here.</EmptyLine>
            ))}
        </div>
      </section>

      {tab === "sale" && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={showAll}
            className="inline-flex h-[52px] cursor-pointer items-center rounded-full border border-leaf-900 px-7 text-base font-semibold transition-colors outline-none hover:bg-public-photo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Show all {store.forSale} things
          </button>
        </div>
      )}

      {tab !== "sold" && sold.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-public-border pt-10">
          <SectionHeader
            title="Went to new homes"
            aside={`What ${store.owner} sold lately, and what it went for.`}
            action={`See all ${store.sold} sold`}
            onAction={() => openTab("sold")}
          />
          <SoldGrid items={sold} />
        </section>
      )}

      {tab !== "reviews" && reviews.length > 0 && (
        <section className="flex flex-col gap-7 border-t border-public-border pt-10">
          <SectionHeader
            title="What buyers say"
            aside={`${store.rating.toFixed(1)} out of 5 from ${store.ratings} buyers. Only people who bought can review.`}
            action={`Read all ${store.ratings}`}
            onAction={() => openTab("reviews")}
          />
          <ReviewList reviews={reviews} />
        </section>
      )}
    </>
  );
}

/** Chips for the sections a store sorts its things into, plus a price chip. */
function sectionChips(store: Store, listings: Listing[]) {
  const known = sectionCounts[store.slug] ?? {};
  const names = [
    ...new Set([...Object.keys(known), ...listings.flatMap((l) => (l.section ? [l.section] : []))]),
  ];
  const chips = [{ value: "all", label: `All ${store.forSale}` }];
  for (const name of names) {
    const count = known[name] ?? listings.filter((l) => l.section === name).length;
    chips.push({ value: name, label: `${name} ${count}` });
  }
  if (listings.some((l) => l.price < UNDER)) {
    chips.push({ value: "under", label: `Under $${UNDER}` });
  }
  return chips;
}

const tabs: { value: Tab; label: string }[] = [
  { value: "sale", label: "For sale" },
  { value: "sold", label: "Sold" },
  { value: "reviews", label: "Reviews" },
];

/** Underlined text tabs with counts. Arrow keys move between them. */
function StoreTabs({
  tab,
  onChange,
  counts,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  counts: Record<Tab, number>;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.value === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next]!.value);
    document.getElementById(`store-tab-${tabs[next]!.value}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Store"
      onKeyDown={onKeyDown}
      className="flex items-end gap-6 border-b border-public-border sm:gap-8 desk:border-b-0"
    >
      {tabs.map((t) => {
        const active = t.value === tab;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`store-tab-${t.value}`}
            aria-selected={active}
            aria-controls={`store-panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex cursor-pointer items-baseline gap-2 text-lg outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              active
                ? "border-b-[3px] border-leaf-900 pb-3.5 font-bold"
                : "pb-[17px] font-medium text-public-text-muted hover:text-text",
            )}
          >
            {t.label}
            <span className="text-sm font-normal text-public-text-muted">{counts[t.value]}</span>
          </button>
        );
      })}
    </div>
  );
}

const sorts: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "low", label: "Price, low to high" },
  { value: "high", label: "Price, high to low" },
];

/** "Sort by Newest first ⌄": a native select dressed as text. */
function SortSelect({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const id = useId();
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <label htmlFor={id} className="text-public-text-muted">
        Sort by
      </label>
      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as Sort)}
          className="cursor-pointer appearance-none rounded-sm bg-transparent pr-4 [field-sizing:content] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={14}
          strokeWidth={2.4}
          className="pointer-events-none absolute right-0"
        />
      </div>
    </div>
  );
}
