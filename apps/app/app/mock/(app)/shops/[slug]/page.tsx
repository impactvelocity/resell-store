import { notFound } from "next/navigation";
import { ShopListings } from "../../../../../components/shops/shop-listings";
import { findShop, getShopData } from "../../../../../lib/mock-shops";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = findShop(slug);
  const data = getShopData(slug);
  if (!shop || !data) notFound();
  return <ShopListings key={shop.slug} shop={shop} data={data} />;
}
