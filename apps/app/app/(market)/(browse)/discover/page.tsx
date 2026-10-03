import { LiveDiscoverView } from "../../../../components/market/discover/live-discover";
import { followStates } from "../../../../lib/server/follows";
import {
  listStores,
  marketCounts,
  parseCategory,
  priceBuckets,
  searchListings,
  publicViewer,
  sortOrders,
} from "../../../../lib/server/market";
import { siteShare } from "../../../../lib/og";
import { withRatings } from "../../../../lib/server/reviews";

export const metadata = siteShare(
  "/discover",
  "Shop the marketplace · resell.store",
  "Second-hand things from real people's stores. Make an offer, chat with the seller, and PayPal holds your money until it arrives.",
);

/** Tiles per page before "Show more things". */
const pageSize = 16;

type Params = Record<"q" | "category" | "price" | "offers" | "sort", string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function pick<T extends string>(options: readonly T[], value: string | undefined, fallback: T): T {
  return options.find((o) => o === value) ?? fallback;
}

/**
 * P1 Marketplace. `?q=` comes from the header search, `?category=` from the
 * chips; `?price=`, `?offers=1` and `?sort=` from the filter row.
 */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().slice(0, 200) ?? "";
  const filters = {
    q,
    category: parseCategory(one(params.category)),
    price: pick(priceBuckets, one(params.price), "any"),
    offers: one(params.offers) === "1",
    sort: pick(sortOrders, one(params.sort), q ? "best" : "newest"),
  };
  // "Best match" only means something with a query
  if (!q && filters.sort === "best") filters.sort = "newest";

  const [results, counts, stores, viewer] = await Promise.all([
    searchListings({ ...filters, limit: pageSize }),
    marketCounts(),
    listStores({ limit: 3 }).then(withRatings),
    publicViewer(),
  ]);
  const suggested = stores.filter((s) => s.forSale > 0);
  const follows = await followStates(viewer?.id, suggested.map((s) => s.slug));

  return (
    <LiveDiscoverView
      // A new search or filter starts a fresh list (and drops pages loaded by "Show more")
      key={JSON.stringify(filters)}
      filters={filters}
      initial={results}
      counts={counts}
      suggested={suggested}
      follows={follows}
      pageSize={pageSize}
    />
  );
}
