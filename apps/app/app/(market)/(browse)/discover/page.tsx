import { DiscoverView } from "../../../../components/market/discover/discover-view";
import { categories } from "../../../../lib/mock-market";

/** P1 Marketplace. `?q=` comes from the header search, `?category=` from the chips. */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const category =
    categories.find((c) => c.toLowerCase() === raw?.toLowerCase()) ?? null;

  // Remount on a new search so filters start fresh
  return <DiscoverView key={q} q={q} initialCategory={category} />;
}
