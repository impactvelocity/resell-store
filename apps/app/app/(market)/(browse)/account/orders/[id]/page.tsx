import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerOrderView } from "../../../../../../components/after-sale/buyer-order";
import { toOrderCaseView } from "../../../../../../components/after-sale/view";
import { SignInPrompt } from "../../../../../../components/market/buyer/live-empty";
import { disputeReasons, orderCase } from "../../../../../../lib/server/disputes";
import { publicViewer } from "../../../../../../lib/server/market";
import { reviewForOrder, toOrderReview } from "../../../../../../lib/server/reviews";

export const metadata: Metadata = { title: "Your order · resell.store" };

/*
 * P8 order: one thing the buyer bought, with where it's at and what's next
 * (cancel a late one, say it's all good, or sort out a problem with the
 * seller), and once it's done, a review. Signed out, a way in; someone
 * else's order, not found.
 */
export default async function BuyerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string; review?: string }>;
}) {
  const [{ id }, { report, review: reviewParam }] = await Promise.all([params, searchParams]);
  const viewer = await publicViewer();
  if (!viewer) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 desk:px-16">
        <SignInPrompt what="account" />
      </main>
    );
  }
  const found = await orderCase(id, viewer.id);
  if (!found || found.side !== "buyer") notFound();
  const review = await reviewForOrder(found.order.id);
  return (
    <BuyerOrderView
      view={toOrderCaseView(found)}
      reasons={disputeReasons}
      reporting={report === "1"}
      review={review && toOrderReview(review)}
      reviewing={reviewParam === "1"}
    />
  );
}
