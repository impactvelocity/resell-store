import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, DocPage, H2, OL, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "Channel3 · Developers" };

const call = `POST https://api.trychannel3.com/v1/search
x-api-key: $CHANNEL3_API_KEY
Content-Type: application/json

{
  "query": "Le Creuset round dutch oven 5.5 qt yellow",
  "base64_image": "<the seller's first photo>",
  "limit": 10
}`;

export default async function Channel3() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/channel3"
      eyebrow="Built with"
      title="Channel3"
      lead="Channel3 is a product catalog across retailers. resell.store sends it the seller's photo and the name the AI model gave the item, and gets back the matching product, what it costs new, any second-hand offers, and the maker's photos."
      toc={[
        { id: "what", title: "What it does here" },
        { id: "call", title: "The call" },
        { id: "research", title: "In research" },
        { id: "sidekick", title: "In the sidekick" },
        { id: "unlocks", title: "What it unlocks" },
        { id: "without", title: "Without it" },
        { id: "setup", title: "Setup" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What it does here
      </H2>
      <P>
        The client is <C>lib/server/channel3.ts</C>, about 80 lines: one search call and two filters over the offers that come back.
        A product has a title, brands, images, a category and offers, and each offer has a shop domain, a price and a condition.
      </P>
      <Table
        head={["Function", "What it does"]}
        rows={[
          [<C key="a">searchProducts(&#123; query, base64Image, limit &#125;)</C>, "Text and photo search. A photo plus a few words matches best. Default limit 8."],
          [<C key="b">newOffers(products)</C>, <span key="b2">Offers that are the item new (anything not <C>used</C> or <C>refurbished</C>), with a price.</span>],
          [<C key="c">usedOffers(products)</C>, <span key="c2">Offers marked <C>used</C>: the item for sale second hand on resale shops.</span>],
        ]}
      />

      <H2 id="call">The call</H2>
      <CodeBlock title="What searchProducts sends" code={call} />
      <P>Requests time out after 20 seconds. A non-2xx response throws, and research catches it.</P>

      <H2 id="research">In research</H2>
      <P>
        After the AI model identifies the item, <C>lib/server/research.ts</C> searches Channel3 with its search query and the first photo,
        10 results. See <A href={`${base}/dev/agents`}>Research and agents</A> for the whole run.
      </P>
      <OL>
        <li>
          <strong>Catalog step.</strong> The first product is the match (&quot;Matched Le Creuset Signature Round Dutch Oven&quot;).
          The cheapest new offer becomes the detail line: &quot;New from $X at lecreuset.com&quot;.
        </li>
        <li>
          <strong>Resale step.</strong> <C>usedOffers</C> on the same results: how many are for sale second hand, the price range,
          and on which sites.
        </li>
        <li>
          <strong>Pricing.</strong> Up to 8 new and 12 used offers go into the price prompt, each with its price, domain and title,
          next to the live listings from Kernel.
        </li>
        <li>
          <strong>Sources.</strong> Up to 8 of each become the &quot;For sale second hand&quot; and &quot;What it costs new&quot;
          source cards on the findings sheet, with links and images.
        </li>
        <li>
          <strong>Maker photos.</strong> Up to 6 of the match&apos;s images are offered on the photos step, credited to the shop they
          came from.
        </li>
      </OL>

      <H2 id="sidekick">In the sidekick</H2>
      <P>
        When a shopper doesn&apos;t say what something costs, <C>newPrice()</C> in <C>lib/server/sidekick.ts</C> searches Channel3 (5
        results) and takes the middle new offer of the top match as the price to compare against.
      </P>

      <H2 id="unlocks">What it unlocks</H2>
      <UL>
        <li>Knowing exactly which model it is, not just &quot;a pot&quot;, which makes every other step sharper.</li>
        <li>A new price to anchor against. Used things usually go for 30 to 70 percent of it.</li>
        <li>Second-hand offers from resale shops alongside the marketplace listings Kernel reads.</li>
        <li>Clean maker photos for sellers who only took one quick picture.</li>
        <li>Links buyers and sellers can check for themselves on the findings sheet.</li>
      </UL>

      <H2 id="without">Without it</H2>
      <P>
        Without <C>CHANNEL3_API_KEY</C> the catalog step finishes as failed with &quot;Add CHANNEL3_API_KEY to search the
        catalog&quot;, the resale step finds none, and pricing works from the Kernel listings (if set up) and the model, or the
        numbers alone. There are no maker photos, and the sidekick can only score items whose price the shopper gives.
      </P>

      <H2 id="setup">Setup</H2>
      <CodeBlock title="apps/app/.env.local" code={`CHANNEL3_API_KEY=…   # from trychannel3.com/developers`} />
    </DocPage>
  );
}
