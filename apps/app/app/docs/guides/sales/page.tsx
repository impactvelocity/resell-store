import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, OL, P, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Sales and shipping" };

export default async function Sales() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/sales"
      eyebrow="Selling"
      title="Sales and shipping"
      lead="Something sold. Here's what happens next: shipping it within 3 days, what to do if you can't, and how problems get sorted."
      toc={[
        { id: "sold", title: "When something sells" },
        { id: "ship", title: "Ship within 3 days" },
        { id: "cancel", title: "If you can't send it" },
        { id: "problems", title: "If the buyer has a problem" },
        { id: "sales-page", title: "Your Sales page" },
      ]}
    >
      <H2 id="sold" className="mt-0">
        When something sells
      </H2>
      <P>
        The moment a buyer pays, we email you with the price, the fees, what you&apos;ll get, and the date to ship by. The sale
        shows up on <A href={siteUrl("/sales")}>Sales</A>, on Home, and under <strong>To ship</strong> in your Inbox.
      </P>
      <P>
        The sale&apos;s own page has the buyer&apos;s name and address, <strong>Ship it by</strong> with the date, and a breakdown
        of your payout: the sale with shipping, any refunds, the resell.store fee and the PayPal fee.
      </P>
      <Callout tone="note" title="The money is held, not paid yet">
        PayPal holds the buyer&apos;s payment until the item arrives and they&apos;ve had 3 days to check it. Then it&apos;s
        yours. <A href={`${base}/guides/getting-paid`}>Getting paid</A> has the details.
      </Callout>

      <H2 id="ship">Ship within 3 days</H2>
      <P>Pack it up and send it within 3 days of the buyer paying. Then tell us it&apos;s on its way:</P>
      <OL>
        <li>
          On the sale (or under <strong>Ready to ship</strong> on Sales), tap <strong>I&apos;ve shipped it</strong>.
        </li>
        <li>
          Add the <strong>Tracking number (optional)</strong>.
        </li>
        <li>
          Tap <strong>Mark shipped</strong>. We let the buyer know.
        </li>
      </OL>
      <Callout tone="tip" title="Add tracking">
        A tracking number lets the buyer follow their parcel, and it helps if there&apos;s ever a question about whether it
        arrived. You&apos;re paid as soon as the buyer taps <strong>It&apos;s all good</strong>. If they don&apos;t, we count it
        as arrived 10 days after you shipped and pay you 3 days after that.
      </Callout>
      <P>
        If the ship-by date passes and it still isn&apos;t marked shipped, we email you a nudge, and the buyer may cancel for a
        full refund. If it&apos;s still not shipped 7 days after payment, the sale is cancelled and the buyer refunded
        automatically. The listing goes back to being a draft.
      </P>

      <H2 id="cancel">If you can&apos;t send it</H2>
      <P>
        Broke it, or found it&apos;s not what you thought? You can cancel any time before you ship. On the sale, tap{" "}
        <strong>Can&apos;t send it?</strong>, then <strong>Cancel the sale</strong>. The buyer gets all their money back, and your
        listing goes live again.
      </P>

      <H2 id="problems">If the buyer has a problem</H2>
      <P>
        Once you&apos;ve shipped, a buyer can report a problem: it hasn&apos;t arrived, it isn&apos;t as described, it arrived
        damaged, or something else. The money stays held while you sort it out. You&apos;ll get an email and see it on the sale.
        You can:
      </P>
      <H3>Reply</H3>
      <P>Often it&apos;s a simple mix-up. Ask a question or explain.</P>
      <H3>Offer part of it back</H3>
      <P>
        Offer a partial refund (at least $1, less than the total). If the buyer takes it, they get that back, the order closes, and
        you&apos;re paid the rest.
      </P>
      <H3>Refund in full</H3>
      <P>The buyer gets everything back through PayPal, and you won&apos;t be paid for this one.</P>
      <H3>Ask resell.store to step in</H3>
      <P>
        If you can&apos;t agree, either of you can ask us to look at it. We read what you both said and decide: a refund for the
        buyer, or the money released to you. We email you both either way.
      </P>
      <Callout tone="warn" title="Reply within 3 days">
        If you haven&apos;t replied 3 days after a problem was opened, it goes to resell.store automatically.
      </Callout>
      <P>
        If the buyer opens a case with PayPal directly, PayPal&apos;s process takes over and we follow its outcome. Once the money
        has been released to you, the order can&apos;t be refunded through resell.store. More in{" "}
        <A href={`${base}/guides/problems`}>Problems and refunds</A>.
      </P>

      <H2 id="sales-page">Your Sales page</H2>
      <P>
        <A href={siteUrl("/sales")}>Sales and payouts</A> shows everything in one place:
      </P>
      <UL>
        <li>
          <strong>Held until it arrives</strong>: your share of sales still on the way, after fees.
        </li>
        <li>
          <strong>Paid out to your PayPal</strong>: what&apos;s already been released to you.
        </li>
        <li>
          <strong>Ready to ship</strong> and <strong>Recent sales</strong>, with filters for All, To ship, On the way, Paid out and
          Problems.
        </li>
        <li>
          <strong>Download as a spreadsheet</strong> (on a computer), handy for your records.
        </li>
      </UL>
      <P>
        Two days after an order is done, we ask the buyer to leave a review. You can reply to each one once. See{" "}
        <A href={`${base}/guides/reviews`}>Reviews</A>.
      </P>
    </DocPage>
  );
}
