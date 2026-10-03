import type { Metadata } from "next";
import { StatsEmpty } from "../../../components/empty/stats-empty";
import { getSellerSummary } from "../../../components/empty/summary";
import { StatsView } from "../../../components/shops/stats-view";
import { requireUser } from "../../../lib/server/session";
import { listOwnedShops } from "../../../lib/server/shops";
import { sellerStats } from "../../../lib/server/stats";

export const metadata: Metadata = { title: "Stats · resell.store" };

/*
 * B4 Stats: money, views, likes, shares, followers, offers and sales, by period
 * and by shop (?shop=<slug>, or all). Before anything has ever gone live,
 * the empty state.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  if (!shops.some((s) => s.live > 0 || s.sold > 0)) return <StatsEmpty seller={await getSellerSummary()} />;
  const wanted = (await searchParams).shop;
  const selected = wanted && shops.some((s) => s.slug === wanted) ? wanted : "all";
  const byPeriod = await sellerStats(user.id, selected);
  return (
    <StatsView
      key={selected}
      selected={selected}
      live={{ shops: shops.map((s) => ({ slug: s.slug, name: s.name })), byPeriod }}
    />
  );
}
