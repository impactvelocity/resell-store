import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, paypalAccount } from "@repo/db";
import { resetDb } from "../../test/db";
import { createUser } from "../../test/factories";

/*
 * Linking a seller's PayPal from "Log in with PayPal" (paypal-sellers.ts).
 * PayPal itself is mocked: who signed in, and whether that account is
 * connected to us.
 */

vi.mock("./paypal", async (orig) => ({
  ...(await orig<typeof import("./paypal")>()),
  paypalEnabled: () => true,
  demoSellerId: () => null,
  paypalLoginProfile: vi.fn(async () => ({ payerId: "MERCHANT9", email: "maya@test.dev" })),
  sellerByMerchantId: vi.fn(async (merchantId: string) => ({
    merchantId,
    paymentsReceivable: true,
    emailConfirmed: true,
    permissions: ["partnerfee", "delay-funds-disbursement"],
  })),
  sellerByTrackingId: vi.fn(async () => null),
}));

const paypal = await import("./paypal");
const sellers = await import("./paypal-sellers");

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

describe("linkFromPayPalLogin", () => {
  it("links a PayPal that's already connected to us", async () => {
    const maya = await createUser();
    const row = await sellers.linkFromPayPalLogin(maya.id, "user-token");
    expect(paypal.paypalLoginProfile).toHaveBeenCalledWith("user-token");
    expect(row).toMatchObject({ userId: maya.id, merchantId: "MERCHANT9", demo: false });
    expect(sellers.readiness(row)).toBe("ready");
  });

  it("leaves it to Connections when that PayPal never connected", async () => {
    vi.mocked(paypal.sellerByMerchantId).mockResolvedValueOnce(null);
    const maya = await createUser();
    expect(await sellers.linkFromPayPalLogin(maya.id, "user-token")).toBeNull();
    expect(await db.select().from(paypalAccount)).toEqual([]);
  });

  it("does nothing without a payer id", async () => {
    vi.mocked(paypal.paypalLoginProfile).mockResolvedValueOnce({ payerId: null, email: "maya@test.dev" });
    const maya = await createUser();
    expect(await sellers.linkFromPayPalLogin(maya.id, "user-token")).toBeNull();
    expect(paypal.sellerByMerchantId).not.toHaveBeenCalled();
  });

  it("keeps a PayPal they already linked", async () => {
    const maya = await createUser();
    await db.insert(paypalAccount).values({ userId: maya.id, merchantId: "OTHER1", demo: true });
    expect(await sellers.linkFromPayPalLogin(maya.id, "user-token")).toBeNull();
    expect(paypal.paypalLoginProfile).not.toHaveBeenCalled();
  });
});

describe("syncPayPalAccount", () => {
  it("checks a PayPal linked from sign-in by its merchant id", async () => {
    const maya = await createUser();
    await sellers.linkFromPayPalLogin(maya.id, "user-token");
    vi.mocked(paypal.sellerByMerchantId).mockClear();
    const row = await sellers.syncPayPalAccount(maya.id);
    expect(paypal.sellerByTrackingId).toHaveBeenCalledWith(maya.id);
    expect(paypal.sellerByMerchantId).toHaveBeenCalledWith("MERCHANT9");
    expect(row?.merchantId).toBe("MERCHANT9");
  });
});
