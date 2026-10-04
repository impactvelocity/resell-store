import { afterEach, describe, expect, it, vi } from "vitest";
import { db, paypalEvent } from "@repo/db";
import { resetDb } from "../../test/db";

/*
 * The PayPal REST client, with fetch mocked: nothing reaches PayPal. The module
 * reads its env at import time, so each test stubs the env and imports a fresh
 * copy (load()). Covers the switches (enabled/sandbox/demo seller), the token
 * cache, the headers every call carries, error parsing, and how each call's
 * body is built and its answer read.
 */

type Reply = { status?: number; body?: unknown };
type Call = { url: string; method: string; headers: Record<string, string>; body: any };

const keys = {
  PAYPAL_CLIENT_ID: "client-abc",
  PAYPAL_CLIENT_SECRET: "secret-xyz",
  PAYPAL_PARTNER_MERCHANT_ID: "PARTNER1",
};

let calls: Call[] = [];
let tokenFetches = 0;

/** Answers the token endpoint itself; everything else goes to `reply`. */
function mockFetch(reply: (call: Call) => Reply = () => ({ body: {} }), token = { access_token: "tok-1", expires_in: 3600 }) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const call: Call = {
      url,
      method: String(init.method),
      headers: init.headers as Record<string, string>,
      body: typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init.body,
    };
    if (url.endsWith("/v1/oauth2/token")) {
      tokenFetches++;
      return new Response(JSON.stringify(token), { status: 200 });
    }
    calls.push(call);
    const { status = 200, body } = reply(call);
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function load(env: Record<string, string> = {}) {
  for (const [k, v] of Object.entries({ ...keys, ...env })) vi.stubEnv(k, v);
  vi.resetModules();
  return import("./paypal");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  calls = [];
  tokenFetches = 0;
});

const approved = { id: "ORDER-1", links: [{ rel: "self", href: "x" }, { rel: "payer-action", href: "https://paypal.test/approve" }] };

const orderInput = {
  reference: "chk-1",
  itemName: "Linen wrap dress",
  itemCents: 10_000,
  shippingCents: 900,
  platformFeeCents: 1000,
  payeeMerchantId: "SELLER1",
  method: "paypal" as const,
  returnUrl: "http://localhost:5689/return",
  cancelUrl: "http://localhost:5689/cancel",
};

describe("switches", () => {
  it("is enabled only with the client id, secret and partner id", async () => {
    expect((await load()).paypalEnabled()).toBe(true);
    expect((await load({ PAYPAL_PARTNER_MERCHANT_ID: "" })).paypalEnabled()).toBe(false);
    expect((await load({ PAYPAL_CLIENT_SECRET: "" })).paypalEnabled()).toBe(false);
    expect((await load({ PAYPAL_CLIENT_ID: "" })).paypalEnabled()).toBe(false);
  });

  it("is sandbox unless PAYPAL_ENV=live, and only when enabled", async () => {
    expect((await load()).paypalSandbox()).toBe(true);
    expect((await load({ PAYPAL_ENV: "live" })).paypalSandbox()).toBe(false);
    expect((await load({ PAYPAL_CLIENT_ID: "" })).paypalSandbox()).toBe(false);
  });

  it("has a demo seller only in sandbox", async () => {
    expect((await load({ PAYPAL_DEMO_SELLER_ID: "DEMO1" })).demoSellerId()).toBe("DEMO1");
    expect((await load({ PAYPAL_DEMO_SELLER_ID: "" })).demoSellerId()).toBeNull();
    expect((await load({ PAYPAL_DEMO_SELLER_ID: "DEMO1", PAYPAL_ENV: "live" })).demoSellerId()).toBeNull();
  });

  it("gives the shared sandbox logins only when both halves are set, never live", async () => {
    const env = {
      PAYPAL_DEMO_SELLER_EMAIL: "seller@sandbox.test",
      PAYPAL_DEMO_SELLER_PASSWORD: "pw-seller",
      PAYPAL_DEMO_BUYER_EMAIL: "buyer@sandbox.test",
      PAYPAL_DEMO_BUYER_PASSWORD: "",
    };
    const p = await load(env);
    expect(p.sandboxLogin("seller")).toEqual({ email: "seller@sandbox.test", password: "pw-seller" });
    expect(p.sandboxLogin("buyer")).toBeNull();
    expect((await load({ ...env, PAYPAL_ENV: "live" })).sandboxLogin("seller")).toBeNull();
  });
});

describe("signing in and headers", () => {
  it("fetches a token with basic auth and reuses it until shortly before it expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetch = mockFetch(() => ({ body: approved }));
    const p = await load();

    await p.createOrder(orderInput);
    await p.createOrder(orderInput);
    expect(tokenFetches).toBe(1);
    const tokenCall = fetch.mock.calls.find(([url]) => String(url).endsWith("/v1/oauth2/token"))!;
    expect(tokenCall[0]).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    const init = tokenCall[1] as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe("POST");
    expect(init.body).toBe("grant_type=client_credentials");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("client-abc:secret-xyz").toString("base64")}`);

    // Refreshed a minute early: 3600s token, so after 3540s it's fetched again
    vi.advanceTimersByTime(3539_000);
    await p.createOrder(orderInput);
    expect(tokenFetches).toBe(1);
    vi.advanceTimersByTime(2_000);
    await p.createOrder(orderInput);
    expect(tokenFetches).toBe(2);
  });

  it("uses the live host with PAYPAL_ENV=live", async () => {
    mockFetch(() => ({ body: approved }));
    const p = await load({ PAYPAL_ENV: "live" });
    await p.createOrder(orderInput);
    expect(calls[0]!.url).toBe("https://api-m.paypal.com/v2/checkout/orders");
  });

  it("throws a PayPalError when signing in fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const p = await load();
    const error = await p.createOrder(orderInput).catch((e) => e);
    expect(error).toBeInstanceOf(p.PayPalError);
    expect(error.status).toBe(401);
  });

  it("sends the bearer token, a request id, and the BN code when set", async () => {
    mockFetch(() => ({ body: approved }));
    const p = await load({ PAYPAL_BN_CODE: "RESELL_BN" });
    await p.createOrder(orderInput);
    const h = calls[0]!.headers;
    expect(h.Authorization).toBe("Bearer tok-1");
    expect(h["Content-Type"]).toBe("application/json");
    expect(h.Prefer).toBe("return=representation");
    expect(h["PayPal-Request-Id"]).toBe("order-chk-1");
    expect(h["PayPal-Partner-Attribution-Id"]).toBe("RESELL_BN");
    expect(h["PayPal-Auth-Assertion"]).toBeUndefined();
  });

  it("leaves the BN code off when it isn't set", async () => {
    mockFetch(() => ({ body: approved }));
    const p = await load({ PAYPAL_BN_CODE: "" });
    await p.createOrder(orderInput);
    expect(calls[0]!.headers["PayPal-Partner-Attribution-Id"]).toBeUndefined();
  });
});

describe("errors", () => {
  it("reads PayPal's issue, description and debug id", async () => {
    mockFetch(() => ({
      status: 422,
      body: {
        name: "UNPROCESSABLE_ENTITY",
        message: "The requested action could not be performed.",
        debug_id: "dbg-123",
        details: [{ issue: "INSTRUMENT_DECLINED", description: "The instrument was declined." }],
      },
    }));
    const p = await load();
    const error = await p.captureOrder("ORDER-1", "capture-1").catch((e) => e);
    expect(error).toBeInstanceOf(p.PayPalError);
    expect(error.status).toBe(422);
    expect(error.issue).toBe("INSTRUMENT_DECLINED");
    expect(error.message).toBe("The instrument was declined.");
    expect(error.debugId).toBe("dbg-123");
  });

  it("falls back to the error name and message without details", async () => {
    mockFetch(() => ({ status: 400, body: { name: "INVALID_REQUEST", message: "Bad request", debug_id: "dbg-9" } }));
    const p = await load();
    const error = await p.captureOrder("ORDER-1", "capture-1").catch((e) => e);
    expect(error.issue).toBe("INVALID_REQUEST");
    expect(error.message).toBe("Bad request");
  });

  it("keeps a refused call in paypal_event, since PayPal sends no webhook for it", async () => {
    await resetDb();
    const body = { name: "UNPROCESSABLE_ENTITY", debug_id: "dbg-7", details: [{ issue: "PAYEE_NOT_CONSENTED" }] };
    mockFetch(() => ({ status: 422, body }));
    const p = await load();
    await p.captureOrder("ORDER-1", "capture-1").catch(() => null);
    const rows = await db.select().from(paypalEvent);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "API_ERROR",
      resourceId: "/v2/checkout/orders/ORDER-1/capture",
      error: "PAYEE_NOT_CONSENTED",
      payload: { method: "POST", status: 422, issue: "PAYEE_NOT_CONSENTED", debugId: "dbg-7", response: body },
    });
    expect(rows[0]!.processedAt).not.toBeNull();
  });

  it("doesn't keep a lookup that just found nothing", async () => {
    await resetDb();
    mockFetch(() => ({ status: 404, body: { name: "RESOURCE_NOT_FOUND" } }));
    const p = await load();
    expect(await p.sellerByMerchantId("NOBODY")).toBeNull();
    expect(await db.select().from(paypalEvent)).toHaveLength(0);
  });

  it("has a generic message when the error body isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/token")
          ? new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }))
          : new Response("<html>oops</html>", { status: 500 }),
      ),
    );
    const p = await load();
    const error = await p.captureOrder("ORDER-1", "capture-1").catch((e) => e);
    expect(error).toBeInstanceOf(p.PayPalError);
    expect(error.status).toBe(500);
    expect(error.issue).toBeUndefined();
    expect(error.message).toBe("PayPal POST /v2/checkout/orders/ORDER-1/capture failed");
  });
});

describe("createOrder", () => {
  it("pays the seller, takes our fee, holds the money and returns the approve link", async () => {
    mockFetch(() => ({ body: approved }));
    const p = await load();
    const result = await p.createOrder(orderInput);

    expect(result).toEqual({ id: "ORDER-1", approveUrl: "https://paypal.test/approve" });
    const { url, method, body } = calls[0]!;
    expect(method).toBe("POST");
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(body.intent).toBe("CAPTURE");
    const unit = body.purchase_units[0];
    expect(unit.reference_id).toBe("chk-1");
    expect(unit.custom_id).toBe("chk-1");
    expect(unit.amount).toEqual({
      currency_code: "USD",
      value: "109.00",
      breakdown: {
        item_total: { currency_code: "USD", value: "100.00" },
        shipping: { currency_code: "USD", value: "9.00" },
      },
    });
    expect(unit.items[0]).toMatchObject({ name: "Linen wrap dress", quantity: "1", unit_amount: { value: "100.00" } });
    expect(unit.payee).toEqual({ merchant_id: "SELLER1" });
    expect(unit.payment_instruction).toEqual({
      disbursement_mode: "DELAYED",
      platform_fees: [{ amount: { currency_code: "USD", value: "10.00" } }],
    });
    const ctx = body.payment_source.paypal.experience_context;
    expect(ctx.landing_page).toBe("LOGIN");
    expect(ctx.shipping_preference).toBe("NO_SHIPPING");
    expect(ctx.return_url).toBe(orderInput.returnUrl);
    expect(ctx.cancel_url).toBe(orderInput.cancelUrl);
  });

  it("sends no platform fee on a free sale, and opens the guest card form for cards", async () => {
    mockFetch(() => ({ body: { id: "ORDER-2", links: [{ rel: "approve", href: "https://paypal.test/a2" }] } }));
    const p = await load();
    const result = await p.createOrder({ ...orderInput, platformFeeCents: 0, method: "card" });
    expect(result.approveUrl).toBe("https://paypal.test/a2");
    const body = calls[0]!.body;
    expect(body.purchase_units[0].payment_instruction).toEqual({ disbursement_mode: "DELAYED" });
    expect(body.payment_source.paypal.experience_context.landing_page).toBe("GUEST_CHECKOUT");
  });

  it("cuts long item names to PayPal's 127 characters", async () => {
    mockFetch(() => ({ body: approved }));
    const p = await load();
    await p.createOrder({ ...orderInput, itemName: "x".repeat(200) });
    expect(calls[0]!.body.purchase_units[0].description).toHaveLength(127);
    expect(calls[0]!.body.purchase_units[0].items[0].name).toHaveLength(127);
  });

  it("throws when PayPal returns no payment link", async () => {
    mockFetch(() => ({ body: { id: "ORDER-3", links: [{ rel: "self", href: "x" }] } }));
    const p = await load();
    await expect(p.createOrder(orderInput)).rejects.toThrow("didn't return a payment link");
  });
});

describe("captureOrder", () => {
  it("reads the capture, PayPal's fee, our fees and the seller's net", async () => {
    mockFetch(() => ({
      body: {
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "CAP-1",
                  status: "COMPLETED",
                  amount: { value: "109.00" },
                  seller_receivable_breakdown: {
                    paypal_fee: { value: "4.29" },
                    platform_fees: [{ amount: { value: "10.00" } }, { amount: { value: "0.50" } }],
                    net_amount: { value: "94.21" },
                  },
                },
              ],
            },
          },
        ],
      },
    }));
    const p = await load();
    const capture = await p.captureOrder("ORDER-1", "capture-chk-1");
    expect(capture).toEqual({
      id: "CAP-1",
      status: "COMPLETED",
      totalCents: 10_900,
      paypalFeeCents: 429,
      platformFeeCents: 1050,
      sellerNetCents: 9421,
    });
    expect(calls[0]!.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-1/capture");
    expect(calls[0]!.headers["PayPal-Request-Id"]).toBe("capture-chk-1");
    expect(calls[0]!.body).toBeUndefined();
  });

  it("gives nulls when there's no fee breakdown yet (pending)", async () => {
    mockFetch(() => ({
      body: { purchase_units: [{ payments: { captures: [{ id: "CAP-2", status: "PENDING", amount: { value: "50.00" } }] } }] },
    }));
    const p = await load();
    expect(await p.captureOrder("ORDER-1", "r")).toEqual({
      id: "CAP-2",
      status: "PENDING",
      totalCents: 5000,
      paypalFeeCents: null,
      platformFeeCents: null,
      sellerNetCents: null,
    });
  });

  it("throws when nothing was captured", async () => {
    mockFetch(() => ({ body: { status: "COMPLETED", purchase_units: [{}] } }));
    const p = await load();
    await expect(p.captureOrder("ORDER-1", "r")).rejects.toThrow("didn't capture");
  });
});

describe("releaseToSeller", () => {
  it("asks for a referenced payout of the capture, retry-safe", async () => {
    mockFetch(() => ({ body: { item: { item_id: "PAYOUT-1", processing_state: { status: "SUCCESS" } } } }));
    const p = await load();
    expect(await p.releaseToSeller("CAP-1")).toEqual({ payoutRef: "PAYOUT-1", status: "SUCCESS" });
    expect(calls[0]!.url).toBe("https://api-m.sandbox.paypal.com/v1/payments/referenced-payouts-items");
    expect(calls[0]!.headers["PayPal-Request-Id"]).toBe("release-CAP-1");
    expect(calls[0]!.body).toEqual({ reference_id: "CAP-1", reference_type: "TRANSACTION_ID" });
  });

  it("is pending with no ref when PayPal hasn't said yet", async () => {
    mockFetch(() => ({ body: {} }));
    const p = await load();
    expect(await p.releaseToSeller("CAP-1")).toEqual({ payoutRef: null, status: "PENDING" });
  });

  it("throws when PayPal says the release FAILED", async () => {
    mockFetch(() => ({ body: { item: { item_id: "P", processing_state: { status: "FAILED", reason: "ACCOUNT_RESTRICTED" } } } }));
    const p = await load();
    const error = await p.releaseToSeller("CAP-1").catch((e) => e);
    expect(error).toBeInstanceOf(p.PayPalError);
    expect(error.issue).toBe("ACCOUNT_RESTRICTED");
    expect(error.message).toContain("ACCOUNT_RESTRICTED");
  });
});

describe("refundCapture", () => {
  const decode = (assertion: string) => {
    const [head, payload, sig] = assertion.split(".");
    return {
      head: JSON.parse(Buffer.from(head!, "base64url").toString()),
      payload: JSON.parse(Buffer.from(payload!, "base64url").toString()),
      sig,
    };
  };

  it("refunds all of it, acting as the seller", async () => {
    mockFetch(() => ({ body: { id: "REF-1", status: "COMPLETED", amount: { value: "109.00" } } }));
    const p = await load();
    const result = await p.refundCapture({ captureId: "CAP-1", sellerMerchantId: "SELLER1", reason: "Sorry!" });

    expect(result).toEqual({ id: "REF-1", status: "COMPLETED", amountCents: 10_900 });
    const { url, headers, body } = calls[0]!;
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/payments/captures/CAP-1/refund");
    expect(headers["PayPal-Request-Id"]).toBe("refund-CAP-1");
    expect(body).toEqual({ note_to_payer: "Sorry!" });
    const assertion = decode(headers["PayPal-Auth-Assertion"]!);
    expect(assertion.head).toEqual({ alg: "none" });
    expect(assertion.payload).toEqual({ iss: "client-abc", payer_id: "SELLER1" });
    expect(assertion.sig).toBe("");
    expect(headers["PayPal-Auth-Assertion"]).not.toMatch(/[+/=]/);
  });

  it("refunds part of it with its own request id", async () => {
    mockFetch(() => ({ body: { id: "REF-2", status: "COMPLETED", amount: { value: "25.50" } } }));
    const p = await load();
    const result = await p.refundCapture({
      captureId: "CAP-1",
      sellerMerchantId: "SELLER1",
      reason: "r".repeat(300),
      amountCents: 2550,
      requestId: "refund-dispute-7",
    });
    expect(result.amountCents).toBe(2550);
    expect(calls[0]!.headers["PayPal-Request-Id"]).toBe("refund-dispute-7");
    expect(calls[0]!.body.amount).toEqual({ currency_code: "USD", value: "25.50" });
    expect(calls[0]!.body.note_to_payer).toHaveLength(255);
  });

  it("sends no amount when amountCents is null, and gives a null amount back when PayPal leaves it off", async () => {
    mockFetch(() => ({ body: { id: "REF-3", status: "PENDING" } }));
    const p = await load();
    const result = await p.refundCapture({ captureId: "CAP-1", sellerMerchantId: "S", reason: "x", amountCents: null });
    expect(calls[0]!.body).toEqual({ note_to_payer: "x" });
    expect(result).toEqual({ id: "REF-3", status: "PENDING", amountCents: null });
  });
});

describe("verifyWebhook", () => {
  const signed = () =>
    new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
      "paypal-transmission-id": "tx-1",
      "paypal-transmission-sig": "sig",
      "paypal-transmission-time": "2026-10-03T10:00:00Z",
    });
  const event = { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" };

  it("is false without PAYPAL_WEBHOOK_ID, without asking PayPal", async () => {
    const fetch = mockFetch(() => ({ body: { verification_status: "SUCCESS" } }));
    const p = await load({ PAYPAL_WEBHOOK_ID: "" });
    expect(await p.verifyWebhook(signed(), event)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is false when a signature header is missing", async () => {
    const fetch = mockFetch(() => ({ body: { verification_status: "SUCCESS" } }));
    const p = await load({ PAYPAL_WEBHOOK_ID: "WH-ID" });
    for (const name of p.WEBHOOK_HEADERS) {
      const headers = signed();
      headers.delete(name);
      expect(await p.verifyWebhook(headers, event)).toBe(false);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks PayPal with the headers, our webhook id and the event, and is true on SUCCESS", async () => {
    mockFetch(() => ({ body: { verification_status: "SUCCESS" } }));
    const p = await load({ PAYPAL_WEBHOOK_ID: "WH-ID" });
    expect(await p.verifyWebhook(signed(), event)).toBe(true);
    expect(calls[0]!.url).toBe("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature");
    expect(calls[0]!.body).toEqual({
      auth_algo: "SHA256withRSA",
      cert_url: "https://api.sandbox.paypal.com/cert",
      transmission_id: "tx-1",
      transmission_sig: "sig",
      transmission_time: "2026-10-03T10:00:00Z",
      webhook_id: "WH-ID",
      webhook_event: event,
    });
  });

  it("is false when PayPal says FAILURE", async () => {
    mockFetch(() => ({ body: { verification_status: "FAILURE" } }));
    const p = await load({ PAYPAL_WEBHOOK_ID: "WH-ID" });
    expect(await p.verifyWebhook(signed(), event)).toBe(false);
  });
});

describe("connected sellers", () => {
  const integration = {
    merchant_id: "SELLER1",
    payments_receivable: true,
    primary_email_confirmed: false,
    oauth_integrations: [
      {
        oauth_third_party: [
          {
            scopes: [
              "https://uri.paypal.com/services/payments/realtimepayment",
              "https://uri.paypal.com/services/payments/partnerfee",
              "https://uri.paypal.com/services/payments/delay-funds-disbursement",
              "https://uri.paypal.com/services/payments/refund",
            ],
          },
          { scopes: ["https://uri.paypal.com/services/payments/refund", "https://uri.paypal.com/services/disputes/read-seller"] },
        ],
      },
    ],
  };

  it("looks a seller up by merchant id and tidies the permission names", async () => {
    mockFetch(() => ({ body: integration }));
    const p = await load();
    expect(await p.sellerByMerchantId("SELLER1")).toEqual({
      merchantId: "SELLER1",
      paymentsReceivable: true,
      emailConfirmed: false,
      permissions: ["realtimepayment", "partnerfee", "delay-funds-disbursement", "refund", "disputes/read-seller"],
    });
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.url).toBe("https://api-m.sandbox.paypal.com/v1/customer/partners/PARTNER1/merchant-integrations/SELLER1");
    expect(calls[0]!.body).toBeUndefined();
  });

  it("treats missing flags and integrations as false and empty", async () => {
    mockFetch(() => ({ body: { merchant_id: "SELLER2" } }));
    const p = await load();
    expect(await p.sellerByMerchantId("SELLER2")).toEqual({
      merchantId: "SELLER2",
      paymentsReceivable: false,
      emailConfirmed: false,
      permissions: [],
    });
  });

  it("is null for a merchant who never connected (404), and rethrows other errors", async () => {
    mockFetch(() => ({ status: 404, body: { name: "RESOURCE_NOT_FOUND" } }));
    let p = await load();
    expect(await p.sellerByMerchantId("NOPE")).toBeNull();

    mockFetch(() => ({ status: 500, body: { name: "INTERNAL_SERVER_ERROR" } }));
    p = await load();
    await expect(p.sellerByMerchantId("X")).rejects.toBeInstanceOf(p.PayPalError);
  });

  it("finds a seller by tracking id, then reads their details", async () => {
    mockFetch(({ url }) => (url.includes("tracking_id=") ? { body: { merchant_id: "SELLER1" } } : { body: integration }));
    const p = await load();
    const seller = await p.sellerByTrackingId("user 1&x");
    expect(seller?.merchantId).toBe("SELLER1");
    expect(calls[0]!.url).toBe(
      "https://api-m.sandbox.paypal.com/v1/customer/partners/PARTNER1/merchant-integrations?tracking_id=user%201%26x",
    );
    expect(calls[1]!.url).toContain("/merchant-integrations/SELLER1");
  });

  it("is null by tracking id when they haven't finished signing up", async () => {
    mockFetch(() => ({ status: 404, body: {} }));
    let p = await load();
    expect(await p.sellerByTrackingId("user_1")).toBeNull();

    calls = [];
    mockFetch(() => ({ body: {} }));
    p = await load();
    expect(await p.sellerByTrackingId("user_1")).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("makes a sign-up link asking for payments, refunds, our fee and held funds", async () => {
    mockFetch(() => ({ body: { links: [{ rel: "self", href: "x" }, { rel: "action_url", href: "https://paypal.test/signup" }] } }));
    const p = await load();
    expect(await p.createSellerSignupLink({ trackingId: "user_1", returnUrl: "http://localhost:5689/back" })).toBe(
      "https://paypal.test/signup",
    );
    const body = calls[0]!.body;
    expect(body.tracking_id).toBe("user_1");
    expect(body.partner_config_override).toEqual({ return_url: "http://localhost:5689/back" });
    expect(body.operations[0].api_integration_preference.rest_api_integration.third_party_details.features).toEqual([
      "PAYMENT",
      "REFUND",
      "PARTNER_FEE",
      "DELAY_FUNDS_DISBURSEMENT",
    ]);
    expect(body).not.toHaveProperty("email");
  });

  it("fills in the seller's email on PayPal's first screen", async () => {
    mockFetch(() => ({ body: { links: [{ rel: "action_url", href: "https://paypal.test/signup" }] } }));
    const p = await load();
    await p.createSellerSignupLink({ trackingId: "user_1", returnUrl: "http://localhost:5689/back", email: "maya@test.dev" });
    expect(calls[0]!.body.email).toBe("maya@test.dev");
  });

  it("reads who signed in with PayPal using their own token", async () => {
    mockFetch(() => ({
      body: { payer_id: "MERCHANT9", emails: [{ value: "old@test.dev" }, { value: "maya@test.dev", primary: true }] },
    }));
    const p = await load();
    expect(await p.paypalLoginProfile("user-token")).toEqual({ payerId: "MERCHANT9", email: "maya@test.dev" });
    expect(calls[0]!.url).toBe("https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1");
    expect(calls[0]!.headers.Authorization).toBe("Bearer user-token");
    expect(tokenFetches).toBe(0);
  });

  it("has no payer id when the app doesn't share it", async () => {
    mockFetch(() => ({ body: { email: "maya@test.dev" } }));
    const p = await load();
    expect(await p.paypalLoginProfile("user-token")).toEqual({ payerId: null, email: "maya@test.dev" });
  });
});
