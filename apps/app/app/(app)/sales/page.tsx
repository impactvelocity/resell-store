import type { Metadata } from "next";
import { SalesEmpty } from "../../../components/empty/sales-empty";
import { getSellerSummary } from "../../../components/empty/summary";
import { payoutTotals, sellerOrders } from "../../../components/seller-live/data";
import { SalesLive } from "../../../components/seller-live/sales-live";
import { getPayPalAccount, paypalEnabled, readiness } from "../../../lib/server/paypal-sellers";
import { requireUser } from "../../../lib/server/session";

export const metadata: Metadata = { title: "Sales and payouts · resell.store" };

/* B5 Sales and payouts: real orders, or the empty state before the first. */
export default async function Page() {
  const user = await requireUser();
  const [orders, account] = await Promise.all([sellerOrders(user.id), getPayPalAccount(user.id)]);
  const paypal = !paypalEnabled() ? "off" : readiness(account) === "ready" ? "connected" : "connect";
  if (!orders.length) return <SalesEmpty seller={await getSellerSummary()} paypal={paypal} />;
  const { heldCents, releasedCents } = payoutTotals(orders);
  return <SalesLive orders={orders} heldCents={heldCents} releasedCents={releasedCents} paypal={paypal} />;
}
