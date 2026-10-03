import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerOrderView } from "../../../../components/after-sale/seller-order";
import { toOrderCaseView } from "../../../../components/after-sale/view";
import { sellerOrders } from "../../../../components/seller-live/data";
import { orderCase } from "../../../../lib/server/disputes";
import { reviewForOrder, toOrderReview } from "../../../../lib/server/reviews";
import { requireUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "Sale · resell.store" };

/*
 * B5 sale: one order on one of the seller's shops. Ship it or call it off,
 * and sort out a problem the buyer reported. Anyone else's order, not found.
 */
export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const found = await orderCase(id, user.id);
  if (!found || found.side !== "seller") notFound();
  // The list row too: the ship form takes the seller's order shape
  const order = (await sellerOrders(user.id)).find((o) => o.id === id);
  if (!order) notFound();
  const review = await reviewForOrder(id);
  return <SellerOrderView view={toOrderCaseView(found)} order={order} review={review && toOrderReview(review)} />;
}
