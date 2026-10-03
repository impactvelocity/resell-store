import { Suspense } from "react";
import { HomeScreen } from "../../../components/home/home-screen";
import { payoutTotals, sellerTasks } from "../../../components/seller-live/data";
import { listFollowedShops } from "../../../lib/server/follows";
import { requireUser } from "../../../lib/server/session";
import {
  draftStepLabel,
  latestDraft,
  listOwnedShops,
  shopPicture,
  toShopCard,
} from "../../../lib/server/shops";

/*
 * A3/A4 Home with the person's real shops, offers to answer and sales to ship,
 * and (buying) the shops they follow.
 */
export default async function Page() {
  const user = await requireUser();
  const [shops, draft, tasks, followed] = await Promise.all([
    listOwnedShops(user.id),
    latestDraft(user.id),
    sellerTasks(user.id),
    listFollowedShops(user.id),
  ]);
  const totals = payoutTotals(tasks.orders);
  return (
    <Suspense>
      <HomeScreen
        live={{
          defaultMode: user.preferredMode ?? "selling",
          shops: shops.map((s) => ({ ...toShopCard(s), picture: shopPicture(s) })),
          totalListings: shops.reduce((n, s) => n + s.live + s.drafts + s.sold, 0),
          draft: draft && {
            name: draft.title ?? draft.name ?? "Untitled draft",
            shopName: draft.shopName,
            stepLabel: draftStepLabel[draft.step],
            href: `/list/${draft.id}/${draft.step}`,
          },
          tasks: {
            offer: tasks.toAnswer[0] ?? null,
            openOffers: tasks.toAnswer.length,
            ship: tasks.toShip[0] ?? null,
            toShip: tasks.toShip.length,
            earnings: totals.sales
              ? { totalCents: totals.heldCents + totals.releasedCents, sales: totals.sales }
              : null,
            // sellerTasks already reads every offer and order, so "ever" costs nothing extra
            everOffered: tasks.offers.length > 0,
            everSold: tasks.orders.length > 0,
          },
          followed,
        }}
      />
    </Suspense>
  );
}
