import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Getting paid" };

export default async function GettingPaid() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/getting-paid"
      eyebrow="Selling"
      title="Getting paid"
      lead="You're paid through PayPal. Connect it once, and each sale pays out after the buyer has the item and has had time to check it."
      toc={[
        { id: "connect", title: "Connect PayPal" },
        { id: "held", title: "When you're paid" },
        { id: "fees", title: "Fees" },
        { id: "refunds", title: "Refunds" },
        { id: "demo", title: "Demo PayPal" },
      ]}
    >
      <H2 id="connect" className="mt-0">
        Connect PayPal
      </H2>
      <P>
        Do this before your first sale: buyers can&apos;t buy from you until it&apos;s done. You need a PayPal account that can
        receive payments.
      </P>
      <OL>
        <li>
          Go to <A href={siteUrl("/tools/connections")}>Connections</A> (under Tools) and find PayPal under{" "}
          <strong>Getting paid</strong>.
        </li>
        <li>
          Tap <strong>Connect PayPal</strong>. PayPal opens; sign in there and allow what it asks for.
        </li>
        <li>
          Come back and tap <strong>I&apos;m done, check now</strong>.
        </li>
      </OL>
      <P>We check with PayPal and tell you where things stand:</P>
      <Table
        head={["What you see", "What to do"]}
        rows={[
          [
            "Almost there: confirm your email with PayPal",
            "Confirm your email address in PayPal, then tap Check again.",
          ],
          [
            "PayPal isn't letting this account take payments yet",
            "Something on PayPal's side needs sorting. Check your PayPal account, then Check again.",
          ],
          [
            "Connect again and allow everything PayPal asks for",
            "A permission was missed. Tap Connect again and say yes to each one.",
          ],
          ["Sales pay out here once the buyer has the item.", "You're all set."],
        ]}
      />
      <P>
        Changing to a different PayPal? Tap <strong>Unlink</strong>, then connect the new one. Only you, signed in, can change
        where your money goes. No AI agent or app can.
      </P>

      <H2 id="held">When you&apos;re paid</H2>
      <P>
        When a buyer pays, PayPal holds the money. It&apos;s released to your PayPal at the first of these:
      </P>
      <Table
        head={["What happens", "When you're paid"]}
        rows={[
          [
            <span key="a">
              The buyer taps <strong>It&apos;s all good</strong>
            </span>,
            "Right away",
          ],
          ["The buyer says nothing and reports no problem", "13 days after you shipped (we count it as arrived after 10 days, then give the buyer 3 to check)"],
          ["Whatever else happens", "Never later than 27 days after payment, ahead of PayPal's own 28-day limit"],
        ]}
      />
      <P>
        If the buyer reports a problem, the money stays held until it&apos;s sorted. See{" "}
        <A href={`${base}/guides/sales#problems`}>If the buyer has a problem</A>. You can follow every sale on{" "}
        <A href={siteUrl("/sales")}>Sales</A>: <strong>Held until it arrives</strong> is your share still on the way, and{" "}
        <strong>Paid out to your PayPal</strong> is what&apos;s been released. We email you when a payout is sent.
      </P>
      <Callout tone="note" title="Why we hold the money">
        Holding it until the buyer has the item is what lets buyers feel safe paying someone they&apos;ve never met, and buyers
        who feel safe are more likely to buy.
      </Callout>

      <H2 id="fees">Fees</H2>
      <UL>
        <li>Listing is free.</li>
        <li>When something sells, resell.store keeps 10% of the item price. There&apos;s no fee on shipping.</li>
        <li>PayPal&apos;s processing fee also comes out of your share. It depends on PayPal&apos;s rates and the amount.</li>
        <li>Buyers pay only the item price plus shipping.</li>
      </UL>
      <P>Here&apos;s a real example: a $100 item with $9 shipping.</P>
      <Table
        head={["", "Amount"]}
        rows={[
          ["The buyer pays", "$109.00"],
          ["PayPal fee", "− $4.29"],
          ["resell.store fee (10% of $100)", "− $10.00"],
          [<strong key="a">You get</strong>, <strong key="b">$94.71</strong>],
        ]}
      />
      <P>Every sale&apos;s page shows this same breakdown for that sale.</P>

      <H2 id="refunds">Refunds</H2>
      <P>
        If you refund a buyer, in full or in part, the refund comes off your share of that sale. A full refund means you
        won&apos;t be paid for it. A sale that&apos;s cancelled before shipping is refunded to the buyer in full.
      </P>

      <H2 id="demo">Demo PayPal</H2>
      <Callout tone="warn" title="This demo uses no real money">
        Right now resell.store runs on PayPal&apos;s test system (&quot;Sandbox mode: no real money&quot;). Real PayPal logins
        won&apos;t work here, and sales move pretend money between test accounts.
      </Callout>
      <P>
        To try selling, tap <strong>Use demo PayPal</strong> on Connections. It links you to a shared test PayPal account,
        so you can skip signing up. Or connect a PayPal sandbox account of your own. Sometimes the server runs a plain test
        checkout with no PayPal at all; then sales show &quot;Test checkout: no money moved, and no fees.&quot;
      </P>
    </DocPage>
  );
}
