import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Offers" };

export default async function Offers() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/offers"
      eyebrow="Selling"
      title="Offers"
      lead="When a listing takes offers, buyers can suggest a lower price. You accept, counter or decline, and your agent can do the haggling on low ones."
      toc={[
        { id: "how", title: "How buyers offer" },
        { id: "answering", title: "Answering an offer" },
        { id: "lowest", title: "Your lowest" },
        { id: "agent", title: "What your agent does" },
        { id: "reminders", title: "Reminders and endings" },
        { id: "sold", title: "When it sells" },
      ]}
    >
      <H2 id="how" className="mt-0">
        How buyers offer
      </H2>
      <P>
        On a listing with <strong>Take offers</strong> on, buyers see <strong>Make an offer</strong>. They pick an amount under
        your price (at least $1) and can add a note. Each buyer has one live offer per listing at a time; a new one replaces their
        old one. The buyer&apos;s side is covered in <A href={`${base}/guides/making-offers`}>Making an offer</A>.
      </P>
      <P>
        You hear about it by email, and it shows up in your <A href={siteUrl("/inbox")}>Inbox</A> under{" "}
        <strong>Needs you</strong>, on Home, and on the listing&apos;s own page.
      </P>
      <Callout tone="tip" title="48 hours">
        An offer stays open for 48 hours. If nobody answers in that time, it runs out.
      </Callout>

      <H2 id="answering">Answering an offer</H2>
      <P>Open the offer to see the buyer&apos;s amount, your price, your lowest, and anything your agent has already said.</P>
      <H3>Accept</H3>
      <P>
        Tap <strong>Accept $X</strong>. The buyer gets 48 hours to pay. Once they do, it&apos;s sold, and any other offers on it
        are declined.
      </P>
      <H3>Counter</H3>
      <P>
        Tap <strong>Counter</strong>, pick an amount between their offer and your price, and tap <strong>Send $X</strong>. A
        counter gives the buyer a fresh 48 hours to accept or decline it.
      </P>
      <H3>Decline</H3>
      <P>
        Tap <strong>Decline</strong> and we let the buyer know. They can still make a new offer or buy at your price.
      </P>

      <H2 id="lowest">Your lowest</H2>
      <P>
        Your lowest is the least you&apos;d take for something. Buyers never see it. You can set it on each listing as{" "}
        <strong>Lowest you&apos;d take</strong>. If you don&apos;t, it&apos;s your price minus the shop&apos;s{" "}
        <strong>Lowest it can go</strong> setting (15% off unless you changed it).
      </P>
      <P>Every offer gets a tag so you can tell at a glance how it compares:</P>
      <UL>
        <li>
          <strong>Above your lowest</strong>
        </li>
        <li>
          <strong>At your lowest</strong>
        </li>
        <li>
          <strong>Under your lowest</strong>
        </li>
      </UL>

      <H2 id="agent">What your agent does</H2>
      <P>
        If <strong>Haggle on offers</strong> is on in your shop settings (it is to start with), your agent looks at each new offer
        as soon as it comes in.
      </P>
      <Table
        head={["The offer is", "What your agent does"]}
        rows={[
          [
            "At or above your lowest",
            "Doesn't answer the buyer. It leaves you a note, like “That's above your lowest ($170). I'd take it.” The yes is yours.",
          ],
          [
            "Under your lowest",
            "Counters about halfway between the offer and your price, rounded to a tidy number, never under your lowest. It messages the buyer and tells you what it did.",
          ],
        ]}
      />
      <P>
        Say Maya&apos;s dutch oven is $200 and her lowest is $170. Jess offers $150. The agent counters at $175 and tells Maya:
        &quot;I countered at $175. Your lowest is $170, so there&apos;s still room if they come back.&quot; If Jess comes back
        lower again, the agent meets her halfway from its last counter, so each round gives a little, never more.
      </P>
      <OL>
        <li>It never accepts an offer. Saying yes to a sale is always up to you.</li>
        <li>It never goes below your lowest, and never tells the buyer what your lowest is.</li>
        <li>
          Its notes to you start with &quot;Your agent&quot; and only you see them. Buyers only see the message it sends them.
        </li>
      </OL>
      <Callout tone="note">
        You can step in any time. Accept, counter or decline yourself, even after the agent has countered. To stop the haggling,
        turn off <strong>Haggle on offers</strong> in <A href={`${base}/guides/shops#agent`}>shop settings</A>.
      </Callout>

      <H2 id="reminders">Reminders and endings</H2>
      <P>
        Twelve hours before an offer or counter runs out, we send a reminder to whoever&apos;s turn it is. An offer can end up as:
      </P>
      <UL>
        <li>
          <strong>Needs you</strong>: waiting for your answer.
        </li>
        <li>
          <strong>Countered</strong>: waiting for the buyer.
        </li>
        <li>
          <strong>Accepted</strong>: the buyer has 48 hours to pay.
        </li>
        <li>
          <strong>Declined</strong>, <strong>Withdrawn</strong> (the buyer took it back) or <strong>Ran out</strong>.
        </li>
      </UL>
      <P>
        Offers waiting on the buyer sit under <strong>Waiting on buyers</strong> in your Inbox; finished ones move to{" "}
        <strong>Earlier</strong>.
      </P>

      <H2 id="sold">When it sells</H2>
      <P>
        Once a buyer pays, whether at your price or an accepted offer, the listing is sold and every other offer on it is declined
        for you. Next comes shipping: see <A href={`${base}/guides/sales`}>Sales and shipping</A>.
      </P>
    </DocPage>
  );
}
