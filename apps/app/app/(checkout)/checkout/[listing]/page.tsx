import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "../../../../components/market/checkout/checkout-form";
import { CheckoutHeader } from "../../../../components/market/checkout/checkout-header";
import { CheckoutNotice } from "../../../../components/market/checkout/notice";
import { agreedCents, lastShipTo } from "../../../../lib/server/commerce";
import { demoShipTo } from "../../../../lib/server/demo";
import { paypalEnabled, paypalSandbox, sandboxLogin } from "../../../../lib/server/paypal";
import { toDollars } from "../../../../lib/money";
import { loadForBuying } from "../../load";

export const metadata: Metadata = { title: "Checkout · resell.store" };

/**
 * P4 (desktop) and P10 (phone): buying one listing. Live listings are linked by id.
 * Paying goes through PayPal and comes back here (?paypal=cancelled or failed
 * when it didn't work). Without PayPal keys it's a test: the order is real, no
 * money moves.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ listing: string }>;
  searchParams: Promise<{ paypal?: string; reason?: string }>;
}) {
  const found = await loadForBuying((await params).listing);
  if (!found) notFound();
  const { listing, store, viewer, order, offer } = found;
  const payments = paypalEnabled() ? "paypal" : "test";
  const back = await searchParams;
  const backNotice =
    back.paypal === "cancelled"
      ? "You left PayPal before paying. Nothing was charged."
      : back.paypal === "failed"
        ? (back.reason?.slice(0, 200) ?? "PayPal couldn't take the payment. Nothing was charged.")
        : null;

  const notice = (kind: "signin-buy" | "own" | "sold") => (
    <CheckoutNotice
      kind={kind}
      listing={listing}
      store={store}
      asking={found.asking}
      shipping={found.shipping.tracked}
      sold={found.sold}
    />
  );

  let body: React.ReactNode;
  // Bought it already: back here after paying, or later from a link
  if (viewer && order) {
    body = (
      <CheckoutForm
        listing={listing}
        store={store}
        live={{
          listingId: found.row.id,
          asking: found.asking,
          offer: null,
          shipping: found.shipping,
          shipTo: order.shipTo,
          name: viewer.name,
          paid: {
            item: toDollars(order.itemCents)!,
            total: toDollars(order.totalCents)!,
            delivery: order.delivery,
            method: order.payMethod,
          },
          payments: order.paymentProvider === "paypal" ? "paypal" : "test",
        }}
      />
    );
  } else if (found.isOwner) body = notice("own");
  else if (found.sold) body = notice("sold");
  else if (!viewer) body = notice("signin-buy");
  else {
    const accepted = offer?.status === "accepted" ? offer : null;
    body = (
      <CheckoutForm
        listing={listing}
        store={store}
        live={{
          listingId: found.row.id,
          asking: found.asking,
          offer: accepted && { id: accepted.id, amount: toDollars(agreedCents(accepted))! },
          shipping: found.shipping,
          // Their last address; in the demo, a made-up one so they can go straight to paying
          shipTo: (await lastShipTo(viewer.id)) ?? demoShipTo(viewer.name),
          name: viewer.name,
          paid: null,
          payments,
          notice: backNotice,
          sandbox: paypalSandbox() ? { buyer: sandboxLogin("buyer") } : null,
        }}
      />
    );
  }

  return (
    <>
      {/* A sold listing's page is gone for everyone but its owner: back to the store instead */}
      <CheckoutHeader
        store={listing.store}
        listing={found.sold && !found.isOwner ? "" : listing.slug}
        title="Checkout"
      />
      <main>{body}</main>
    </>
  );
}
