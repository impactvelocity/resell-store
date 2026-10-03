import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { db, eq, orders } from "@repo/db";
import { resetDb } from "../../../../test/db";
import { createOffer, createOrder, createSale, daysAgo } from "../../../../test/factories";
import { clearEmails } from "../../../../test/mail";

/*
 * POST /api/cron/sweep, called directly: it needs the CRON_SECRET bearer
 * token outside development, then runs every sweep once and reports the
 * counts. PayPal and Next's revalidatePath are mocked.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../../lib/server/paypal", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/server/paypal")>()),
  releaseToSeller: vi.fn(async () => ({ payoutRef: "PAYOUT-1", status: "SUCCESS" })),
  refundCapture: vi.fn(async () => ({ id: "REFUND-1", status: "COMPLETED", amountCents: null })),
}));
vi.mock("../../../../lib/server/api/webhooks", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/server/api/webhooks")>()),
  emitOrderEvent: vi.fn(),
  emitOfferEvent: vi.fn(),
}));

const { revalidatePath } = await import("next/cache");
const paypal = await import("../../../../lib/server/paypal");
const { POST } = await import("./route");

beforeEach(async () => {
  await resetDb();
  clearEmails();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const post = (authorization?: string) =>
  POST(
    new Request("http://localhost:5689/api/cron/sweep", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }) as unknown as NextRequest,
  );

const nothing = { offersExpired: 0, offerReminders: 0, shipReminders: 0, cancelled: 0, arrivalChecks: 0, released: 0, escalated: 0, followDigests: 0, agentSummaries: 0, reviewRequests: 0, webhooks: { retried: 0, delivered: 0, gaveUp: 0, turnedOff: 0, activityPruned: 0 } };

describe("POST /api/cron/sweep", () => {
  it("refuses without the cron secret", async () => {
    const sale = await createSale();
    const order = await createOrder(sale, { createdAt: daysAgo(8) });

    expect((await post()).status).toBe(401);
    expect((await post("Bearer wrong")).status).toBe(401);
    expect((await post("test-cron-secret")).status).toBe(401);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row!.status).toBe("paid");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses everyone when no secret is configured outside development", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await post("Bearer ")).status).toBe(401);
    expect((await post("Bearer test-cron-secret")).status).toBe(401);
  });

  it("runs every sweep with the secret and reports what it did", async () => {
    const s1 = await createSale();
    await createOffer(s1, { expiresAt: new Date(Date.now() - 1000) });
    const s2 = await createSale();
    const late = await createOrder(s2, { paypal: true, createdAt: daysAgo(8) });
    const s3 = await createSale();
    await createOrder(s3, { paypal: true, createdAt: daysAgo(15), status: "shipped", shippedAt: daysAgo(14) });

    const res = await post("Bearer test-cron-secret");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ...nothing, offersExpired: 1, cancelled: 1, released: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(paypal.refundCapture).toHaveBeenCalledWith(expect.objectContaining({ requestId: `cancel-${late.id}`, amountCents: null }));
    expect(paypal.releaseToSeller).toHaveBeenCalledTimes(1);
  });

  it("runs without a secret in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ...nothing });
  });
});
