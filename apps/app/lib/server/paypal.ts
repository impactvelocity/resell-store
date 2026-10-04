import "server-only";
import { db, paypalEvent } from "@repo/db";

/*
 * PayPal REST, multiparty (we're the platform, sellers are connected merchants).
 * Only what the marketplace uses: seller onboarding, orders with a platform fee
 * and delayed disbursement (the escrow), capture, release and refund.
 *
 * Sandbox unless PAYPAL_ENV=live. Every call carries the BN code so PayPal
 * attributes it to the platform.
 */

const live = process.env.PAYPAL_ENV === "live";
const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const clientId = process.env.PAYPAL_CLIENT_ID ?? "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID ?? "";
const bnCode = process.env.PAYPAL_BN_CODE;

/** Checkout runs through PayPal once the platform's keys are set; otherwise it's a test checkout. */
export function paypalEnabled() {
  return !!(clientId && clientSecret && partnerId);
}

/**
 * Sandbox only: where money goes when a seller hasn't connected PayPal, so
 * seeded shops can still sell in a demo. Never used live.
 */
export function demoSellerId() {
  return live ? null : process.env.PAYPAL_DEMO_SELLER_ID || null;
}

/** PayPal's test system: no real money moves, and only sandbox logins work. */
export function paypalSandbox() {
  return paypalEnabled() && !live;
}

export type SandboxLogin = { email: string; password: string };

/**
 * Sandbox only: the shared PayPal test logins anyone trying the demo can use.
 * The seller one is the demo seller's (PAYPAL_DEMO_SELLER_ID), to watch sales land.
 */
export function sandboxLogin(who: "seller" | "buyer"): SandboxLogin | null {
  if (live) return null;
  const [email, password] =
    who === "seller"
      ? [process.env.PAYPAL_DEMO_SELLER_EMAIL, process.env.PAYPAL_DEMO_SELLER_PASSWORD]
      : [process.env.PAYPAL_DEMO_BUYER_EMAIL, process.env.PAYPAL_DEMO_BUYER_PASSWORD];
  return email && password ? { email, password } : null;
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** PayPal's issue code, e.g. INSTRUMENT_DECLINED, ORDER_NOT_APPROVED. */
    readonly issue?: string,
    readonly debugId?: string,
  ) {
    super(message);
  }
}

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now()) return token.value;
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new PayPalError("PayPal sign-in failed. Check PAYPAL_CLIENT_ID and SECRET.", res.status);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early
  token = { value: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 };
  return token.value;
}

/** Acting for a seller (refunds): PayPal's unsigned JWT naming us and them. */
function authAssertion(merchantId: string) {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "none" })}.${part({ iss: clientId, payer_id: merchantId })}.`;
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; requestId?: string; asSeller?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (bnCode) headers["PayPal-Partner-Attribution-Id"] = bnCode;
  // Same id, same result: a retried capture or release never runs twice
  if (opts.requestId) headers["PayPal-Request-Id"] = opts.requestId;
  if (opts.asSeller) headers["PayPal-Auth-Assertion"] = authAssertion(opts.asSeller);

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = json.details?.[0]?.issue ?? json.name;
    const message = json.details?.[0]?.description ?? json.message ?? `PayPal ${method} ${path} failed`;
    // A 404 on a lookup just means "not there"
    if (!(method === "GET" && res.status === 404)) await recordApiError(method, path, res.status, json);
    throw new PayPalError(message, res.status, issue, json.debug_id);
  }
  return json as T;
}

/**
 * A call PayPal turned down, kept in paypal_event (type API_ERROR) beside the
 * webhooks: a refused capture sends no webhook, so this is the only record of
 * why. Never fails the caller.
 */
async function recordApiError(method: string, path: string, status: number, response: Record<string, any>) {
  const issue = response.details?.[0]?.issue ?? response.name ?? null;
  console.error("[paypal api]", method, path, status, issue, response.debug_id, JSON.stringify(response));
  await db
    .insert(paypalEvent)
    .values({
      id: `api-${crypto.randomUUID()}`,
      type: "API_ERROR",
      resourceId: path,
      payload: { method, path, status, issue, debugId: response.debug_id ?? null, response },
      processedAt: new Date(),
      error: issue,
    })
    .catch((error) => console.error("[paypal api] couldn't record the error", error));
}

const usd = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });
const toCents = (m?: { value: string }) => (m ? Math.round(Number(m.value) * 100) : null);

/* Seller onboarding (Partner Referrals) */

/** What a connected seller grants: take payments, refund, our fee, and holding the money. */
const SELLER_FEATURES = ["PAYMENT", "REFUND", "PARTNER_FEE", "DELAY_FUNDS_DISBURSEMENT"];

/** A one-time PayPal sign-up link. PayPal sends the seller back to returnUrl when done. */
export async function createSellerSignupLink(input: { trackingId: string; returnUrl: string }) {
  const res = await call<{ links: { rel: string; href: string }[] }>("POST", "/v2/customer/partner-referrals", {
    body: {
      tracking_id: input.trackingId,
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: { features: SELLER_FEATURES },
            },
          },
        },
      ],
      products: ["PPCP"],
      legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
      partner_config_override: { return_url: input.returnUrl },
    },
  });
  const link = res.links.find((l) => l.rel === "action_url");
  if (!link) throw new PayPalError("PayPal didn't return a sign-up link.", 502);
  return link.href;
}

export type SellerStatus = {
  merchantId: string;
  paymentsReceivable: boolean;
  emailConfirmed: boolean;
  /** Short names of what they granted: "partnerfee", "delay-funds-disbursement"… */
  permissions: string[];
};

/** The seller who signed up under this tracking id, straight from PayPal; null if they haven't finished. */
export async function sellerByTrackingId(trackingId: string): Promise<SellerStatus | null> {
  let found: { merchant_id?: string };
  try {
    found = await call("GET", `/v1/customer/partners/${partnerId}/merchant-integrations?tracking_id=${encodeURIComponent(trackingId)}`);
  } catch (error) {
    if (error instanceof PayPalError && error.status === 404) return null;
    throw error;
  }
  if (!found.merchant_id) return null;
  return sellerByMerchantId(found.merchant_id);
}

/** A seller connected to us, by their PayPal merchant id; null if they never connected. */
export async function sellerByMerchantId(merchantId: string): Promise<SellerStatus | null> {
  let m: {
    merchant_id: string;
    payments_receivable?: boolean;
    primary_email_confirmed?: boolean;
    oauth_integrations?: { oauth_third_party?: { scopes: string[] }[] }[];
  };
  try {
    m = await call("GET", `/v1/customer/partners/${partnerId}/merchant-integrations/${encodeURIComponent(merchantId)}`);
  } catch (error) {
    if (error instanceof PayPalError && error.status === 404) return null;
    throw error;
  }
  const permissions = (m.oauth_integrations ?? [])
    .flatMap((o) => o.oauth_third_party ?? [])
    .flatMap((t) => t.scopes)
    .map((s) => s.replace(/^https:\/\/uri\.paypal\.com\/services\/(payments\/)?/, ""));
  return {
    merchantId: m.merchant_id,
    paymentsReceivable: !!m.payments_receivable,
    emailConfirmed: !!m.primary_email_confirmed,
    permissions: [...new Set(permissions)],
  };
}

/* Checkout */

/**
 * An order paid to the seller, with our fee taken and the money held
 * (disbursement DELAYED) until we release it. Returns where to send the buyer.
 */
export async function createOrder(input: {
  /** Ours: shows on both sides' PayPal activity and comes back on capture. */
  reference: string;
  itemName: string;
  itemCents: number;
  shippingCents: number;
  platformFeeCents: number;
  payeeMerchantId: string;
  /** "card" opens PayPal's guest card form first; no account needed. */
  method: "paypal" | "card";
  returnUrl: string;
  cancelUrl: string;
}) {
  const total = input.itemCents + input.shippingCents;
  const order = await call<{ id: string; links: { rel: string; href: string }[] }>("POST", "/v2/checkout/orders", {
    requestId: `order-${input.reference}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          custom_id: input.reference,
          description: input.itemName.slice(0, 127),
          amount: {
            ...usd(total),
            breakdown: { item_total: usd(input.itemCents), shipping: usd(input.shippingCents) },
          },
          items: [
            {
              name: input.itemName.slice(0, 127),
              quantity: "1",
              unit_amount: usd(input.itemCents),
              category: "PHYSICAL_GOODS",
            },
          ],
          payee: { merchant_id: input.payeeMerchantId },
          payment_instruction: {
            disbursement_mode: "DELAYED",
            ...(input.platformFeeCents > 0 && { platform_fees: [{ amount: usd(input.platformFeeCents) }] }),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "resell.store",
            user_action: "PAY_NOW",
            // We already have the address; PayPal shouldn't ask for another
            shipping_preference: "NO_SHIPPING",
            landing_page: input.method === "card" ? "GUEST_CHECKOUT" : "LOGIN",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    },
  });
  const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!approve) throw new PayPalError("PayPal didn't return a payment link.", 502);
  return { id: order.id, approveUrl: approve.href };
}

export type Capture = {
  id: string;
  status: string;
  totalCents: number | null;
  paypalFeeCents: number | null;
  platformFeeCents: number | null;
  sellerNetCents: number | null;
};

/** Takes the approved payment. The money stays with PayPal until releaseToSeller. */
export async function captureOrder(orderId: string, requestId: string): Promise<Capture> {
  const res = await call<{
    status: string;
    purchase_units: {
      payments?: {
        captures?: {
          id: string;
          status: string;
          amount: { value: string };
          seller_receivable_breakdown?: {
            paypal_fee?: { value: string };
            platform_fees?: { amount: { value: string } }[];
            net_amount?: { value: string };
          };
        }[];
      };
    }[];
  }>("POST", `/v2/checkout/orders/${orderId}/capture`, { requestId });
  const c = res.purchase_units[0]?.payments?.captures?.[0];
  if (!c) throw new PayPalError("PayPal didn't capture the payment.", 502);
  const b = c.seller_receivable_breakdown;
  return {
    id: c.id,
    status: c.status,
    totalCents: toCents(c.amount),
    paypalFeeCents: toCents(b?.paypal_fee),
    platformFeeCents: b?.platform_fees?.reduce((sum, f) => sum + (toCents(f.amount) ?? 0), 0) ?? null,
    sellerNetCents: toCents(b?.net_amount),
  };
}

/**
 * Releases held money to the seller (referenced payout). Safe to retry: the
 * same capture and attempt is one request to PayPal. After PayPal reports a
 * release failed, a new `attempt` makes a fresh request.
 */
export async function releaseToSeller(captureId: string, attempt = 0) {
  const res = await call<{ item?: { item_id?: string; processing_state?: { status: string; reason?: string } } }>(
    "POST",
    "/v1/payments/referenced-payouts-items",
    {
      requestId: attempt ? `release-${captureId}-${attempt}` : `release-${captureId}`,
      body: { reference_id: captureId, reference_type: "TRANSACTION_ID" },
    },
  );
  const state = res.item?.processing_state;
  if (state?.status === "FAILED")
    throw new PayPalError(`PayPal couldn't release the payment: ${state.reason ?? "unknown reason"}`, 422, state.reason);
  return { payoutRef: res.item?.item_id ?? null, status: state?.status ?? "PENDING" };
}

/**
 * Gives a captured payment back to the buyer: all of it, or `amountCents` of
 * it. Each refund needs its own `requestId`; the same id never refunds twice.
 */
export async function refundCapture(input: {
  captureId: string;
  sellerMerchantId: string;
  reason: string;
  amountCents?: number | null;
  requestId?: string;
}) {
  const res = await call<{ id: string; status: string; amount?: { value: string } }>(
    "POST",
    `/v2/payments/captures/${input.captureId}/refund`,
    {
      requestId: input.requestId ?? `refund-${input.captureId}`,
      asSeller: input.sellerMerchantId,
      body: {
        note_to_payer: input.reason.slice(0, 255),
        ...(input.amountCents != null && { amount: usd(input.amountCents) }),
      },
    },
  );
  return { id: res.id, status: res.status, amountCents: toCents(res.amount) };
}

/* Webhooks */

/** The headers PayPal signs a webhook delivery with. */
export const WEBHOOK_HEADERS = [
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
] as const;

/**
 * Asks PayPal whether a webhook delivery is really from them, for our
 * webhook (PAYPAL_WEBHOOK_ID). False when anything's missing.
 */
export async function verifyWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const h = Object.fromEntries(WEBHOOK_HEADERS.map((name) => [name, headers.get(name)]));
  if (Object.values(h).some((v) => !v)) return false;
  const res = await call<{ verification_status: string }>("POST", "/v1/notifications/verify-webhook-signature", {
    body: {
      auth_algo: h["paypal-auth-algo"],
      cert_url: h["paypal-cert-url"],
      transmission_id: h["paypal-transmission-id"],
      transmission_sig: h["paypal-transmission-sig"],
      transmission_time: h["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return res.verification_status === "SUCCESS";
}
