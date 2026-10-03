import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Problems and refunds" };

export default async function Problems() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/problems"
      eyebrow="Both sides"
      title="Problems and refunds"
      lead="Most hiccups get sorted between buyer and seller in a message or two. While they do, the money stays held, and resell.store steps in if you can't agree."
      toc={[
        { id: "cancelling", title: "Cancelling before it ships" },
        { id: "reporting", title: "Reporting a problem" },
        { id: "talking", title: "Talking it through" },
        { id: "step-in", title: "Asking resell.store to step in" },
        { id: "paypal", title: "PayPal cases" },
        { id: "refunds", title: "When refunds show up" },
      ]}
    >
      <H2 id="cancelling" className="mt-0">
        Cancelling before it ships
      </H2>
      <Table
        head={["Who", "When", "How"]}
        rows={[
          [
            "Seller",
            "Any time before it's marked shipped",
            <span key="s">
              On the sale, tap <strong>Can&apos;t send it?</strong> then <strong>Cancel the sale</strong>. The listing goes back up.
            </span>,
          ],
          [
            "Buyer",
            "Once the ship-by date (3 days after paying) has passed",
            <span key="b">
              On the order, tap <strong>Cancel for a full refund</strong>.
            </span>,
          ],
          ["Nobody", "7 days after paying with no shipment", "We cancel it and refund the buyer automatically."],
        ]}
      />
      <P>
        Every cancellation gives the buyer everything back, item and shipping. Once it&apos;s shipped, it can&apos;t be cancelled;
        report a problem instead.
      </P>

      <H2 id="reporting">Reporting a problem</H2>
      <P>
        Buyers: once an order is on its way, open it from <A href={siteUrl("/account")}>your account</A> and tap{" "}
        <strong>Report a problem</strong>.
      </P>
      <OL>
        <li>
          Pick what&apos;s wrong: <strong>It hasn&apos;t arrived</strong>, <strong>It isn&apos;t as described</strong>,{" "}
          <strong>It arrived damaged</strong> or <strong>Something else</strong>.
        </li>
        <li>Tell the shop what happened, in up to 2,000 characters. The more they know, the faster it&apos;s sorted.</li>
        <li>
          Tap <strong>Report the problem</strong>. The seller gets an email straight away.
        </li>
      </OL>
      <Callout tone="note" title="The money stays held">
        The seller isn&apos;t paid while a problem is open, however long it takes. There&apos;s one open problem per order.
      </Callout>
      <P>
        Report it before the money is released: that&apos;s about 13 days after it ships (10 days until it counts as
        arrived, then 3 days to check), or as soon as you tap It&apos;s all good. See <A href={`${base}/guides/after-you-buy#release`}>when the seller gets paid</A>.
      </P>

      <H2 id="talking">Talking it through</H2>
      <P>
        The problem shows on the buyer&apos;s order page and the seller&apos;s sale page as a timeline. Either side can reply, and
        the other gets an email each time.
      </P>
      <H3>What the seller can do</H3>
      <UL>
        <li>
          <strong>Offer part of it back</strong>: any amount from $1 up to just under what&apos;s left. Good for a small scuff
          the buyer is happy to keep.
        </li>
        <li>
          <strong>Refund in full</strong>: everything goes back to the buyer and the order ends.
        </li>
        <li>Reply, ask for a photo, or sort a return between you.</li>
      </UL>
      <H3>What the buyer can do</H3>
      <UL>
        <li>
          Answer a part refund: <strong>Take $X back</strong> settles it. You get that amount, the rest goes to the seller, and
          the order&apos;s done. Or tap <strong>No thanks</strong> and keep talking.
        </li>
        <li>
          Tap <strong>It&apos;s sorted</strong> if it turned up or you&apos;re happy after all. The problem closes and the order
          goes back to its usual timer.
        </li>
      </UL>

      <H2 id="step-in">Asking resell.store to step in</H2>
      <P>
        Can&apos;t agree? Either of you can tap <strong>Ask resell.store to step in</strong>. It also happens automatically if the
        seller hasn&apos;t replied 3 days after the problem was reported.
      </P>
      <P>
        We read the whole conversation and what each of you said, usually within two working days, and decide one of two ways:
      </P>
      <UL>
        <li>
          <strong>Refund</strong>: the buyer gets everything back.
        </li>
        <li>
          <strong>Release</strong>: the money goes to the seller and the order is done.
        </li>
      </UL>
      <P>We email you both with the outcome. The money stays held until then.</P>

      <H2 id="paypal">PayPal cases</H2>
      <P>
        Buyers can also open a case with PayPal directly. If you do, PayPal takes over: we follow whatever PayPal decides, and we
        email you when PayPal is reviewing it. Once the money has been released to the seller, a PayPal case is the
        way to go, because a refund can&apos;t be made from resell.store after that.
      </P>

      <H2 id="refunds">When refunds show up</H2>
      <UL>
        <li>Refunds go back the way you paid, to your PayPal or your card.</li>
        <li>PayPal usually shows it within a few days.</li>
        <li>
          Sellers: a refund comes out of your share for that sale. See{" "}
          <A href={`${base}/guides/getting-paid`}>Getting paid</A>.
        </li>
      </UL>
      <Callout tone="tip">
        Sellers: clear photos of wear and a plain description head off most &quot;not as described&quot; problems. See{" "}
        <A href={`${base}/guides/list-an-item`}>List an item</A>.
      </Callout>
    </DocPage>
  );
}
