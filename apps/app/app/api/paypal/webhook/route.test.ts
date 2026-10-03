import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { db, eq, orders, paypalEvent } from "@repo/db";
import { resetDb } from "../../../../test/db";
import { createOrder, createSale, createUser } from "../../../../test/factories";

/*
 * POST /api/paypal/webhook, called directly: it refuses when PayPal isn't
 * set up, junk bodies and unsigned deliveries, handles genuine ones (a
 * repeat is a 200 no-op) and answers 500 so PayPal retries a failure.
 * PayPal's signature check and Next's revalidatePath are mocked.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../../lib/server/paypal", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/server/paypal")>()),
  paypalEnabled: vi.fn(() => true),
  verifyWebhook: vi.fn(async () => true),
  releaseToSeller: vi.fn(async () => ({ payoutRef: "PAYOUT-1", status: "SUCCESS" })),
  refundCapture: vi.fn(async () => ({ id: "REFUND-1", status: "COMPLETED", amountCents: null })),
}));
vi.mock("../../../../lib/server/api/webhooks", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/server/api/webhooks")>()),
  emitOrderEvent: vi.fn(),
  emitOfferEvent: vi.fn(),
}));

vi.mock("../../../../lib/server/paypal-sellers", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/server/paypal-sellers")>()),
  syncPayPalAccount: vi.fn(async () => null),
}));

const { revalidatePath } = await import("next/cache");
const sellers = await import("../../../../lib/server/paypal-sellers");
const paypal = await import("../../../../lib/server/paypal");
const { POST } = await import("./route");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

const post = (body: unknown) =>
  POST(
    new Request("http://localhost:5689/api/paypal/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "paypal-transmission-id": "T-1" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as unknown as NextRequest,
  );

describe("POST /api/paypal/webhook", () => {
  it("is a 404 when PayPal isn't set up", async () => {
    vi.mocked(paypal.paypalEnabled).mockReturnValueOnce(false);
    const res = await post({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" });
    expect(res.status).toBe(404);
    expect(paypal.verifyWebhook).not.toHaveBeenCalled();
  });

  it("refuses a body that isn't JSON or isn't a PayPal event", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ hello: "there" })).status).toBe(400);
    expect((await post({ id: "WH-1" })).status).toBe(400);
    expect(await db.select().from(paypalEvent)).toHaveLength(0);
  });

  it("refuses a delivery whose signature doesn't check out, or can't be checked", async () => {
    vi.mocked(paypal.verifyWebhook).mockResolvedValueOnce(false);
    const res = await post({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP-1" } });
    expect(res.status).toBe(401);

    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(paypal.verifyWebhook).mockRejectedValueOnce(new Error("PayPal down"));
    expect((await post({ id: "WH-2", event_type: "PAYMENT.CAPTURE.COMPLETED" })).status).toBe(401);
    errors.mockRestore();

    expect(await db.select().from(paypalEvent)).toHaveLength(0);
  });

  it("checks the signature with the request's headers and the event", async () => {
    const e = { id: "WH-3", event_type: "BILLING.PLAN.CREATED" };
    await post(e);
    const [headers, event] = vi.mocked(paypal.verifyWebhook).mock.calls[0]!;
    expect(headers.get("paypal-transmission-id")).toBe("T-1");
    expect(event).toEqual(e);
  });

  it("handles a genuine event, refreshes pages, and treats a repeat as a no-op", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { paypal: true, status: "shipped", shippedAt: new Date() });
    const e = { id: "WH-4", event_type: "PAYMENT.CAPTURE.REVERSED", resource: { id: order.paymentRef } };

    const res = await post(e);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "order reversed" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.status).toBe("refunded");

    vi.mocked(revalidatePath).mockClear();
    const again = await post(e);
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true, outcome: "duplicate" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("doesn't refresh pages for events that changed nothing", async () => {
    const ignored = await post({ id: "WH-5", event_type: "BILLING.PLAN.CREATED" });
    expect(await ignored.json()).toEqual({ ok: true, outcome: "ignored" });
    const notOurs = await post({ id: "WH-6", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP-NOPE" } });
    expect(await notOurs.json()).toEqual({ ok: true, outcome: "not ours" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 500 when handling fails so PayPal tries again", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const seller = await createUser();
    // Asking PayPal about the seller fails
    vi.mocked(sellers.syncPayPalAccount).mockRejectedValueOnce(new Error("PayPal timed out"));

    const res = await post({ id: "WH-7", event_type: "MERCHANT.ONBOARDING.COMPLETED", resource: { tracking_id: seller.id } });

    expect(res.status).toBe(500);
    const [row] = await db.select().from(paypalEvent).where(eq(paypalEvent.id, "WH-7"));
    expect(row!.processedAt).toBeNull();
    expect(row!.error).toBe("PayPal timed out");
    errors.mockRestore();
  });
});
