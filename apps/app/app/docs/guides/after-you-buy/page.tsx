import type { Metadata } from "next";
import { A, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "After you buy" };

export default async function AfterYouBuy() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/after-you-buy"
      eyebrow="Buying"
      title="After you buy"
      lead="Follow your order from paid to done, and know exactly when the seller gets your money."
      toc={[
        { id: "account", title: "Your account" },
        { id: "statuses", title: "Order statuses" },
        { id: "order-page", title: "The order page" },
        { id: "shipping", title: "Shipping and cancelling" },
        { id: "all-good", title: "It's all good" },
        { id: "release", title: "When the seller gets paid" },
        { id: "next", title: "Problems and reviews" },
      ]}
    >
      <H2 id="account" className="mt-0">
        Your account
      </H2>
      <P>
        Tap your initial in the header, or go to <A href={siteUrl("/account")}>resell.store/account</A>. It opens with &quot;Hi,&quot;
        your name, and anything that needs you today. A pill shows how much of your money is held until things arrive.
      </P>
      <Table
        head={["Section", "What's in it"]}
        rows={[
          ["Overview", "What needs you now: a counter to answer, an order to pay for or confirm."],
          ["Orders", "Everything you've bought, newest first, with where each one's at."],
          ["Offers", "Offers you've made, how long each has left, and any counters. See Making an offer."],
          ["Saved", "Things you've hearted, for sale first, then sold ones."],
          ["Following", "Shops you follow, how many things they have for sale and what's new this week."],
        ]}
      />
      <P>
        Anything that changed since your last visit is marked <strong>New</strong>, with a count at the top. A visit ends when
        you&apos;ve been away for more than 30 minutes.
      </P>

      <H2 id="statuses">Order statuses</H2>
      <Table
        head={["You'll see", "What it means"]}
        rows={[
          ["Paid, the shop ships it next", "PayPal is holding your money. The seller has 3 days to send it."],
          ["On its way", "The seller marked it shipped, with tracking if they added it."],
          ["All done", "You said it's all good, or the checking time passed. The seller has been paid."],
          ["Problem reported", "You told the seller something's wrong. Your money stays held."],
          ["We're looking at it", "resell.store has stepped in to decide a problem."],
          ["Refunded", "Your money went back to you, all of it or the part you agreed."],
          ["Cancelled", "It never shipped, and you got everything back."],
        ]}
      />

      <H2 id="order-page">The order page</H2>
      <P>Tap any order to open it. You&apos;ll find:</P>
      <UL>
        <li>
          <strong>Where it&apos;s at</strong>: Paid, Shipped, Arrived, Done, with dates, and a tracking link once it&apos;s sent.
          UPS and USPS numbers link straight to the carrier.
        </li>
        <li>
          <strong>What you paid</strong>: the item, tracked or express shipping, the total, and any refund.
        </li>
        <li>
          <strong>Sending to</strong>: the address you gave.
        </li>
        <li>What to do next, which changes as the order moves along.</li>
      </UL>

      <H2 id="shipping">Shipping and cancelling</H2>
      <UL>
        <li>The seller has 3 days from when you paid to ship it. The order page shows the ship-by date.</li>
        <li>
          If that date passes and it still hasn&apos;t shipped, we email you, and the order page offers{" "}
          <strong>Cancel for a full refund</strong>. Or message the seller and give them a little longer.
        </li>
        <li>Not shipped 7 days after you paid? We cancel it and refund you in full automatically.</li>
        <li>
          When it ships you get an email, &quot;on its way&quot;, with the tracking number if the seller added one.
        </li>
      </UL>

      <H2 id="all-good">It&apos;s all good</H2>
      <P>
        Once it&apos;s in your hands and it&apos;s what you expected, tap <strong>It&apos;s all good</strong> on the order or in your
        account. That pays the seller straight away and wraps up the order. Only tap it once you&apos;ve had a look: after that, the
        money has gone.
      </P>

      <H2 id="release">When the seller gets paid</H2>
      <P>If you don&apos;t tap It&apos;s all good, the money still goes to the seller in the end:</P>
      <UL>
        <li>
          Tracking doesn&apos;t tell us when something is delivered, so every order counts as arrived 10 days after it ships,
          whatever the tracking says.
        </li>
        <li>You then have 3 days to check it. That&apos;s about 13 days after shipping in all.</li>
        <li>
          7 days after it ships, we email you &quot;Did it arrive?&quot; with two buttons: <strong>It&apos;s all good</strong> and{" "}
          <strong>Report a problem</strong>.
        </li>
        <li>The money is always released within 27 days of your payment, a day inside PayPal&apos;s own 28-day limit.</li>
      </UL>
      <Callout tone="note" title="Something not right? Say so before it's released">
        Reporting a problem stops the clock. The money stays held until it&apos;s sorted. Once it&apos;s been released, you can
        still open a case with PayPal.
      </Callout>

      <H2 id="next">Problems and reviews</H2>
      <P>
        If it hasn&apos;t arrived, isn&apos;t as described or turned up damaged, see{" "}
        <A href={`${base}/guides/problems`}>Problems and refunds</A>. Once the order&apos;s done, you can leave the shop a review;
        we&apos;ll ask you 2 days later. See <A href={`${base}/guides/reviews`}>Reviews</A>.
      </P>
    </DocPage>
  );
}
