import { revalidatePath } from "next/cache";
import { NextResponse, after, type NextRequest } from "next/server";
import { db, eq, checkout } from "@repo/db";
import { CommerceError, finishCheckout } from "../../../../../lib/server/commerce";
import { notifySold } from "../../../../../lib/server/notify";
import { notifyOrderPlaced } from "../../../../../lib/server/notify-after-sale";
import { getCurrentUser } from "../../../../../lib/server/session";
import { siteUrl } from "../../../../../lib/urls";

/*
 * Where PayPal sends the buyer after they approve (?token=<PayPal order id>).
 * Captures the payment and places the order, then back to checkout, which
 * shows the paid state. Failures go back to checkout with the reason.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(siteUrl("/account"));

  const viewer = await getCurrentUser();
  try {
    const { order, listingId } = await finishCheckout({ providerOrderId: token, viewerId: viewer?.id ?? null });
    if (order)
      after(async () => {
        await notifySold(order.id);
        await notifyOrderPlaced(order.id);
      });
    revalidatePath("/", "layout");
    return NextResponse.redirect(siteUrl(`/checkout/${listingId}`));
  } catch (error) {
    const message =
      error instanceof CommerceError ? error.message : "Something went wrong with PayPal. Nothing was charged.";
    if (!(error instanceof CommerceError)) console.error("PayPal return failed", error);
    const [started] = await db
      .select({ listingId: checkout.listingId })
      .from(checkout)
      .where(eq(checkout.providerOrderId, token));
    if (!started) return NextResponse.redirect(siteUrl("/account"));
    const url = new URL(siteUrl(`/checkout/${started.listingId}`));
    url.searchParams.set("paypal", "failed");
    url.searchParams.set("reason", message);
    return NextResponse.redirect(url);
  }
}
