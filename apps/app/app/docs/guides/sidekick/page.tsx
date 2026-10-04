import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Shopping sidekick" };

export default async function Sidekick() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/sidekick"
      eyebrow="Both sides"
      title="Shopping sidekick"
      lead="Two dresses, same price. One sells on for $70, the other for $25. Check before you buy, and know which one holds its value."
      toc={[
        { id: "using", title: "Checking something" },
        { id: "looks-at", title: "What it looks at" },
        { id: "score", title: "Reading the result" },
        { id: "compare", title: "Comparing two things" },
        { id: "bought", title: "I bought it, now list it" },
        { id: "honest", title: "How sure it is" },
      ]}
    >
      <Callout tone="note">
        The sidekick is at <A href={siteUrl("/tools/sidekick")}>resell.store/tools/sidekick</A> and needs you signed in. It only
        works when the resell.store server has it switched on; if you see a &quot;soon&quot; page instead, it isn&apos;t on yet
        there.
      </Callout>

      <H2 id="using">Checking something</H2>
      <OL>
        <li>
          Paste a link to the item from any shop, or just name it, ideally with what it costs: &quot;Reformation black wrap
          dress, $120&quot;. Up to 500 characters.
        </li>
        <li>
          Tap <strong>Check it</strong>. It takes about a minute, and the page fills in by itself, so you can keep browsing.
        </li>
        <li>
          The result lands under <strong>Things you&apos;ve checked</strong>. Tap <strong>Details</strong> to see the listings it
          used.
        </li>
      </OL>
      <P>
        It keeps your last 30 checks. Tap <strong>Remove</strong> to clear one, or <strong>Try again</strong> if a check
        couldn&apos;t finish.
      </P>

      <H2 id="looks-at">What it looks at</H2>
      <UL>
        <li>
          <strong>What it is</strong>: it reads your words, or the page behind your link, to work out the exact item.
        </li>
        <li>
          <strong>What it costs you</strong>: the price you gave, or the price on the link. If there&apos;s neither, it looks up
          what it costs new in a large product catalog and tells you where that price came from.
        </li>
        <li>
          <strong>What it sells on for</strong>: the same thing listed second hand on popular marketplaces right now. It keeps
          the real matches and drops the odd ones out.
        </li>
      </UL>

      <H2 id="score">Reading the result</H2>
      <P>
        Each check shows &quot;Sells on for about&quot; a price, a range, and how much of what you pay you&apos;d likely get back:
      </P>
      <Table
        head={["Label", "You'd get back"]}
        rows={[
          ["Holds its value", "60% or more of what you pay"],
          ["Keeps some of it", "35% to 59%"],
          ["Loses most of it", "Under 35%"],
          ["Not sure yet", "It couldn't find a price for you or for the second-hand ones"],
        ]}
      />
      <P>
        It also works out what the item <strong>really costs</strong> you: the price, less what you&apos;d likely get when you
        sell it on. A $120 dress that sells on for $70 really costs you $50.
      </P>

      <H2 id="compare">Comparing two things</H2>
      <P>
        Torn between two? Tap <strong>Compare</strong> on both. They show side by side, and the one that keeps more of its value
        gets a <strong>Better buy</strong> sticker, with a line saying why. If they&apos;re within a few percent of each other, it
        says they hold their value about the same.
      </P>

      <H2 id="bought">I bought it, now list it</H2>
      <P>
        Went for it? Tap <strong>I bought it</strong> and the check is marked <strong>You own this</strong>. When you&apos;re ready
        to sell it on, tap <strong>List it</strong>: it starts a draft in your first shop and begins the price research straight
        away. No shop yet? It asks you to open one first. See{" "}
        <A href={`${base}/guides/list-an-item`}>List an item</A>.
      </P>

      <H2 id="honest">How sure it is</H2>
      <P>
        The estimate comes from listing prices, the prices people are asking right now, not confirmed sale prices: those are mostly
        hidden behind logins. Things usually sell for a little under what they&apos;re listed at, so the sidekick puts the
        &quot;sells on for&quot; figure at 85 to 100% of the middle asking price.
      </P>
      <P>
        When it only finds a few matches it says so, and you should treat the number as a rough guide. It&apos;s a quick read to
        help you decide, not a promise of what you&apos;ll get.
      </P>
      <Callout tone="tip">
        The same research runs when you list something to sell. See <A href={`${base}/guides/pricing`}>Prices and research</A>.
      </Callout>
    </DocPage>
  );
}
