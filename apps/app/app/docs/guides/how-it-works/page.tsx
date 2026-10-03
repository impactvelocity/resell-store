import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "How a sale works" };

export default async function HowItWorks() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/how-it-works"
      eyebrow="Start here"
      title="How a sale works"
      lead="The whole journey from listing to payout, from both sides of the counter, with every timing that matters."
      toc={[
        { id: "journey", title: "The journey" },
        { id: "timings", title: "The timings" },
        { id: "agents", title: "What the agents do" },
        { id: "fees", title: "Fees" },
      ]}
    >
      <H2 id="journey" className="mt-0">
        The journey
      </H2>
      <P>Say Maya is selling her yellow Le Creuset dutch oven for $200, and Jess wants it.</P>
      <OL>
        <li>
          <strong>Maya lists it.</strong> She takes a photo, the agent looks up what it goes for, and she publishes. See{" "}
          <A href={`${base}/guides/list-an-item`}>List an item</A>.
        </li>
        <li>
          <strong>Jess finds it</strong> by searching the marketplace, browsing Maya&apos;s shop, or following a link Maya shared.
        </li>
        <li>
          <strong>Jess asks or offers.</strong> She can ask a question (Maya&apos;s shop agent may answer right away) or make an
          offer under the price. Maya accepts, counters or declines. See <A href={`${base}/guides/offers`}>Offers</A>.
        </li>
        <li>
          <strong>Jess pays.</strong> She pays through PayPal, by PayPal balance, bank or card. PayPal holds the money. Maya
          doesn&apos;t get it yet, and Jess doesn&apos;t lose it if something goes wrong.
        </li>
        <li>
          <strong>Maya ships within 3 days</strong> and marks it shipped, ideally with a tracking number.
        </li>
        <li>
          <strong>It arrives.</strong> Jess has 3 days to check it. If all is well she taps <strong>It&apos;s all good</strong>,
          or just lets the 3 days pass.
        </li>
        <li>
          <strong>Maya gets paid.</strong> The money, less fees, goes to her PayPal.
        </li>
      </OL>
      <Callout tone="note" title="Your money is held, not handed over">
        From the moment a buyer pays until the item has arrived and they&apos;ve had time to check it, PayPal keeps the money. If
        there&apos;s a problem, it&apos;s still there to sort it out. See <A href={`${base}/guides/problems`}>Problems and refunds</A>.
      </Callout>

      <H2 id="timings">The timings</H2>
      <P>These run on their own. We check the clock every 15 minutes, so things happen within a few minutes of these times.</P>
      <Table
        head={["What", "When"]}
        rows={[
          ["An offer stays open", "48 hours, unless someone answers sooner"],
          ["A buyer pays for an accepted offer", "Within 48 hours of the yes, or the deal lapses"],
          ["Reminder about an offer running out", "12 hours before it runs out"],
          ["The seller ships", "Within 3 days of payment. After that, the buyer may cancel for a full refund"],
          ["Not shipped at all", "Cancelled and refunded automatically 7 days after payment"],
          ["The buyer is asked “Did it arrive?”", "7 days after it ships"],
          ["It counts as arrived", "10 days after it ships (we don't get delivery scans from carriers yet)"],
          ["The buyer checks it", "3 days after it counts as arrived, then the money goes to the seller"],
          ["Latest possible payout", "Before PayPal's own 28-day limit (within 27 days of payment)"],
          ["A problem nobody answers", "Goes to resell.store if the seller hasn't replied in 3 days"],
        ]}
      />
      <P>
        If the buyer says <strong>It&apos;s all good</strong> sooner, the seller is paid straight away. Otherwise the
        latest a seller waits is about 13 days after shipping.
      </P>

      <H2 id="agents">What the agents do</H2>
      <P>
        Each shop has an agent that can help the seller, and buyers can bring their own AI assistant too. They save you time on
        the back and forth. They don&apos;t make the big calls.
      </P>
      <UL>
        <li>A shop&apos;s agent answers buyers&apos; questions from what&apos;s in the listing, and hands anything else to you.</li>
        <li>It can counter low offers for you, about halfway, and tells you what it did.</li>
        <li>It never accepts an offer. A sale always needs your yes.</li>
        <li>It never goes below the lowest price you set, and never tells a buyer what that price is.</li>
        <li>No agent ever pays for you. Paying always happens in your browser, with you.</li>
      </UL>
      <P>
        More in <A href={`${base}/guides/questions`}>Questions and your shop agent</A> and{" "}
        <A href={`${base}/guides/your-agent`}>Your AI agent</A>.
      </P>

      <H2 id="fees">Fees</H2>
      <UL>
        <li>Buyers pay the item price plus shipping. Nothing extra.</li>
        <li>Listing is free. When something sells, resell.store keeps 10% of the item price. Shipping isn&apos;t included in that.</li>
        <li>PayPal&apos;s processing fee also comes out of the seller&apos;s share.</li>
      </UL>
      <P>
        There&apos;s a worked example in <A href={`${base}/guides/getting-paid`}>Getting paid</A>.
      </P>
    </DocPage>
  );
}
