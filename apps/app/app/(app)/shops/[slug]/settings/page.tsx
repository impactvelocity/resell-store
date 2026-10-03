import { notFound } from "next/navigation";
import { ShopSettings } from "../../../../../components/shops/shop-settings";
import { requireUser } from "../../../../../lib/server/session";
import { listOwnedShops, shopPicture, toShopCard } from "../../../../../lib/server/shops";

/* B3 Shop settings: the signed-in owner's shop, or 404. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const row = (await listOwnedShops(user.id)).find((s) => s.slug === slug);
  if (!row) notFound();
  return (
    <ShopSettings
      key={row.slug}
      shop={toShopCard(row)}
      live={{
        about: row.about ?? "",
        answerQuestions: row.answerQuestions,
        haggle: row.haggle,
        lowestPercent: row.lowestPercent,
        askHold: row.askHold,
        picture: shopPicture(row),
        paused: row.paused,
      }}
    />
  );
}
