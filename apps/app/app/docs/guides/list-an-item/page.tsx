import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, OL, P, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "List an item" };

export default async function ListAnItem() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/list-an-item"
      eyebrow="Selling"
      title="List an item"
      lead="Five short steps take you from a photo to a live listing: research, details, photos, words, publish. It usually takes about five minutes."
      toc={[
        { id: "start", title: "Start with a photo" },
        { id: "research", title: "1. Research" },
        { id: "details", title: "2. Details" },
        { id: "photos", title: "3. Photos" },
        { id: "words", title: "4. Words" },
        { id: "publish", title: "5. Publish" },
        { id: "drafts", title: "Drafts" },
        { id: "manage", title: "After it's live" },
        { id: "shipping", title: "Shipping price" },
      ]}
    >
      <H2 id="start" className="mt-0">
        Start with a photo
      </H2>
      <P>
        Tap <strong>List something new</strong>. If you have more than one shop, pick which one it goes in. Then tell us what
        you&apos;re selling: <strong>Take a photo</strong> (or drop one in on a computer), type a few words like &quot;yellow Le
        Creuset dutch oven, 5.5 qt, used twice&quot;, or both. Tap <strong>Look it up for me</strong>.
      </P>
      <P>
        At any point you can tap <strong>Save and close</strong> and come back later.
      </P>

      <H2 id="research">1. Research</H2>
      <P>
        The agent works out what your thing is, finds it in a catalog of about 100 million products, and looks at what similar
        ones are listed for on popular marketplaces. The page updates as it goes. When it&apos;s done you see a price range and
        a suggested price. <A href={`${base}/guides/pricing`}>Prices and research</A> explains where the numbers come from.
      </P>
      <P>
        Then it asks you one to four quick questions, starting with condition (Like new, Gently used, Well loved or Has a flaw).
        Skip any you like. Tap <strong>Looks right, on to details</strong>.
      </P>

      <H2 id="details">2. Details</H2>
      <P>
        <strong>Check the details</strong> shows what the agent knows: brand, colour, size and so on. Tap a line to change it, or
        just tell the agent in the chat (&quot;it&apos;s the 5.5 quart, not the 4.5&quot;). Here you also set:
      </P>
      <UL>
        <li>
          <strong>Your price</strong>, anywhere from $1 to $100,000.
        </li>
        <li>
          <strong>Lowest you&apos;d take</strong>. Your agent won&apos;t go under this, and buyers never see it.
        </li>
        <li>
          <strong>Take offers</strong>, on to start with. Turn it off and buyers can only pay your price.
        </li>
      </UL>

      <H2 id="photos">3. Photos</H2>
      <P>
        Add up to 12 photos (10 MB each) and one short video (up to 40 MB). Drag them to change the order. The first one is the
        cover, and it has to be your own photo.
      </P>
      <P>
        The agent may also find pictures of the same product from the maker or a shop, under <strong>Found on the web</strong>.
        You can add those too, and they&apos;re credited to the site they came from.
      </P>
      <Callout tone="tip" title="Photos that sell">
        Listings with four or more photos sell faster. Buyers look for the whole thing in good light; the front, back and sides;
        close-ups of labels, marks or wear; and a short video.
      </Callout>

      <H2 id="words">4. Words</H2>
      <P>
        The agent writes a first take as soon as you arrive: a title (up to 80 characters), a one-line summary, and a short
        description. Pick a tone: <strong>Friendly</strong>, <strong>Playful</strong>, <strong>Straight to the point</strong> or{" "}
        <strong>A bit luxe</strong>.
      </P>
      <UL>
        <li>
          Not quite right? Try <strong>Another take</strong>, <strong>Shorter</strong> or <strong>More detail</strong>, or ask in
          your own words (&quot;mention the lid is included&quot;).
        </li>
        <li>Every version is kept, so you can step back to an earlier one. You can also edit by hand.</li>
        <li>
          <strong>Save as my usual style</strong> remembers your tone and length for next time.
        </li>
        <li>
          <strong>How buyers see it</strong> shows a preview.
        </li>
      </UL>
      <P>
        Happy? Tap <strong>Use these words</strong>.
      </P>

      <H2 id="publish">5. Publish</H2>
      <P>A listing needs a title and a price to go live. Choose who can see it:</P>
      <UL>
        <li>
          <strong>Everyone</strong>: in your shop and on the resell.store marketplace.
        </li>
        <li>
          <strong>Only people with the link</strong>: hidden from your shop page and the marketplace.
        </li>
      </UL>
      <P>
        Tap <strong>Publish listing</strong>. Its web address is made from the title and stays the same for good. Under{" "}
        <strong>Share it</strong> you can <strong>Copy link</strong> or grab the share kit: a square post, a tall story and a QR
        code for yard sales.
      </P>

      <H2 id="drafts">Drafts</H2>
      <P>
        Anything you haven&apos;t published is a draft. Home shows <strong>Pick up where you left off</strong> with your latest
        one, and your shop&apos;s <strong>Drafts</strong> tab lists them all with how far each got. Opening a draft takes you back
        to the furthest step you reached.
      </P>

      <H2 id="manage">After it&apos;s live</H2>
      <P>
        Open a listing from your shop to see how it&apos;s doing (views, likes, shares and offers) along with its offers and
        questions. From there:
      </P>
      <H3>Edit listing</H3>
      <P>Change anything. It stays live while you do.</P>
      <H3>Take it down</H3>
      <P>
        It goes back to being a draft and nobody can see it until you publish it again. The link stays the same. You can&apos;t
        take something down once someone has paid for it.
      </P>
      <H3>Mark as sold</H3>
      <P>
        Sold it somewhere else? Mark it sold so buyers know. <strong>Put it back up</strong> if that falls through. Things sold
        through resell.store are marked sold for you.
      </P>

      <H2 id="shipping">Shipping price</H2>
      <P>
        Buyers pay for shipping on top of your price. Unless you change it, it&apos;s a flat $9 for tracked shipping, and buyers
        can choose express for $12 more. Right now there&apos;s no place in the app to change the shipping price; it can only be
        changed through the <A href={`${base}/api`}>API</A>. Ship it and mark it shipped as described in{" "}
        <A href={`${base}/guides/sales`}>Sales and shipping</A>.
      </P>
      <P>
        Ready? <A href={siteUrl("/list/new")}>List something new</A>.
      </P>
    </DocPage>
  );
}
