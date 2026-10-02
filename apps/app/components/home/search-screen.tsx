"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { SearchField } from "@repo/ui/search-field";
import { shopItems, type ShopItem } from "../../lib/mock-home";
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
