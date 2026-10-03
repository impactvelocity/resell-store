import { notFound } from "next/navigation";
import { ShopSettings } from "../../../../../../components/shops/shop-settings";
import { findShop } from "../../../../../../lib/mock-shops";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = findShop(slug);
  if (!shop) notFound();
  return <ShopSettings key={shop.slug} shop={shop} />;
}
