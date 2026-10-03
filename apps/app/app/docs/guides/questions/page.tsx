import type { Metadata } from "next";
import { A, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Questions and your shop agent" };

export default async function Questions() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/questions"
      eyebrow="Selling"
      title="Questions and your shop agent"
      lead="Buyers can message you about a listing or your shop. Your shop agent answers the easy questions right away, and hands you the rest."
      toc={[
        { id: "inbox", title: "Your inbox" },
        { id: "answers", title: "How the agent answers" },
        { id: "never", title: "What it never does" },
        { id: "needs-you", title: "When it needs you" },
        { id: "quiet", title: "When you're there, it steps back" },
        { id: "teach", title: "Your answers teach it" },
        { id: "off", title: "Turning it off" },
      ]}
    >
      <H2 id="inbox" className="mt-0">
        Your inbox
      </H2>
      <P>
        Everything buyers send you lands in your <A href={siteUrl("/inbox")}>Inbox</A>, sorted so the things that need you come
        first:
      </P>
      <Table
        head={["Section", "What's in it"]}
        rows={[
          [<strong key="a">New messages</strong>, "Conversations with something unread, plus any the agent handed to you (marked “A question for you”)."],
          [<strong key="b">Needs you</strong>, "Offers waiting for your answer."],
          [<strong key="c">To ship</strong>, "Things that sold and need sending."],
          [<strong key="d">Waiting on buyers</strong>, "Offers and counters where it's the buyer's turn."],
          [<strong key="e">Messages</strong>, "Conversations you've read."],
          [<strong key="f">Earlier</strong>, "Finished offers and sales."],
        ]}
      />
      <P>
        When it&apos;s all clear you&apos;ll see &quot;Nothing needs you right now&quot;. Each conversation is about one listing
        (or your shop in general) with one buyer. Messages can be up to 2,000 characters.
      </P>

      <H2 id="answers">How the agent answers</H2>
      <P>
        If <strong>Answer buyers&apos; questions</strong> is on for your shop, the agent replies as soon as a buyer writes. Its
        replies are labelled &quot;Your agent&quot; in your inbox, so you always know who said what. It answers only from:
      </P>
      <UL>
        <li>The listing: its words, details, price, whether it takes offers, and shipping.</li>
        <li>What research found about the product, as general information.</li>
        <li>Your own earlier answers to other buyers about the same listing.</li>
        <li>How buying works here: PayPal holds the money until it arrives, you ship within 3 days, and buyers get 3 days to check.</li>
      </UL>
      <P>
        So if Jess asks &quot;Does the dutch oven come with its lid?&quot; and your listing says so, she gets an answer straight
        away, even at 2am. If someone just says thanks, it doesn&apos;t reply.
      </P>

      <H2 id="never">What it never does</H2>
      <UL>
        <li>It never haggles in messages, and never hints at your lowest price. If a buyer asks for a deal, it points them to <strong>Make an offer</strong>.</li>
        <li>It never makes things up. If the answer isn&apos;t in the listing or your past answers, it hands it to you.</li>
        <li>It never agrees to anything on your behalf, like a hold, a trade or a meetup.</li>
      </UL>

      <H2 id="needs-you">When it needs you</H2>
      <P>
        Some things only you can answer: holding something for a buyer, bundling items, trades, meeting up, more photos, unusual
        shipping, or returns. For those, or anything it can&apos;t answer from the facts, the agent tells the buyer you&apos;ll
        reply in the same conversation. Then it flags it for you as <strong>A question for you</strong>, and it stays at the top
        of your Inbox under <strong>New messages</strong> until you reply, even after you&apos;ve opened it.
      </P>
      <Callout tone="tip">
        Reply when you can. A quick answer often turns a question into a sale.
      </Callout>

      <H2 id="quiet">When you&apos;re there, it steps back</H2>
      <P>
        If you&apos;ve written in a conversation in the last 15 minutes, the agent stays quiet there, so you and the buyer can
        talk without it chiming in. Fifteen minutes after your last message there, it picks up again.
      </P>

      <H2 id="teach">Your answers teach it</H2>
      <P>
        When you answer a question about a listing, the agent remembers it for that listing. Next time another buyer asks the
        same thing, it can answer with what you said, so the same question doesn&apos;t keep landing on you.
      </P>
      <P>
        If buyers keep asking about something, it&apos;s also worth adding it to the listing itself with{" "}
        <strong>Edit listing</strong>.
      </P>

      <H2 id="off">Turning it off</H2>
      <P>
        In your shop&apos;s settings, under <strong>What your agent may do</strong>, switch off{" "}
        <strong>Answer buyers&apos; questions</strong>. From then on, every message waits for you. This is per shop, so you can
        keep it on in one and off in another. See <A href={`${base}/guides/shops#agent`}>Open a shop</A>.
      </P>
    </DocPage>
  );
}
