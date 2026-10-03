import type { Metadata } from "next";
import { A, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Stats" };

export default async function Stats() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/stats"
      eyebrow="Selling"
      title="Stats"
      lead="See how your shops are doing: who's looking, what they like, where they came from, and what you've made."
      toc={[
        { id: "open", title: "Opening your stats" },
        { id: "tiles", title: "The numbers" },
        { id: "made", title: "What you made" },
        { id: "views", title: "What counts as a view" },
        { id: "sources", title: "Where buyers came from" },
        { id: "listing", title: "Stats for one listing" },
      ]}
    >
      <H2 id="open" className="mt-0">
        Opening your stats
      </H2>
      <P>
        Tap <A href={siteUrl("/stats")}>Stats</A> in the menu. Your stats appear once one of your shops has had something live or
        sold. Before that, there&apos;s nothing to count yet.
      </P>
      <UL>
        <li>
          Pick <strong>All shops</strong> or just one.
        </li>
        <li>
          Pick a period: <strong>Last 7 days</strong>, <strong>Last 30 days</strong> (where it starts),{" "}
          <strong>Last 90 days</strong> or <strong>This year</strong>.
        </li>
      </UL>
      <P>Most numbers are compared with the period before, so you can see if things are picking up.</P>

      <H2 id="tiles">The numbers</H2>
      <Table
        head={["Tile", "What it counts"]}
        rows={[
          [<strong key="a">Views</strong>, "Visits to your shop and listing pages in the period."],
          [<strong key="b">Likes</strong>, "Hearts in the period, plus how many of your things are saved right now."],
          [<strong key="c">Shares</strong>, "Times people shared your shop or listings."],
          [<strong key="d">Shop followers</strong>, "Everyone following your shop, and how many are new."],
          [<strong key="e">Offers</strong>, "Offers made, and how many turned into sales."],
          [<strong key="f">Sold</strong>, "Things sold in the period."],
        ]}
      />

      <H2 id="made">What you made</H2>
      <P>
        <strong>You made</strong> is what you earned in the period after fees. Refunds and cancelled sales are left out, so
        it&apos;s money you actually keep. Next to it you&apos;ll see:
      </P>
      <UL>
        <li>
          <strong>Things sold</strong>
        </li>
        <li>
          <strong>Average sale</strong>
        </li>
        <li>
          <strong>Days to sell, typically</strong>: how long things usually take from going live to selling.
        </li>
      </UL>
      <P>
        A chart shows your earnings across the period. Prefer numbers? Tap <strong>See as a table</strong>.
      </P>
      <P>
        <strong>Most looked at</strong> shows your top three listings by views. If one of them gets lots of views but no offers,
        its price may be a little high. See <A href={`${base}/guides/pricing#tips`}>Pricing tips</A>.
      </P>

      <H2 id="views">What counts as a view</H2>
      <UL>
        <li>Your own visits never count.</li>
        <li>Search engines, link previews and other bots don&apos;t count.</li>
        <li>The same person looking at the same page again within 30 minutes counts once.</li>
      </UL>
      <Callout tone="note">
        So a view is a real person, other than you, actually looking. That&apos;s why your numbers may look lower than on sites
        that count everything.
      </Callout>

      <H2 id="sources">Where buyers came from</H2>
      <Table
        head={["Source", "Means"]}
        rows={[
          [<strong key="a">Your link</strong>, "They opened your link directly: typed it, or tapped it in a message or an app that doesn't say where it came from."],
          [<strong key="b">Marketplace</strong>, "They came from resell.store: browsing, searching there, or from another shop."],
          [<strong key="c">Your store page</strong>, "They clicked through from your shop's own page."],
          [<strong key="d">Search</strong>, "From a search engine like Google or Bing."],
          [<strong key="e">Social</strong>, "From Instagram, Facebook, TikTok, Pinterest, Reddit and the like."],
          [<strong key="f">QR code</strong>, "They scanned your QR code from the share kit."],
          [<strong key="g">Other sites</strong>, "Anywhere else."],
        ]}
      />

      <H2 id="listing">Stats for one listing</H2>
      <P>
        Open any listing from your shop to see how it&apos;s doing: views, views this week, likes, shares and offers. And when you
        visit your own shop or listing pages while signed in, a slim line of stats shows there with a link to the full numbers.
        Only you see it; buyers never do.
      </P>
    </DocPage>
  );
}
