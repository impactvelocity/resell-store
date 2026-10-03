import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Making an offer" };

export default async function MakingOffers() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/making-offers"
      eyebrow="Buying"
      title="Making an offer"
      lead="Suggest your price, add a friendly note, and hear back within 48 hours. If the seller says yes, you have 48 hours to pay."
      toc={[
        { id: "when", title: "When you can make one" },
        { id: "sending", title: "Sending an offer" },
        { id: "after", title: "What the seller can do" },
        { id: "agent", title: "The shop's agent" },
        { id: "counter", title: "Answering a counter" },
        { id: "paying", title: "Paying after a yes" },
        { id: "tracking", title: "Keeping track" },
      ]}
    >
      <H2 id="when" className="mt-0">
        When you can make one
      </H2>
      <P>
        Look for <strong>Open to offers</strong> on the listing and a <strong>Make an offer</strong> button next to{" "}
        <strong>Buy now</strong>. You&apos;ll need to be signed in. You can&apos;t make an offer when:
      </P>
      <UL>
        <li>The seller turned offers off. The listing says the price is firm, and you can still buy it at that price.</li>
        <li>The shop is paused while its owner takes a break.</li>
        <li>It&apos;s your own listing.</li>
      </UL>

      <H2 id="sending">Sending an offer</H2>
      <OL>
        <li>
          Type your price in whole dollars, or tap a quick choice: <strong>10%</strong>, <strong>15%</strong> or{" "}
          <strong>20%</strong> off.
        </li>
        <li>
          Read the hint under it. Within 15% of the price: &quot;Offers this close usually get a yes here.&quot; Within 30%: the
          seller may come back with a counter. Further under than that rarely gets a yes.
        </li>
        <li>
          Add a note if you like (up to 500 characters). Offers with a note do better. &quot;Could pay today, no rush on
          shipping&quot; goes a long way.
        </li>
        <li>
          Tap <strong>Send offer</strong>.
        </li>
      </OL>
      <P>
        Your offer has to be at least $1 and under the asking price. If you&apos;re happy to pay the full price, just buy it.
      </P>
      <Callout tone="note" title="Nothing is charged for an offer">
        Sending an offer doesn&apos;t take any money. You only pay at checkout, after the seller says yes.
      </Callout>
      <UL>
        <li>You can have one live offer per item. Sending a new one replaces your last.</li>
        <li>An offer stays open for 48 hours. If the seller doesn&apos;t answer by then, it runs out.</li>
        <li>
          Changed your mind? Tap <strong>Take it back</strong> on the offer in your account, any time before the seller answers.
        </li>
      </UL>

      <H2 id="after">What the seller can do</H2>
      <Table
        head={["They choose", "What happens"]}
        rows={[
          ["Accept", "It's a deal. You have 48 hours to pay. We email you right away."],
          ["Counter", "They suggest a price between your offer and theirs. It stands for 48 hours while you decide."],
          ["Decline", "That offer ends. You can send a different one if the item is still for sale."],
        ]}
      />
      <P>
        If someone else buys the item first, your offer is declined automatically. Nothing was charged, so there&apos;s nothing to
        give back.
      </P>

      <H2 id="agent">The shop&apos;s agent</H2>
      <P>
        Some sellers let their shop&apos;s agent haggle for them. Each shop has a lowest price it&apos;s happy with, which you
        never see. If your offer is under it, the agent may counter for the seller, meeting you about halfway between your offer
        and the asking price, and never below the shop&apos;s lowest. Its counter shows up as a message in your conversation with
        the shop.
      </P>
      <P>
        If your offer is at or above the lowest, the agent leaves it for the seller to answer. It never accepts an offer on its own:
        a yes always comes from the person. Sellers can read how this works in{" "}
        <A href={`${base}/guides/offers`}>Offers</A>.
      </P>

      <H2 id="counter">Answering a counter</H2>
      <P>
        Open <A href={siteUrl("/account#offers")}>Offers in your account</A>. A countered offer reads &quot;Maya&apos;s closet
        countered at $X&quot;, with two buttons:
      </P>
      <UL>
        <li>
          <strong>Accept $X</strong>: it&apos;s a deal at their price, and you have 48 hours to pay.
        </li>
        <li>
          <strong>Decline</strong>: the offer ends and we let the shop know.
        </li>
      </UL>
      <P>
        Not quite there? Message the shop, or make a fresh offer. A new offer replaces the countered one.
      </P>

      <H2 id="paying">Paying after a yes</H2>
      <P>
        Once there&apos;s a deal, the listing&apos;s button changes to <strong>Pay $X (your accepted offer)</strong> and your
        account shows <strong>Pay now</strong> with the time left. Checkout works just like buying outright, at your agreed price
        plus shipping. See <A href={`${base}/guides/checkout`}>Checkout</A>.
      </P>
      <P>
        If you don&apos;t pay within 48 hours, the deal lapses and the item goes back on sale. We send a reminder 12 hours before a
        counter or a deal runs out, so it&apos;s hard to miss.
      </P>

      <H2 id="tracking">Keeping track</H2>
      <P>
        Every offer you&apos;ve made is under <strong>Offers</strong> in your account. Live ones show how long is left; finished
        ones say <strong>Bought</strong>, <strong>Declined</strong>, <strong>Ran out</strong> or{" "}
        <strong>You took it back</strong>. You&apos;ll also get an email when the seller accepts, counters or passes.
      </P>
      <Callout tone="tip">
        Your own AI assistant can make and answer offers for you, up to a limit you set. See{" "}
        <A href={`${base}/guides/your-agent`}>Your AI agent</A>.
      </Callout>
    </DocPage>
  );
}
