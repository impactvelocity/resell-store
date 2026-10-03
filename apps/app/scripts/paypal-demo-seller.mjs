/*
 * Sandbox: connects the shared demo seller to the platform, once.
 *
 *   node --env-file=.env.local scripts/paypal-demo-seller.mjs
 *
 * Not connected yet: prints a PayPal link. Open it in a private window, sign in
 * as the demo seller (PAYPAL_DEMO_SELLER_EMAIL) and allow everything, then run
 * this again. Connected: prints the merchant id for PAYPAL_DEMO_SELLER_ID.
 *
 * The sign-up asks for the same things as createSellerSignupLink in
 * lib/server/paypal.ts; keep the two alike.
 */

const TRACKING_ID = "demo-seller";

if (process.env.PAYPAL_ENV === "live") throw new Error("The demo seller is sandbox only.");
const base = "https://api-m.sandbox.paypal.com";
const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");

const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
});
if (!tokenRes.ok) throw new Error(`PayPal sign-in failed (${tokenRes.status}). Check PAYPAL_CLIENT_ID and SECRET.`);
const { access_token } = await tokenRes.json();

async function call(method, path, body) {
  const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
  if (process.env.PAYPAL_BN_CODE) headers["PayPal-Partner-Attribution-Id"] = process.env.PAYPAL_BN_CODE;
  const res = await fetch(`${base}${path}`, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const found = await call(
  "GET",
  `/v1/customer/partners/${partnerId}/merchant-integrations?tracking_id=${TRACKING_ID}`,
);

if (found.json.merchant_id) {
  const { json: m } = await call(
    "GET",
    `/v1/customer/partners/${partnerId}/merchant-integrations/${found.json.merchant_id}`,
  );
  const scopes = (m.oauth_integrations ?? [])
    .flatMap((o) => o.oauth_third_party ?? [])
    .flatMap((t) => t.scopes)
    .map((s) => s.replace(/^https:\/\/uri\.paypal\.com\/services\/(payments\/)?/, ""));
  console.log(`Connected. PAYPAL_DEMO_SELLER_ID=${m.merchant_id}`);
  console.log(`  email ${m.primary_email ?? "?"}`);
  console.log(`  payments receivable ${!!m.payments_receivable}, email confirmed ${!!m.primary_email_confirmed}`);
  console.log(`  permissions ${[...new Set(scopes)].join(", ") || "none"}`);
} else {
  const { status, json } = await call("POST", "/v2/customer/partner-referrals", {
    tracking_id: TRACKING_ID,
    operations: [
      {
        operation: "API_INTEGRATION",
        api_integration_preference: {
          rest_api_integration: {
            integration_method: "PAYPAL",
            integration_type: "THIRD_PARTY",
            third_party_details: { features: ["PAYMENT", "REFUND", "PARTNER_FEE", "DELAY_FUNDS_DISBURSEMENT"] },
          },
        },
      },
    ],
    products: ["PPCP"],
    legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
  });
  const link = json.links?.find((l) => l.rel === "action_url")?.href;
  if (!link) throw new Error(`PayPal didn't return a sign-up link (${status}): ${JSON.stringify(json)}`);
  console.log("Not connected yet. Open this in a private window and sign in as the demo seller:");
  console.log(`  ${process.env.PAYPAL_DEMO_SELLER_EMAIL ?? "(PAYPAL_DEMO_SELLER_EMAIL)"}`);
  console.log(link);
  console.log("Then run this again for the merchant id.");
}
