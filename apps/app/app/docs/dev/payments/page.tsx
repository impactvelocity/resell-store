import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Payments and payouts · Developers" };

const orderBody = `POST /v2/checkout/orders
PayPal-Request-Id: order-{checkoutId}
PayPal-Partner-Attribution-Id: {PAYPAL_BN_CODE}

{
  "intent": "CAPTURE",
  "purchase_units": [{
    "reference_id": "{checkoutId}",
    "amount": { "currency_code": "USD", "value": "109.00",
      "breakdown": { "item_total": { "value": "100.00" }, "shipping": { "value": "9.00" } } },
    "items": [{ "name": "Yellow dutch oven, 5.5 qt", "quantity": "1", "category": "PHYSICAL_GOODS", … }],
    "payee": { "merchant_id": "{seller's PayPal merchant id}" },
    "payment_instruction": {
      "disbursement_mode": "DELAYED",
      "platform_fees": [{ "amount": { "currency_code": "USD", "value": "10.00" } }]
    }
  }],
  "payment_source": { "paypal": { "experience_context": {
    "user_action": "PAY_NOW", "shipping_preference": "NO_SHIPPING",
    "landing_page": "GUEST_CHECKOUT", "return_url": "…/api/paypal/checkout/return", … } } }
}`;

export default async function Payments() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/payments"
      eyebrow="Developers"
      title="Payments and payouts"
      lead="How a buyer's money gets to the seller: paid to the seller's own PayPal, held there until the item arrives, with resell.store's fee taken at the source. This project runs on PayPal's sandbox."
      toc={[
        { id: "model", title: "The model" },
        { id: "sequence", title: "A sale, step by step" },
        { id: "example", title: "A worked example" },
        { id: "locking", title: "One item, one buyer" },
        { id: "idempotency", title: "Safe to retry" },
        { id: "timings", title: "Timings" },
        { id: "refunds", title: "Refunds and problems" },
        { id: "webhook", title: "The PayPal webhook" },
        { id: "sandbox", title: "The sandbox demo seller" },
        { id: "mock", title: "Without PayPal keys" },
      ]}
    >
      <H2 id="model" className="mt-0">
        The model
      </H2>
      <P>
        resell.store is a PayPal multiparty platform. Each seller connects their own PayPal account. When a buyer pays, the order is
        made out to the seller (<C>payee.merchant_id</C>), with resell.store&apos;s fee written into it (<C>platform_fees</C>) and
        the seller&apos;s share held by PayPal (<C>disbursement_mode: DELAYED</C>). resell.store never holds the money itself; it only
        tells PayPal when to let it go.
      </P>
      <Table
        head={["File", "What it does"]}
        rows={[
          [<C key="a">lib/server/paypal.ts</C>, "The REST client: token, onboarding, orders, capture, release, refund, webhook check."],
          [<C key="b">lib/server/paypal-sellers.ts</C>, "Connecting a seller, syncing their account, readiness."],
          [<C key="c">lib/server/commerce.ts</C>, "Checkout, placing the order, offers, shipping, releasing."],
          [<C key="d">lib/server/disputes.ts</C>, "Cancelling, problems and refunds."],
          [<C key="e">lib/server/payout-policy.ts</C>, "The fee and every timer."],
          [<C key="f">lib/server/paypal-webhook.ts</C>, "What PayPal tells us after the fact."],
          [<span key="g"><C>lib/server/sweeps.ts</C>, <C>workflows/main.ts</C></span>, "The timed side: cancellations and releases, retried."],
        ]}
      />

      <H2 id="sequence">A sale, step by step</H2>
      <OL>
        <li>
          <strong>Connect the seller.</strong> On Connections (<C>/tools/connections</C>) the seller gets a one-time PayPal link from
          Partner Referrals (<C>POST /v2/customer/partner-referrals</C>), asking for <C>PAYMENT</C>, <C>REFUND</C>,{" "}
          <C>PARTNER_FEE</C> and <C>DELAY_FUNDS_DISBURSEMENT</C>. The tracking id is our user id. Back on resell.store,{" "}
          <C>syncPayPalAccount</C> asks PayPal who signed up under that tracking id, never trusting the return URL&apos;s query
          string, and saves <C>paypal_account</C>. <C>readiness()</C> is &quot;ready&quot; when their email is confirmed, payments are
          receivable, and they granted <C>partnerfee</C> and <C>delay-funds-disbursement</C>.
        </li>
        <li>
          <strong>Start checkout.</strong> <C>startCheckout</C> prices it (the listing, or an accepted offer, plus shipping), finds the
          payee, works out the fee and creates the PayPal order. A <C>checkout</C> row remembers what the buyer chose and the exact
          amounts. The buyer goes to PayPal&apos;s page: the login page for PayPal, the guest card form for a card. Nothing is charged
          yet.
        </li>
        <li>
          <strong>Buyer approves.</strong> PayPal sends them to <C>/api/paypal/checkout/return?token=&#123;orderId&#125;</C>.
        </li>
        <li>
          <strong>Capture inside the order.</strong> <C>finishCheckout</C> calls <C>placeOrder</C>, which locks the listing row,
          prices it again, and refuses if anything moved since they left (&quot;The price changed while you were in PayPal&quot;).
          Only then does it capture, inside the same transaction, and write the order with PayPal&apos;s fee and the seller&apos;s net
          from the capture&apos;s <C>seller_receivable_breakdown</C>. The listing is marked sold. If the capture took money but the
          order can&apos;t be written, the money is refunded straight away.
        </li>
        <li>
          <strong>Hold.</strong> The order is <C>paid</C>. The seller ships within 3 days and marks it shipped. The money stays with
          PayPal.
        </li>
        <li>
          <strong>Release.</strong> When the buyer taps &quot;It&apos;s all good&quot; (<C>confirmReceived</C>), or when the order
          sweep finds 13 days have passed since shipping (<C>releaseDue</C> in a workflow task), the order completes and{" "}
          <C>releaseOrder</C> asks PayPal to pay the held capture out with a referenced payout (
          <C>POST /v1/payments/referenced-payouts-items</C>). Never while a problem is open.
        </li>
        <li>
          <strong>Or refund.</strong> Before release, refunds go back through PayPal as the seller (<C>giveBack</C> in{" "}
          <C>disputes.ts</C>), in full or in part.
        </li>
      </OL>
      <CodeBlock title="The order PayPal sees" code={orderBody} />

      <H2 id="example">A worked example</H2>
      <P>
        Jess buys a $100 item with $9 tracked shipping. These are the numbers from a sandbox capture; PayPal&apos;s own fee is
        whatever PayPal reports in the capture, so treat it as an example.
      </P>
      <Table
        head={["", "Amount", "Where it comes from"]}
        rows={[
          ["Jess pays", "$109.00", "Item plus shipping"],
          ["resell.store's fee", "$10.00", <span key="a">10% of the item price (<C>PLATFORM_FEE_BPS</C>, default 1000). Shipping is never charged a fee.</span>],
          ["PayPal's fee", "$4.29", "From the seller's share, as PayPal reports it on capture"],
          ["Seller gets", "$94.71", "Held until release, then paid to their PayPal"],
        ]}
      />

      <H2 id="locking">One item, one buyer</H2>
      <P>
        Every listing is a single item. <C>placeOrder</C> selects the listing <C>FOR UPDATE</C>, so two buyers paying at the same
        moment queue: the second finds it sold (&quot;Sorry, someone just bought this one&quot;) and is never captured. In the same
        transaction the buyer&apos;s offer is marked paid and every other open, countered or accepted offer on it is declined. Paused
        shops and your own listings can&apos;t be bought.
      </P>

      <H2 id="idempotency">Safe to retry</H2>
      <P>
        Every PayPal call that moves money carries a <C>PayPal-Request-Id</C>. The same id gets the same result from PayPal, so a
        retried task, a refreshed return page or a doubled click never charges, pays or refunds twice.
      </P>
      <Table
        head={["Call", "Request id"]}
        rows={[
          ["Create order", <C key="a">order-&#123;checkoutId&#125;</C>],
          ["Capture", <C key="b">capture-&#123;checkoutId&#125;</C>],
          ["Release", <span key="c"><C>release-&#123;captureId&#125;</C>, then <C>release-&#123;captureId&#125;-&#123;n&#125;</C> after PayPal reports a failure</span>],
          ["Cancel refund", <C key="d">cancel-&#123;orderId&#125;</C>],
          ["Part refund", <C key="e">partial-&#123;disputeId&#125;</C>],
          ["Full refund for a problem", <C key="f">refund-&#123;disputeId&#125;</C>],
        ]}
      />
      <P>
        <C>finishCheckout</C> is safe to run twice too: a completed checkout returns the same order.
      </P>

      <H2 id="timings">Timings</H2>
      <P>
        From <C>lib/server/payout-policy.ts</C>. <C>PAYOUT_DEMO_MINUTES_PER_DAY</C> shrinks a &quot;day&quot; to that many minutes so
        the auto-release can be shown live; leave it unset in production.
      </P>
      <Callout tone="note" title="No carrier tracking yet">
        Orders have a <C>delivered</C> status and a <C>deliveredAt</C> date, but nothing sets them from a carrier: there&apos;s no
        tracking service wired in. So an order completes in one of two ways. The buyer confirms it arrived, or the order sweep
        assumes delivery 10 days after shipping and releases 3 days after that, never later than 27 days after payment.
      </Callout>
      <Table
        head={["Rule", "Value"]}
        rows={[
          ["Ship within (then the buyer may cancel)", "3 days after payment"],
          ["Not shipped: cancelled and refunded", "7 days after payment"],
          ["\"Did it arrive?\" check", "7 days after shipping"],
          ["Assumed delivered", "10 days after shipping"],
          ["Buyer's check window after that", "3 days, so released 13 days after shipping"],
          ["Latest release", "27 days after payment: PayPal's 28-day hold, less a day for the sweep"],
          ["Seller silent on a problem: resell.store steps in", "3 days"],
          ["Offers, and accepted offers waiting for payment", "48 hours"],
        ]}
      />

      <H2 id="refunds">Refunds and problems</H2>
      <UL>
        <li>The seller can cancel any time before shipping; the buyer once the ship-by date passes; the sweep after 7 days. Everything goes back.</li>
        <li>After shipping, the buyer reports a problem. The money stays held while it&apos;s open or escalated.</li>
        <li>The seller can refund in full, offer part back, or reply. Either side can ask resell.store to step in, and <C>resolveDispute</C> decides: refund, or release.</li>
        <li>
          Refunds use <C>PayPal-Auth-Assertion</C>, an unsigned JWT naming the platform and the seller, because the money is the
          seller&apos;s. Once released, it can&apos;t be refunded here.
        </li>
        <li>Disputes opened in PayPal come in through the webhook and follow PayPal&apos;s outcome; PayPal moves that money itself.</li>
      </UL>

      <H2 id="webhook">The PayPal webhook</H2>
      <P>
        <C>POST /api/paypal/webhook</C> checks each delivery with PayPal (<C>verify-webhook-signature</C>, with{" "}
        <C>PAYPAL_WEBHOOK_ID</C>) before believing it, and answers 401 if it doesn&apos;t check out. Each event is stored by
        PayPal&apos;s id in <C>paypal_event</C> first, so a redelivery is a no-op, and each handler only moves an order forward. A
        failure answers 500 so PayPal tries again. The events handled are listed on <A href={`${base}/dev/stack/paypal`}>PayPal</A>.
      </P>

      <H2 id="sandbox">The sandbox demo seller</H2>
      <P>
        Seeded shops have no PayPal of their own. In the sandbox, <C>payeeFor</C> falls back to one shared demo seller (
        <C>PAYPAL_DEMO_SELLER_ID</C>) when the shop owner&apos;s account can&apos;t take payments, and Connections offers to link a
        test account to it instead of signing up. Connect it once with <C>scripts/paypal-demo-seller.mjs</C>, which prints the
        merchant id. <C>demoSellerId()</C> returns null when <C>PAYPAL_ENV=live</C>, so this never happens with real money.
      </P>

      <H2 id="mock">Without PayPal keys</H2>
      <P>
        <C>paypalEnabled()</C> needs <C>PAYPAL_CLIENT_ID</C>, <C>PAYPAL_CLIENT_SECRET</C> and <C>PAYPAL_PARTNER_MERCHANT_ID</C>.
        Without them checkout is a test checkout: <C>placeOrder</C> runs with a <C>mock</C> payment, the order, lock and emails are
        all real, and nothing moves. Refunds on mock orders are recorded on paper, releases are skipped, Connections says PayPal
        isn&apos;t set up, and the webhook answers 404.
      </P>
      <Callout tone="warn" title="Sandbox only">
        This project has never been approved as a live PayPal partner. Everything above runs against <C>api-m.sandbox.paypal.com</C>
        . Going live needs PayPal&apos;s partner approval first.
      </Callout>
    </DocPage>
  );
}
