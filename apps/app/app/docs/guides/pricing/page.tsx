import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Prices and research" };

export default async function Pricing() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/pricing"
      eyebrow="Selling"
      title="Prices and research"
      lead="When you list something, the agent looks up what similar ones go for and suggests a price. Here's where those numbers come from, and how to set your own."
      toc={[
        { id: "research", title: "How research works" },
        { id: "honest", title: "Asking prices, not sold prices" },
        { id: "suggested", title: "The suggested price" },
        { id: "yours", title: "Your price and your lowest" },
        { id: "offers", title: "Take offers" },
        { id: "chat", title: "Ask the agent" },
        { id: "tips", title: "Pricing tips" },
      ]}
    >
      <H2 id="research" className="mt-0">
        How research works
      </H2>
      <P>
        After you add a photo or a few words and tap <strong>Look it up for me</strong>, the agent works through these steps. The
        page fills in as it goes, so you can watch.
      </P>
      <OL>
        <li>
          <strong>It looks at your photo</strong> and works out what the thing is: brand, colour, size and a few useful facts.
        </li>
        <li>
          <strong>It finds it in 100M products.</strong> A catalog of about 100 million products gives it the exact model,
          pictures from the maker, and what it costs new.
        </li>
        <li>
          <strong>It finds second-hand prices.</strong>
        </li>
        <li>
          <strong>It checks popular marketplaces</strong> for live listings of the same thing, keeps up to 10 real matches,
          and drops any odd prices that would skew things.
        </li>
        <li>
          <strong>It works out a fair price</strong> from all of that.
        </li>
      </OL>
      <P>
        Under <strong>Where this came from</strong> you can see what it found. If something goes wrong partway, you can{" "}
        <strong>Try again</strong> or <strong>Skip to details</strong> and price it yourself.
      </P>

      <H2 id="honest">Asking prices, not sold prices</H2>
      <P>
        We want to be straight with you about this. The prices the agent finds on popular marketplaces are what people are{" "}
        <em>asking</em> right now, not what things actually sold for. Sold prices aren&apos;t open to look up any more (the big marketplaces keep
        them behind a login). Things usually sell for up to about 15% under their asking price, and the agent takes that into
        account.
      </P>
      <Callout tone="note">
        When there isn&apos;t much to go on, it says so: &quot;Not many of these sold lately, so this is a rough guess.&quot;
        Treat that price as a starting point and use your own judgement.
      </Callout>

      <H2 id="suggested">The suggested price</H2>
      <P>
        When research is done you get a range, a band where most of them sell, and a <strong>Suggested</strong> price inside that
        band. Unless you&apos;ve already set them yourself, the agent sets your price to the suggestion and your lowest to the
        bottom of the band. You can change both on the next step.
      </P>

      <H2 id="yours">Your price and your lowest</H2>
      <P>
        On <strong>Check the details</strong>, <strong>Your price</strong> shows next to &quot;Most sell between $A and $B&quot;
        so you can see where you sit. Go above the band and it says &quot;Higher than most. It may take longer to sell.&quot; Go
        below and it says &quot;Lower than most. It should go fast.&quot;
      </P>
      <Table
        head={["", "What it is", "Who sees it"]}
        rows={[
          [<strong key="a">Your price</strong>, "What buyers pay with Buy now. $1 to $100,000.", "Everyone"],
          [
            <strong key="b">Lowest you&apos;d take</strong>,
            "The floor for your agent when it haggles. It can't be above your price.",
            "Only you",
          ],
        ]}
      />
      <P>
        If you don&apos;t set a lowest on a listing, your agent uses the shop&apos;s <strong>Lowest it can go</strong> setting
        (15% off your price unless you changed it). See <A href={`${base}/guides/shops`}>Open a shop</A>.
      </P>

      <H2 id="offers">Take offers</H2>
      <P>
        <strong>Take offers</strong> is on to start with. Buyers can offer under your price, your agent haggles on low ones, and
        you say yes or no. Turn it off and the price is firm: buyers can only pay your price. More in{" "}
        <A href={`${base}/guides/offers`}>Offers</A>.
      </P>

      <H2 id="chat">Ask the agent</H2>
      <P>
        On the research and details steps you can just tell the agent what you want, in your own words. It can set your price,
        set your lowest, turn offers on or off, or change a detail, and it tells you if your price is above or below the usual
        range. For example:
      </P>
      <UL>
        <li>&quot;Make it $185 and don&apos;t go under $160.&quot;</li>
        <li>&quot;Turn off offers on this one.&quot;</li>
        <li>&quot;Is $220 too much?&quot;</li>
      </UL>

      <H2 id="tips">Pricing tips</H2>
      <UL>
        <li>Pricing inside the band usually sells within a sensible time. Above it, expect to wait or haggle.</li>
        <li>Leave a little room between your price and your lowest if you take offers. Buyers like to feel they got a deal.</li>
        <li>Be honest about condition. It moves the price, and it saves problems later.</li>
        <li>
          Good photos earn better prices. See <A href={`${base}/guides/list-an-item#photos`}>Photos</A>.
        </li>
        <li>
          Not getting interest? Check its <A href={`${base}/guides/stats`}>stats</A>. Lots of views and no offers often means
          the price is a bit high.
        </li>
      </UL>
    </DocPage>
  );
}
