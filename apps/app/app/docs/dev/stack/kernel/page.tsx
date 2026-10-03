import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "Kernel · Developers" };

export default async function KernelPage() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/kernel"
      eyebrow="Built with"
      title="Kernel"
      lead="Kernel runs cloud browsers. resell.store uses them to read what the same item is listed for on eBay, Poshmark and Depop right now, and to read product pages people paste into the shopping sidekick."
      toc={[
        { id: "what", title: "What it does here" },
        { id: "browsers", title: "Browsers and limits" },
        { id: "comps", title: "Comps, step by step" },
        { id: "listed-not-sold", title: "Listing prices, not sold prices" },
        { id: "sidekick", title: "Reading pasted links" },
        { id: "not-built", title: "Not built yet" },
        { id: "unlocks", title: "What it unlocks" },
        { id: "without", title: "Without it" },
        { id: "setup", title: "Setup" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What it does here
      </H2>
      <P>
        <C>lib/server/kernel.ts</C> wraps <C>@onkernel/sdk</C>. It opens a headless browser, runs a short Playwright script in it, and
        closes it. <C>lib/server/comps.ts</C> makes sense of what comes back, with the AI model.
      </P>
      <Table
        head={["Function", "What it does"]}
        rows={[
          [<C key="a">searchSite(site, queries)</C>, "Searches one marketplace with each query in turn until it has 12 listing cards, then returns each card's link, text (with its price) and photo."],
          [<C key="b">readProductPage(url)</C>, <span key="b2">Opens a product page and returns its title, <C>og:</C> price and image, JSON-LD and the start of the page text.</span>],
          [<C key="c">withBrowser(fn)</C>, "Creates a browser, runs fn, always deletes the browser, and queues when too many are open."],
        ]}
      />

      <H2 id="browsers">Browsers and limits</H2>
      <UL>
        <li>
          Browsers are created with <C>headless: true</C> and <C>timeout_seconds: 120</C>; each Playwright run gets{" "}
          <C>timeout_sec: 55</C>.
        </li>
        <li>
          At most <C>KERNEL_MAX_BROWSERS</C> are open at once (default 5, the free plan&apos;s limit). Extra ones wait in a queue, and a
          create that still hits the cap (another process) retries up to 5 times with a growing wait.
        </li>
        <li>
          One browser per site, side by side, so a site that hangs or blocks can&apos;t take the others down. Each site gets 45
          seconds; after that comps go ahead with whatever it found. Once a site has some cards, another query only runs if it&apos;s
          under 25 seconds in.
        </li>
        <li>Images, media and fonts are blocked. Pages load faster and don&apos;t crash, and cards keep their image links.</li>
        <li>
          Plain browsers, not stealth: in testing the stealth proxy made eBay serve error pages. eBay&apos;s &quot;something went
          wrong&quot; page is retried up to three times. Mercari crashed the page every time, so it isn&apos;t searched.
        </li>
      </UL>

      <H2 id="comps">Comps, step by step</H2>
      <P>
        <C>findComps</C> in <C>lib/server/comps.ts</C>, used by research and the sidekick:
      </P>
      <OL>
        <li>The fast model writes 1 to 3 search queries the way a reseller would type them, most specific first.</li>
        <li>eBay, Poshmark and Depop are searched at once, one browser each. Up to 16 cards from each site are kept, so one big site doesn&apos;t crowd out the rest.</li>
        <li>
          The main model checks every card against the item: the <C>same</C> model (any colour), a <C>bundle</C> with real extras, or{" "}
          <C>different</C> (another generation or size, parts, lots, broken). It reads the asking price and the condition.
        </li>
        <li>
          Exact matches are kept. With fewer than 5, bundles fill in. Asks under 40 percent or over 250 percent of the median are
          dropped as typos, and up to 10 are kept, taken from each site in turn.
        </li>
        <li>
          The numbers come from used listings (and ones that don&apos;t say) when there are at least two: the listed median and
          quartiles, and a <strong>sells-for range of 85 to 100 percent of the listed median</strong>, rounded to the dollar, with
          92 percent as the single estimate. Confidence is high with 6 or more tightly clustered matches, medium with 3, low
          otherwise.
        </li>
      </OL>
      <CodeBlock
        title="On the research step"
        tone="paper"
        code={`8 like it listed now\nListed around $210, so likely sells for $179 to $210`}
      />

      <H2 id="listed-not-sold">Listing prices, not sold prices</H2>
      <P>
        What something actually sold for is the best evidence, but it&apos;s out of reach. eBay&apos;s sold and completed search moved
        behind a sign-in in 2026, and its official sold-data APIs are shut down or closed to new apps. Searching signed in to a
        real account would break eBay&apos;s terms. So comps read what the same thing is listed for right now and assume it sells a
        little under that. The page says what things are listed for, never what they sold for. The price prompt tells the model the same:
        listings usually sell 0 to 15 percent under their ask.
      </P>
      <P>
        The longer write-up, with the options that were weighed, is <C>docs/sold-prices.md</C> in the repo.
      </P>

      <H2 id="sidekick">Reading pasted links</H2>
      <P>
        When a shopper pastes a link into the sidekick, <C>readProductPage</C> opens it, waits for the page to settle, and pulls the
        structured data shops publish (JSON-LD, <C>og:title</C>, <C>product:price:amount</C>, <C>og:image</C>) plus the first 2,500
        characters of text. The fast model reads that to name the item and its price, then <C>findComps</C> runs on it. See{" "}
        <A href={`${base}/dev/agents`}>Research and agents</A>.
      </P>

      <H2 id="not-built">Not built yet</H2>
      <Callout tone="warn" title="Signed-in sites are not wired">
        There&apos;s groundwork for searching with a seller&apos;s own signed-in profile through Kernel&apos;s managed auth (
        <C>lib/server/market-logins.ts</C>, the <C>market_login</C> table and a sold-search URL for eBay), which would open up
        eBay&apos;s sold prices and Facebook Marketplace. Nothing calls it. Comps today search public listings on eBay, Poshmark and
        Depop only.
      </Callout>

      <H2 id="unlocks">What it unlocks</H2>
      <UL>
        <li>Prices grounded in what the same thing is for sale for today, checked one listing at a time, not a guess.</li>
        <li>A &quot;Listed now on eBay, Poshmark and Depop&quot; source on the findings sheet, with links to each listing.</li>
        <li>The shopping sidekick: &quot;is this worth buying to resell?&quot; with a holds-its-value score.</li>
        <li>Reading product pages that don&apos;t have an API.</li>
      </UL>

      <H2 id="without">Without it</H2>
      <P>
        Comps need both <C>KERNEL_API_KEY</C> and <C>ANTHROPIC_API_KEY</C> (<C>compsConfigured</C>). Without them the research run
        has no &quot;Listings&quot; step and prices from Channel3 and the model alone, and the sidekick page shows a Coming soon
        screen.
      </P>

      <H2 id="setup">Setup</H2>
      <CodeBlock
        title="apps/app/.env.local"
        code={`KERNEL_API_KEY=…            # from kernel.sh\nKERNEL_MAX_BROWSERS=5       # optional: raise it on a paid plan`}
      />
      <P>
        A comps run takes most of a minute (queries, about 45 seconds of browsing at most, then matching), which is why research
        starts it straight after identifying the item and collects it last.
      </P>
    </DocPage>
  );
}
