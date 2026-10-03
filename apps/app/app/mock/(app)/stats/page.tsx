import { StatsView } from "../../../../components/shops/stats-view";
import { statsByShop } from "../../../../lib/mock-shops";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string | string[] }>;
}) {
  const { shop } = await searchParams;
  const slug = typeof shop === "string" && shop in statsByShop ? shop : "mayas-closet";
  return <StatsView key={slug} selected={slug} />;
}
