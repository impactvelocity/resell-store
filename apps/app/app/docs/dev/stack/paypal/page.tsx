import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "PayPal · Developers" };

const env = `PAYPAL_ENV=sandbox                    # "live" switches the base URL; never set for this project
PAYPAL_CLIENT_ID=…                    # the platform app (Developer Dashboard > Apps & Credentials)
PAYPAL_CLIENT_SECRET=…
PAYPAL_PARTNER_MERCHANT_ID=…          # the platform's own merchant id
PAYPAL_BN_CODE=…                      # partner attribution, sent on every call
PAYPAL_WEBHOOK_ID=…                   # the webhook pointed at /api/paypal/webhook
NEXT_PUBLIC_PAYPAL_CLIENT_ID=…        # only changes the payment note shown in the app
PLATFORM_FEE_BPS=1000                 # 10% of the item price

# Sandbox demo
PAYPAL_DEMO_SELLER_ID=…               # printed by scripts/paypal-demo-seller.mjs
PAYPAL_DEMO_SELLER_EMAIL=… PAYPAL_DEMO_SELLER_PASSWORD=…
PAYPAL_DEMO_BUYER_EMAIL=…  PAYPAL_DEMO_BUYER_PASSWORD=…
PAYOUT_DEMO_MINUTES_PER_DAY=          # e.g. 1: a "day" lasts a minute`;

export default async function PayPal() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/paypal"
      eyebrow="Built with"
      title="PayPal"
      lead="PayPal is how money moves on resell.store: buyers pay sellers directly, PayPal holds the seller's share until the item arrives, and resell.store's fee is taken out on the way. The project runs on PayPal's sandbox."
      toc={[
        { id: "what", title: "What it does here" },
        { id: "endpoints", title: "Every endpoint" },
        { id: "headers", title: "Headers" },
        { id: "onboarding", title: "Seller onboarding" },
        { id: "escrow", title: "Holding and releasing" },
        { id: "refunds", title: "Refunds" },
        { id: "webhooks", title: "Webhook events" },
        { id: "sandbox", title: "Sandbox demo accounts" },
        { id: "unlocks", title: "What it unlocks" },
        { id: "without", title: "Without it" },
        { id: "setup", title: "Setup" },
        { id: "live", title: "Going live" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What it does here
      </H2>
      <P>
        resell.store is a PayPal multiparty platform (PayPal Complete Payments, <C>PPCP</C>). Sellers connect their own PayPal
        account as merchants. Each order is made out to the seller, carries resell.store&apos;s fee, and uses delayed disbursement
        so the money waits at PayPal until we release it. The client is <C>lib/server/paypal.ts</C>; the flow end to end is on{" "}
        <A href={`${base}/dev/payments`}>Payments and payouts</A>.
      </P>

      <H2 id="endpoints">Every endpoint</H2>
      <Table
        head={["Endpoint", "Function", "Why"]}
        rows={[
          [<C key="a">POST /v1/oauth2/token</C>, <C key="a2">accessToken()</C>, "Client credentials. Cached and refreshed a minute before it expires."],
          [<C key="b">POST /v2/customer/partner-referrals</C>, <C key="b2">createSellerSignupLink()</C>, "A one-time sign-up link for a seller, asking for the four permissions a sale needs."],
          [<C key="c">GET /v1/customer/partners/&#123;partner&#125;/merchant-integrations?tracking_id=</C>, <C key="c2">sellerByTrackingId()</C>, "Who signed up under our user id."],
          [<C key="d">GET /v1/customer/partners/&#123;partner&#125;/merchant-integrations/&#123;merchant&#125;</C>, <C key="d2">sellerByMerchantId()</C>, "Can they take payments, is their email confirmed, what did they grant."],
          [<C key="e">POST /v2/checkout/orders</C>, <C key="e2">createOrder()</C>, "The order: paid to the seller, our fee in it, disbursement DELAYED."],
          [<C key="f">POST /v2/checkout/orders/&#123;id&#125;/capture</C>, <C key="f2">captureOrder()</C>, "Takes the approved payment. Returns PayPal's fee, our fee and the seller's net."],
          [<C key="g">POST /v1/payments/referenced-payouts-items</C>, <C key="g2">releaseToSeller()</C>, "Releases a held capture to the seller (reference_type TRANSACTION_ID)."],
          [<C key="h">POST /v2/payments/captures/&#123;id&#125;/refund</C>, <C key="h2">refundCapture()</C>, "All or part back to the buyer, acting as the seller."],
          [<C key="i">POST /v1/notifications/verify-webhook-signature</C>, <C key="i2">verifyWebhook()</C>, "Asks PayPal whether a webhook delivery is genuine."],
        ]}
      />

      <H2 id="headers">Headers</H2>
      <Table
        head={["Header", "When", "Why"]}
        rows={[
          [<C key="a">PayPal-Partner-Attribution-Id</C>, "Every call, when PAYPAL_BN_CODE is set", "Attributes the call to the platform."],
          [<C key="b">PayPal-Request-Id</C>, "Orders, captures, releases, refunds", "Idempotency: the same id never charges, pays or refunds twice."],
          [<C key="c">PayPal-Auth-Assertion</C>, "Refunds", <span key="c2">An unsigned JWT, <C>&#123;iss: clientId, payer_id: merchantId&#125;</C>, to act for the seller whose money it is.</span>],
          [<C key="d">Prefer: return=representation</C>, "Every call", "Full objects back, so fees come straight from the response."],
        ]}
      />

      <H2 id="onboarding">Seller onboarding</H2>
      <P>
        <C>lib/server/paypal-sellers.ts</C>, on Connections (<C>/tools/connections</C>). The sign-up link asks for{" "}
        <C>PAYMENT</C>, <C>REFUND</C>, <C>PARTNER_FEE</C> and <C>DELAY_FUNDS_DISBURSEMENT</C> with a third-party REST integration,
        and returns to <C>/api/paypal/connect/return</C>. PayPal knows the seller by our user id (the tracking id), so what we save
        always comes from PayPal, never from the return URL. PayPal doesn&apos;t always send people back, so Connections also checks
        on its own while a connect is in progress.
      </P>
      <Table
        head={["readiness()", "Means"]}
        rows={[
          [<C key="a">none</C>, "Not connected"],
          [<C key="b">confirm-email</C>, "They need to confirm their PayPal email"],
          [<C key="c">not-receivable</C>, "PayPal won't let the account take payments yet"],
          [<C key="d">missing-permissions</C>, <span key="d2">They didn&apos;t grant <C>partnerfee</C> or <C>delay-funds-disbursement</C></span>],
          [<C key="e">ready</C>, "Good to sell"],
        ]}
      />

      <H2 id="escrow">Holding and releasing</H2>
      <UL>
        <li>
          The order sets <C>payee.merchant_id</C> to the seller, <C>payment_instruction.platform_fees</C> to our fee (
          <C>PLATFORM_FEE_BPS</C>, 10% of the item price by default, never on shipping), and <C>disbursement_mode: DELAYED</C>.
        </li>
        <li>
          Checkout uses <C>user_action: PAY_NOW</C> and <C>shipping_preference: NO_SHIPPING</C> (we already have the address).
          Paying by card sets <C>landing_page: GUEST_CHECKOUT</C>, so a buyer without PayPal gets the card form first.
        </li>
        <li>The capture happens inside the database transaction that writes the order, with the listing row locked.</li>
        <li>
          Release is a referenced payout of the capture. It happens when the buyer says it arrived, or when the order sweep reaches
          13 days after shipping (10 assumed in transit, 3 to check; there&apos;s no carrier tracking), and always within 27 days of
          payment, before PayPal&apos;s own 28-day limit. A live problem blocks it.
        </li>
      </UL>

      <H2 id="refunds">Refunds</H2>
      <P>
        <C>giveBack</C> in <C>lib/server/disputes.ts</C> refunds the capture as the seller: the whole order for a cancellation, part
        of it for an agreed partial refund, or the rest of it for a problem. <C>note_to_payer</C> tells the buyer why. Once the money
        has been released it can&apos;t be refunded here.
      </P>

      <H2 id="webhooks">Webhook events</H2>
      <P>
        <C>POST /api/paypal/webhook</C>, handled in <C>lib/server/paypal-webhook.ts</C>. Verified with PayPal first (401 if not),
        stored by event id in <C>paypal_event</C> so redeliveries are no-ops, 500 on failure so PayPal retries.
      </P>
      <Table
        head={["Event", "What we do"]}
        rows={[
          [<C key="a">PAYMENT.CAPTURE.COMPLETED</C>, "Recorded; nothing to change."],
          [<C key="b">PAYMENT.CAPTURE.DENIED / DECLINED</C>, "A pending capture that failed: the order is cancelled and the listing goes back on sale."],
          [<C key="c">PAYMENT.CAPTURE.REFUNDED</C>, "Records ours or one made in PayPal. Full: refunded (or cancelled if it never shipped)."],
          [<C key="d">PAYMENT.CAPTURE.REVERSED</C>, "A chargeback: marked fully refunded, any open problem settled."],
          [<C key="e">CUSTOMER.DISPUTE.CREATED / UPDATED / RESOLVED</C>, "Mirrored onto the order's problem, following PayPal's outcome."],
          [<C key="f">MERCHANT.ONBOARDING.COMPLETED</C>, "Syncs the seller's account."],
          [<C key="g">MERCHANT.PARTNER-CONSENT.REVOKED</C>, "Marks the seller unable to take payments."],
          [<C key="h">PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED</C>, "Records the release."],
          [<C key="i">PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED</C>, <span key="i2">Clears the release and counts the failure (<C>failed:n</C>), so the sweep tries again with a fresh request id.</span>],
        ]}
      />

      <H2 id="sandbox">Sandbox demo accounts</H2>
      <P>
        So anyone can try a sale without making PayPal accounts, the sandbox has shared test logins. Checkout shows the demo buyer
        login, and Connections shows the demo seller login and offers to link a seller to the shared demo seller (
        <C>linkDemoPayPal</C>). Seeded shops have no PayPal, so their money goes to the demo seller too. Connect it once:
      </P>
      <CodeBlock title="Terminal" code={`cd apps/app\nnode --env-file=.env.local scripts/paypal-demo-seller.mjs\n# first run: prints a PayPal link to open as the demo seller\n# second run: prints the merchant id for PAYPAL_DEMO_SELLER_ID`} />
      <P>
        <C>demoSellerId()</C> and <C>sandboxLogin()</C> return null when <C>PAYPAL_ENV=live</C>.
      </P>

      <H2 id="unlocks">What it unlocks</H2>
      <UL>
        <li><strong>Buyers pay only for what arrives.</strong> The money is held until they say it&apos;s all good, or 13 days after shipping pass without a problem.</li>
        <li><strong>Sellers get paid automatically,</strong> straight to their own PayPal, without chasing anyone.</li>
        <li><strong>The platform earns its fee without touching the money.</strong> PayPal splits it at capture.</li>
        <li><strong>No account needed to buy.</strong> Guest card checkout.</li>
        <li><strong>Refunds and disputes</strong> work in full or in part, and PayPal disputes show up in the app&apos;s problem flow.</li>
      </UL>

      <H2 id="without">Without it</H2>
      <P>
        With no client id, secret or partner id, <C>paypalEnabled()</C> is false and checkout is a test checkout: orders are real,
        the <C>mock</C> provider takes no money, refunds are recorded on paper, releases are skipped, Connections says &quot;PayPal
        isn&apos;t set up on this server yet&quot;, and the webhook answers 404.
      </P>

      <H2 id="setup">Setup</H2>
      <CodeBlock title="apps/app/.env.local" code={env} />
      <P>
        Subscribe the webhook to the events in the table above. On Render, the workflow service needs the same PayPal keys (minus
        the webhook id and demo logins) because it releases and refunds too. See <A href={`${base}/dev/env`}>Environment
        variables</A>.
      </P>

      <H2 id="live">Going live</H2>
      <Callout tone="warn" title="Sandbox only">
        A live multiparty integration needs PayPal to approve the platform as a partner, with its own BN code and live credentials.
        resell.store hasn&apos;t been through that, so it only runs against <C>api-m.sandbox.paypal.com</C> and no real money moves.
        The code switches base URL on <C>PAYPAL_ENV=live</C> and drops the demo seller, but it has never been run that way.
      </Callout>
    </DocPage>
  );
}
