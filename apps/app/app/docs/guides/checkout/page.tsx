import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Checkout" };

export default async function Checkout() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/checkout"
      eyebrow="Buying"
      title="Checkout"
      lead="Three short steps: where it's going, how fast, and how you pay. Your money waits with PayPal until the item is in your hands."
      toc={[
        { id: "sign-in", title: "Signing in" },
        { id: "steps", title: "The three steps" },
        { id: "delivery", title: "Delivery and prices" },
        { id: "paying", title: "Paying" },
        { id: "held", title: "Where your money waits" },
        { id: "hiccups", title: "If something goes wrong" },
        { id: "demo", title: "Trying it in the demo" },
      ]}
    >
      <H2 id="sign-in" className="mt-0">
        Signing in
      </H2>
      <P>
        Tap <strong>Buy now</strong> on a listing (or <strong>Pay</strong> on an accepted offer). If you aren&apos;t signed in,
        we email you a link. Tap it and you land right back at checkout. There&apos;s no password, and if you&apos;re new, the same
        link makes your account. See <A href={`${base}/guides/getting-started`}>Getting started</A>.
      </P>

      <H2 id="steps">The three steps</H2>
      <OL>
        <li>
          <strong>Ship to</strong>: your name, full address and country. Next time it&apos;s filled in from your last order, and
          you can tap <strong>Change address</strong>.
        </li>
        <li>
          <strong>Delivery</strong>: Tracked or Express (prices below).
        </li>
        <li>
          <strong>How you pay</strong>: PayPal, or a debit or credit card.
        </li>
      </OL>
      <P>
        The summary beside it shows the item (or your accepted offer, with the asking price struck through), shipping, and{" "}
        <strong>Buyer protection: Included</strong>.
      </P>

      <H2 id="delivery">Delivery and prices</H2>
      <Table
        head={["Option", "Arrives", "Costs"]}
        rows={[
          ["Tracked", "In 4 to 8 days", "The seller's shipping price, or $9 if they haven't set one"],
          ["Express", "In 2 to 3 days", "Tracked price plus $12"],
        ]}
      />
      <P>
        You pay for the item and shipping, and that&apos;s all. There&apos;s no buyer fee; the seller pays resell.store&apos;s fee
        out of their share.
      </P>

      <H2 id="paying">Paying</H2>
      <UL>
        <li>
          <strong>PayPal</strong>: pay from your PayPal balance, bank or card. Tap <strong>Pay $X with PayPal</strong>, approve it
          in PayPal&apos;s window, and nothing is charged until you do.
        </li>
        <li>
          <strong>Debit or credit card</strong>: no PayPal account needed, and you get the same protection. Tap{" "}
          <strong>Pay $X by card</strong> and PayPal opens its card form.
        </li>
      </UL>
      <P>
        Once you&apos;ve approved it, you come back to resell.store, the payment is taken and your order is placed. You&apos;ll see
        &quot;PayPal is holding $X until it arrives&quot;, and we email your receipt.
      </P>

      <H2 id="held">Where your money waits</H2>
      <P>Your money doesn&apos;t go straight to the seller. Here&apos;s the path it takes:</P>
      <OL>
        <li>
          <strong>Today</strong>: you pay, and PayPal holds it.
        </li>
        <li>
          <strong>Next</strong>: the seller ships it, within 3 days. You get a tracking link by email and in your account.
        </li>
        <li>
          <strong>It arrives</strong>: we count it as arrived 10 days after it ships, and you then get 3 days to check it. Not as
          described? Say so and the money stays put while it&apos;s sorted.
        </li>
        <li>
          <strong>You say it&apos;s good</strong> and the seller is paid straight away. Otherwise they&apos;re paid about 13 days after it
          ships, as long as you haven&apos;t reported a problem.
        </li>
      </OL>
      <Callout tone="note" title="Your money is held, not handed over">
        Until you say it&apos;s all good, or the checking time runs out, the seller can&apos;t touch it. If it never ships, you get
        it all back. See <A href={`${base}/guides/after-you-buy`}>After you buy</A> for the exact timings.
      </Callout>

      <H2 id="hiccups">If something goes wrong</H2>
      <UL>
        <li>
          <strong>You closed PayPal or tapped Cancel there</strong>: nothing was charged. Your checkout is still there when
          you&apos;re ready.
        </li>
        <li>
          <strong>Someone else bought it first</strong>: you&apos;ll see &quot;Sorry, someone just bought this one,&quot; and
          you aren&apos;t charged.
        </li>
        <li>
          <strong>The payment went through but the order couldn&apos;t be saved</strong>: rare, and the money is refunded to you
          automatically.
        </li>
        <li>
          <strong>It says it can&apos;t be bought right now</strong>: the seller hasn&apos;t connected PayPal yet, so there&apos;s
          nowhere for the money to go. Try messaging them.
        </li>
      </UL>

      <H2 id="demo">Trying it in the demo</H2>
      <Callout tone="tip" title="No real money in this demo">
        <p>
          resell.store is running on PayPal&apos;s test system (sandbox) for now. Your real PayPal login won&apos;t work, and no
          real money moves. A yellow <strong>Sandbox mode: no real money</strong> box at checkout shows the demo buyer login to use
          in PayPal&apos;s window.
        </p>
      </Callout>
      <P>
        If you see <strong>Test checkout</strong> instead, PayPal isn&apos;t switched on for that server at all. The order is still
        placed and you can follow it all the way through, but nothing is charged.
      </P>
    </DocPage>
  );
}
