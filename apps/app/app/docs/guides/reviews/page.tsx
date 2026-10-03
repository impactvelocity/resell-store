import type { Metadata } from "next";
import { A, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Reviews" };

export default async function Reviews() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/reviews"
      eyebrow="Both sides"
      title="Reviews"
      lead="Only people who actually bought something can review a shop, so every star on resell.store comes from a real sale."
      toc={[
        { id: "who", title: "Who can review, and when" },
        { id: "writing", title: "Leaving a review" },
        { id: "public", title: "Public or private" },
        { id: "editing", title: "Changing it later" },
        { id: "reply", title: "Replying as the seller" },
        { id: "showing", title: "Where reviews show" },
      ]}
    >
      <H2 id="who" className="mt-0">
        Who can review, and when
      </H2>
      <UL>
        <li>
          You can review an order once it&apos;s <strong>All done</strong>: you tapped It&apos;s all good, or the checking time
          passed and the seller was paid. See <A href={`${base}/guides/after-you-buy`}>After you buy</A>.
        </li>
        <li>One review per order. Bought two things from the same shop? You can review each one.</li>
        <li>
          2 days after an order&apos;s done, we email you &quot;How was&quot; and the item&apos;s name, with a link straight to the
          stars.
        </li>
      </UL>

      <H2 id="writing">Leaving a review</H2>
      <OL>
        <li>
          Open the order from <A href={siteUrl("/account")}>your account</A> (or tap <strong>Leave a review</strong> there). The
          panel asks &quot;How did it go?&quot;
        </li>
        <li>Pick from 1 to 5 stars.</li>
        <li>
          Add a few words if you like, up to 1,000 characters. Was it as described? How was the packing?
        </li>
        <li>
          Tap <strong>Post review</strong>.
        </li>
      </OL>
      <Table
        head={["Stars", "Means"]}
        rows={[
          ["1", "Not good"],
          ["2", "Could be better"],
          ["3", "It was fine"],
          ["4", "Good"],
          ["5", "Loved it"],
        ]}
      />

      <H2 id="public">Public or private</H2>
      <P>
        <strong>Show this on the shop</strong> is on to start with. Leave it on and anyone can read your review on the shop and the
        listing. Turn it off and only the seller sees it: handy for feedback you&apos;d rather give quietly.
      </P>
      <Callout tone="note" title="Just your first name">
        Public reviews show your first name only. Never your surname or your email.
      </Callout>

      <H2 id="editing">Changing it later</H2>
      <P>
        For 30 days after you post it, you can open the order and tap <strong>Change your review</strong> to change the stars, the
        words, or whether it&apos;s public. After that it stays as it is.
      </P>

      <H2 id="reply">Replying as the seller</H2>
      <P>
        When a buyer reviews you, we email you with their stars. Open the sale from{" "}
        <A href={siteUrl("/sales")}>Sales</A> to read it, write your reply under it and tap <strong>Post reply</strong>.
      </P>
      <UL>
        <li>You get one reply per review, up to 1,000 characters. You can change it later.</li>
        <li>On a public review, your reply shows right under it on your shop.</li>
        <li>On a private review, only the buyer sees your reply.</li>
      </UL>
      <Callout tone="tip">
        A short, kind reply to a so-so review often says more to future buyers than the stars do. Thank them, say what happened,
        and what you&apos;ve changed.
      </Callout>

      <H2 id="showing">Where reviews show</H2>
      <UL>
        <li>
          The shop&apos;s stars and &quot;from N buyers&quot; at the top of its page, and the <strong>Reviews</strong> tab with
          each one.
        </li>
        <li>
          <strong>What buyers say</strong> on the shop page, and reviews on its listings.
        </li>
        <li>The shop&apos;s rating on the Stores list.</li>
      </UL>
      <P>
        Only public reviews count toward a shop&apos;s rating. resell.store can take down a review that&apos;s abusive or breaks
        the rules; it then disappears from the shop and the rating, and can&apos;t be changed.
      </P>
    </DocPage>
  );
}
