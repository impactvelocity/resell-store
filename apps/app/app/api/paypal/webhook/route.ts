import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { paypalEnabled, verifyWebhook } from "../../../../lib/server/paypal";
import { processPayPalEvent, type PayPalEvent } from "../../../../lib/server/paypal-webhook";

/*
 * PayPal's webhook (Developer Dashboard > your app > Webhooks, its id in
 * PAYPAL_WEBHOOK_ID). Each delivery is checked with PayPal before anything
 * is believed, then handled in lib/server/paypal-webhook.ts. A failure
 * answers 500 so PayPal tries again; a repeat answers 200.
 */
export async function POST(req: NextRequest) {
  if (!paypalEnabled()) return NextResponse.json({ error: "PayPal isn't set up" }, { status: 404 });

  let event: PayPalEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Not JSON" }, { status: 400 });
  }
  if (!event?.id || !event.event_type) return NextResponse.json({ error: "Not a PayPal event" }, { status: 400 });

  const genuine = await verifyWebhook(req.headers, event).catch((error) => {
    console.error("[paypal webhook] verify failed", error);
    return false;
  });
  if (!genuine) return NextResponse.json({ error: "Signature didn't check out" }, { status: 401 });

  try {
    const outcome = await processPayPalEvent(event);
    if (outcome !== "duplicate" && outcome !== "ignored" && outcome !== "not ours") revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    console.error("[paypal webhook]", event.event_type, event.id, error);
    return NextResponse.json({ error: "Couldn't handle it" }, { status: 500 });
  }
}
