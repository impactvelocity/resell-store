import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Research and agents · Developers" };

const pollResponse = `{
  "run": {
    "id": "6f1c…",
    "status": "running",
    "steps": [
      { "key": "identify", "tag": "Photo", "state": "done",
        "title": "Le Creuset round dutch oven", "detail": "Le Creuset, Yellow, 5.5 qt" },
      { "key": "catalog", "tag": "Catalog", "state": "done",
        "title": "Matched Le Creuset Signature Round Dutch Oven", "detail": "New from $420 at lecreuset.com" },
      { "key": "resale", "tag": "Resale", "state": "running",
        "title": "Finding second-hand prices", "detail": "Resale shops and marketplaces" },
      { "key": "listings", "tag": "Listings", "state": "running", "title": "Checking eBay, Poshmark and Depop", … },
      { "key": "price", "tag": "Price", "state": "queued", "title": "Work out a fair price", "detail": "Up next" }
    ]
  },
  "listing": { "name": "…", "fields": [ … ], "findings": null, "priceCents": null, "lowestCents": null }
}`;

export default async function Agents() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/agents"
      eyebrow="Developers"
      title="Research and agents"
      lead="Where the model helps, what it is allowed to touch, and what stays in plain code. The model reads, writes and suggests. Anything that decides what a buyer pays is worked out by code."
      toc={[
        { id: "principle", title: "Money decisions live in code" },
        { id: "research", title: "The research pipeline" },
        { id: "polling", title: "How the page follows along" },
        { id: "listing-agent", title: "The listing agent" },
        { id: "words", title: "Words" },
        { id: "store-agent", title: "The shop agent" },
        { id: "negotiator", title: "The negotiator" },
        { id: "sidekick", title: "Shopping sidekick" },
        { id: "fallbacks", title: "Without the keys" },
      ]}
    >
      <H2 id="principle" className="mt-0">
        Money decisions live in code
      </H2>
      <P>
        Every agent here follows the same few rules. They&apos;re why the model can run unattended on a seller&apos;s shop without
        ever giving their money away.
      </P>
      <UL>
        <li>
          Anything that feeds the database comes back as a structured output (<C>Output.object</C> with a zod schema), never as free
          text that gets parsed.
        </li>
        <li>
          Numbers from the model are checked before they&apos;re kept. The price verdict is rounded to whole dollars and the suggested
          price is clamped inside the band. Copy is clipped to the 80 and 120 character limits.
        </li>
        <li>
          Counters on offers are calculated by <C>planMove</C> in <C>lib/server/negotiator.ts</C>. The model only words the message,
          and its wording is thrown away unless it carries the exact counter and no other price.
        </li>
        <li>No agent ever accepts an offer, refunds or releases money. Those are the owner&apos;s calls (or PayPal&apos;s).</li>
        <li>
          Agents run after the response is sent (<C>runAfterResponse</C> in <C>lib/server/later.ts</C>, which wraps Next&apos;s{" "}
          <C>after()</C>) and catch their own errors, so a slow or failing model never breaks the request that started it.
        </li>
      </UL>
      <P>
        Models come from <C>lib/server/ai.ts</C>: <C>aiModel(&quot;main&quot;)</C> and <C>aiModel(&quot;fast&quot;)</C>. See{" "}
        <A href={`${base}/dev/stack/ai-model`}>AI model</A> for which call uses which.
      </P>

      <H2 id="research">The research pipeline</H2>
      <P>
        Research turns a photo and a few words (&quot;my mum&apos;s yellow le creuset, used a few times&quot;) into a name, the facts a
        buyer needs, a price range and the questions only the seller can answer. It lives in <C>lib/server/research.ts</C>.
      </P>
      <OL>
        <li>
          <strong>Start.</strong> <C>startResearch(listingId)</C> inserts a <C>research_run</C> row with every step queued, unless a run
          for that listing is already going (status <C>running</C>, touched in the last 3 minutes). The caller then runs{" "}
          <C>after(() =&gt; runResearch(run.id))</C>. Callers: <C>app/actions/listings.ts</C>, <C>app/actions/sidekick.ts</C> and the
          API&apos;s <C>POST /listings/:id/research</C>.
        </li>
        <li>
          <strong>Identify.</strong> The main model gets the first photo (as a file part) and the seller&apos;s words, and returns a
          name, brand, one of ten categories, colour, size, a search query and 3 to 6 facts. It&apos;s told never to invent what it
          can&apos;t see.
        </li>
        <li>
          <strong>Listings.</strong> Started straight after identify, in parallel, because it&apos;s the slow one: Kernel browsers
          search eBay, Poshmark and Depop for the same item (<C>findComps</C> in <C>lib/server/comps.ts</C>). Only when both Kernel and
          Anthropic keys are set. See <A href={`${base}/dev/stack/kernel`}>Kernel</A>.
        </li>
        <li>
          <strong>Catalog.</strong> Channel3 is searched with the query and the photo (<C>limit: 10</C>). The first product is the
          match; its new offers give &quot;New from $X at …&quot;. See <A href={`${base}/dev/stack/channel3`}>Channel3</A>.
        </li>
        <li>
          <strong>Resale.</strong> The same products&apos; offers marked <C>used</C>: what it&apos;s for sale for second hand right now.
        </li>
        <li>
          <strong>Price.</strong> Once the listings step is collected, the main model gets the new prices, the second-hand offers and
          the live listings with their median. It&apos;s told used things usually go for 30 to 70 percent of new, and that listings
          sell 0 to 15 percent under their ask. It returns a range, a band where most sell, a suggestion, a confidence, 3 or 4
          facts, 1 to 4 questions (condition always first) and a short summary.
        </li>
        <li>
          <strong>Merge.</strong> The findings go on <C>listing.findings</C>. Fields are merged so anything the seller set (
          <C>source: &quot;you&quot;</C>) wins over research, and each question becomes an empty field to fill in. The price and
          lowest price are only filled when empty: the suggestion, and the bottom of the band.
        </li>
      </OL>
      <Callout tone="note" title="Not a Render Workflow (yet)">
        Research runs in the web process through <C>after()</C>. The page only ever reads <C>research_run</C> and{" "}
        <C>listing.findings</C>, so moving <C>runResearch</C> into a workflow task later wouldn&apos;t change the page.
      </Callout>

      <H2 id="polling">How the page follows along</H2>
      <P>
        Each step writes its row as it goes: <C>state</C> is <C>queued</C>, <C>running</C>, <C>done</C> or <C>failed</C>, with a
        title and a detail line. The research screen (<C>components/listing/live-research.tsx</C>) polls{" "}
        <C>GET /api/listings/&#123;id&#125;/research</C> every 1.2 seconds and draws the tool cards from it.
      </P>
      <CodeBlock title="GET /api/listings/{id}/research" tone="paper" code={pollResponse} />
      <P>
        If anything throws, the run is marked <C>failed</C> with the error, and every step still queued or running shows
        &quot;Didn&apos;t finish&quot;. A catalog or comps failure on its own doesn&apos;t fail the run: that step says so and pricing
        carries on with what it has.
      </P>

      <H2 id="listing-agent">The listing agent</H2>
      <P>
        The chat beside a listing (findings and details steps) is <C>app/api/listings/[id]/chat/route.ts</C>. It streams with{" "}
        <C>streamText</C> on the main model, stops after 5 steps (<C>isStepCount(5)</C>), and changes the listing through four tools.
        The client is <C>useChat</C> in <C>components/listing/listing-agent.tsx</C>; the page refreshes from the database when a reply
        ends.
      </P>
      <Table
        head={["Tool", "Input", "What it does"]}
        rows={[
          [<C key="a">set_field</C>, "key, label, value", "Changes or adds one line in the item card, by its exact key."],
          [<C key="b">set_price</C>, "price (whole dollars, at least 1)", "Sets the asking price and pulls the lowest price down to it if needed."],
          [<C key="c">set_lowest</C>, "lowest (whole dollars)", "Sets the private lowest price, never above the asking price."],
          [<C key="d">set_take_offers</C>, "takeOffers (true or false)", "Turns offers on or off."],
        ]}
      />
      <P>
        Each tool re-reads the row first, so several changes in one reply build on each other. The instructions carry every field
        with its key, the price, the lowest, and the research band, so the agent can say whether a price is high or low. The
        conversation is saved per step in <C>listing_message</C>, replaced in one transaction when a reply ends.
      </P>

      <H2 id="words">Words</H2>
      <P>
        <C>generateWords</C> in <C>lib/server/words.ts</C> writes the title, one-liner, description and teaser in one of four tones
        (Friendly, Playful, Straight to the point, A bit luxe). It takes an instruction: <C>take</C> (a fresh version),{" "}
        <C>shorter</C>, <C>longer</C>, or the seller&apos;s own words up to 500 characters.
      </P>
      <UL>
        <li>Lines the seller answered are marked &quot;seller said&quot; and win over research and their first description.</li>
        <li>The condition has to match the Condition line everywhere. No em dashes, emoji, hashtags or filler words.</li>
        <li>Title and one-liner are clipped at a word boundary to 80 and 120 characters; the teaser to 60.</li>
        <li>
          Every take is kept as a <C>listing_copy</C> row so the seller can step back through them. The one on screen is copied onto
          the listing, and a live listing gets a fresh search embedding.
        </li>
      </UL>

      <H2 id="store-agent">The shop agent</H2>
      <P>
        When a buyer writes, <C>answerBuyer</C> in <C>lib/server/store-agent.ts</C> runs after the response (started from{" "}
        <C>lib/server/messages.ts</C>). It answers on the fast model with <C>&#123; reply, handoff, skip &#125;</C>.
      </P>
      <H3>When it stays quiet</H3>
      <UL>
        <li>The shop has &quot;Answer buyers&apos; questions&quot; off (<C>shop.answerQuestions</C>, on by default).</li>
        <li>The owner wrote in the conversation in the last 15 minutes: they&apos;re here.</li>
        <li>A newer message arrived, before or while the model was thinking. That message&apos;s own run answers both.</li>
        <li>The buyer only said thanks or bye (<C>skip</C>).</li>
      </UL>
      <H3>What it may say</H3>
      <P>
        Only facts it&apos;s given: the listing&apos;s status, words, details, price, shipping and whether offers are on; research facts,
        flagged as being about the model in general; and up to 15 of the owner&apos;s own answers to other buyers about the same
        listing. That last one is how an answer given once feeds every later question. A message to the shop rather than a listing
        gets the shop&apos;s live listings instead.
      </P>
      <P>
        Anything it can&apos;t answer from those, or that needs the owner (holds, bundles, trades, more photos, returns), it says
        it&apos;s passed on and sets <C>handoff</C>. The message is posted with <C>needsSeller</C>, which flags the thread for the
        owner. It never agrees to a lower price or hints at the lowest one; it points to Make an offer. Buyer messages are treated as
        questions, not instructions.
      </P>

      <H2 id="negotiator">The negotiator</H2>
      <P>
        Every new offer runs <C>negotiate(offerId)</C> after the response (from <C>makeOffer</C> in <C>lib/server/commerce.ts</C>),
        when the shop has &quot;Haggle on offers&quot; on (<C>shop.haggle</C>, on by default). The floor is the listing&apos;s lowest
        price, or the shop&apos;s percentage off the price (<C>lowestPercent</C>, 15 by default) rounded to whole dollars.
      </P>
      <P>
        <C>planMove</C> decides, in plain code:
      </P>
      <OL>
        <li>An offer at or above the lowest is left for the owner with a note (&quot;That&apos;s above your lowest. I&apos;d take it.&quot;). The agent never says yes itself.</li>
        <li>Counters move in $5 steps when the price is $100 or more, $1 below that.</li>
        <li>The anchor is the last counter this buyer got on this listing, or the asking price.</li>
        <li>The counter is halfway between the offer and the anchor, rounded up to a step, and never under the lowest (itself rounded up, so a counter doesn&apos;t give the exact lowest away).</li>
        <li>It&apos;s capped at the anchor and at $1 under the price. If that leaves nothing above the offer, the agent stays firm and tells the owner.</li>
      </OL>
      <Table
        head={["Maya's dutch oven: $185, lowest $160", "Anchor", "Halfway", "Agent does"]}
        rows={[
          ["Jess offers $140", "$185", "$162.50, up to $165", "Counters at $165"],
          ["Jess comes back with $150", "$165", "$157.50, up to $160", "Counters at $160 (Maya's lowest)"],
          ["Jess offers $160", "", "", "Leaves it for Maya: at her lowest"],
        ]}
      />
      <P>
        A counter is written only if the offer is still open and unexpired, with 48 hours to answer. Then the buyer is told in their
        messages. The fast model writes that message, and it&apos;s used only if it contains the counter exactly and every dollar
        amount in it is the counter, the offer or the asking price. Otherwise, and without a key, a template goes instead.
      </P>

      <H2 id="sidekick">Shopping sidekick</H2>
      <P>
        &quot;Is this worth buying to resell?&quot; lives in <C>lib/server/sidekick.ts</C>. <C>startCheck</C> saves a{" "}
        <C>price_check</C> row and finishes in the background, usually in about a minute:
      </P>
      <OL>
        <li>
          <strong>Read.</strong> A pasted link opens in a Kernel browser (<C>readProductPage</C>: JSON-LD, <C>og:</C> tags and the
          start of the page text); typed words are used as they are. The fast model pulls out the name, a search query, details and
          the price, never inventing one.
        </li>
        <li>
          <strong>New price.</strong> When they didn&apos;t give a price, Channel3&apos;s top match&apos;s middle new offer.
        </li>
        <li>
          <strong>Comps.</strong> The same <C>findComps</C> as research.
        </li>
      </OL>
      <P>
        The score is what it likely sells for over what it costs: 0.6 or more &quot;Holds its value&quot;, 0.35 or more &quot;Keeps
        some of it&quot;, less &quot;Loses most of it&quot;.
      </P>

      <H2 id="fallbacks">Without the keys</H2>
      <P>Everything runs without keys; it just does less.</P>
      <Table
        head={["Feature", "Without it"]}
        rows={[
          [
            <span key="a">Research identify (<C>ANTHROPIC_API_KEY</C>)</span>,
            "The seller's words become the name, category Other, one Item line.",
          ],
          [
            <span key="b">Research price (<C>ANTHROPIC_API_KEY</C>)</span>,
            "fallbackVerdict: the median second-hand price (or half the new price, or $40), a band of 85 to 115 percent of it, and two stock questions (condition, when bought).",
          ],
          [<span key="c">Catalog and resale (<C>CHANNEL3_API_KEY</C>)</span>, "The step says \"Add CHANNEL3_API_KEY to search the catalog\" and pricing uses what's left."],
          [<span key="d">Listings step (<C>KERNEL_API_KEY</C> and Anthropic)</span>, "Left out of the run entirely."],
          ["Listing agent", "The chat route answers 503 with a note to add the key."],
          ["Words", "Returns a no-key message instead of copy."],
          ["Shop agent", "Says nothing. The owner answers as usual."],
          ["Negotiator", "Same maths, template message."],
          ["Shopping sidekick", "Needs Kernel and Anthropic; without them the page is a Coming soon screen."],
        ]}
      />
    </DocPage>
  );
}
