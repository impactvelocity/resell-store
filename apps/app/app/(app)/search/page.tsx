import { LiveSearchScreen } from "../../../components/home/search-screen";
import { parseCategory, searchListings } from "../../../lib/server/market";

const pageSize = 24;

/** Search (tab bar): everything for sale on resell.store, same search as /discover. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 200) ?? "";
  const category = parseCategory(Array.isArray(params.category) ? params.category[0] : params.category);
  const results = await searchListings({ q, category, limit: pageSize });

  return (
    <LiveSearchScreen
      query={q}
      category={category}
      results={results}
      pageSize={pageSize}
    />
  );
}
