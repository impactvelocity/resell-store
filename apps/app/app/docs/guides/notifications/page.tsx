import type { Metadata } from "next";
import { A, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Emails and notifications" };

export default async function Notifications() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/notifications"
      eyebrow="Both sides"
      title="Emails and notifications"
      lead="Every email comes from resell.store <hello@resell.store>. Here's what you'll get, when, and what you can turn off."
      toc={[
        { id: "buyers", title: "Emails buyers get" },
        { id: "sellers", title: "Emails sellers get" },
        { id: "settings", title: "Tell me when" },
        { id: "timing", title: "When emails go out" },
        { id: "in-app", title: "In the app" },
      ]}
    >
      <H2 id="buyers" className="mt-0">
        Emails buyers get
      </H2>
      <Table
        head={["Subject", "When"]}
        rows={[
          ["Your resell.store sign-in link", "You ask to sign in. Works once, for 15 minutes."],
          ["Your receipt: (item)", "Right after you pay."],
          ["(Shop) accepted your $X offer", "The seller says yes. You have 48 hours to pay."],
          ["(Shop) came back with $Y", "The seller, or their shop's agent, counters."],
          ["(Shop) passed on your $X offer", "The seller declines."],
          ["Pay for (item) by (time), or (Shop)'s counter runs out soon", "12 hours before a deal or a counter runs out."],
          ["Your offer on (item) ran out", "The seller didn't answer within 48 hours."],
          ["Your deal on (item) lapsed", "An accepted offer wasn't paid in time."],
          ["(Item) is on its way", "The seller marks it shipped, with tracking if they added it."],
          ["(Item) hasn't shipped yet", "The ship-by date passes. You can cancel for a refund or give them longer."],
          ["Refunded: (item)", "The order was cancelled before it shipped."],
          ["Did (item) arrive?", "7 days after it shipped, if you haven't said it's all good."],
          ["(Shop) replied about (item), (Shop) offered $X back", "Updates on a problem you reported."],
          ["resell.store is looking at (item)", "We've stepped in to decide a problem."],
          ["Refunded $X: (item)", "Money went back to you after a problem."],
          ["How was (item)?", "2 days after an order's done, asking for a review."],
          ["New at (shop): (item)", "A shop you follow listed something. Only if you turned it on."],
        ]}
      />

      <H2 id="sellers">Emails sellers get</H2>
      <Table
        head={["Subject", "When"]}
        rows={[
          ["(Buyer) offered $X for (item)", "A new offer, with your lowest and when it runs out."],
          ["(Buyer)'s $X offer runs out soon", "12 hours before an offer you haven't answered runs out."],
          ["(Buyer)'s offer ran out, (Buyer) didn't answer your counter", "An offer or counter ran out with no answer."],
          ["(Buyer) didn't pay for (item)", "You accepted, but they didn't pay within 48 hours."],
          ["Sold! (item) for $X", "A buyer paid. Shows the price, fees, your payout and the ship-by date."],
          ["Did you ship (item)?", "The ship-by date, 3 days after payment, passes and it isn't marked shipped."],
          ["Cancelled: (item)", "An order was cancelled before it shipped."],
          ["You've been paid for (item)", "The held money went to your PayPal, and why it was released."],
          ["(Buyer) reported a problem with (item)", "A buyer opened a problem. Your payout waits."],
          ["(Buyer) replied about (item), Sorted: (item)", "Updates on a problem."],
          ["Refunded $X to (buyer)", "Money went back to the buyer after a problem."],
          ["(Buyer) gave (item) N stars", "A new review."],
          ["Your (day): N things need you, or all handled", "Your evening agent summary, only when something happened."],
        ]}
      />
      <P>
        Sellers who also buy get the buyer emails too. It&apos;s one account for both.
      </P>

      <H2 id="settings">Tell me when</H2>
      <P>
        Every email has a <strong>Change what we email you</strong> link at the bottom that opens your settings at{" "}
        <A href={siteUrl("/me")}>resell.store/me</A>. Under <strong>Tell me when</strong> there are four switches:
      </P>
      <Table
        head={["Switch", "Starts", "What it does today"]}
        rows={[
          ["Someone makes an offer", "On", "Offer emails always come, so you never miss one."],
          ["Something sells", "On", "Sale emails always come, so you never miss a sale."],
          ["My agent does something for me", "On", "Turns the evening agent summary on or off."],
          ["A shop I follow lists something", "Off", "Turns emails about new listings from shops you follow on or off."],
        ]}
      />
      <Callout tone="note" title="The important ones always come">
        Emails about your orders and offers always come, whatever your switches say, so nothing important is missed: receipts,
        shipping, money held and released, refunds and problems.
      </Callout>

      <H2 id="timing">When emails go out</H2>
      <UL>
        <li>
          Things you or the other person do, like paying, answering an offer or marking it shipped, send an email right away.
        </li>
        <li>
          Timed emails, like reminders, &quot;ran out&quot; notices and &quot;Did it arrive?&quot;, go out from checks that run
          about every 15 minutes, so they can land up to a quarter of an hour after the moment itself.
        </li>
        <li>
          The evening agent summary goes out once a day in the early evening, US time, and only when there&apos;s something to
          tell you.
        </li>
        <li>
          Emails about shops you follow are rolled up: one per shop, covering everything it listed since the last one.
        </li>
      </UL>

      <H2 id="in-app">In the app</H2>
      <UL>
        <li>
          <strong>The unread dot</strong>: the Messages icon in the header gets a dot when a shop or a buyer has written to you.
        </li>
        <li>
          <strong>Inbox</strong>, for sellers, gathers new messages, offers that need you, things to ship and offers waiting on
          buyers in one place. Questions your shop agent hands to you show under <strong>New messages</strong>, marked{" "}
          <strong>A question for you</strong>; <strong>Needs you</strong> is just for offers. When it&apos;s clear it says &quot;Nothing needs you right now&quot;.
        </li>
        <li>
          <strong>New badges</strong>: on <A href={siteUrl("/account")}>your account</A>, anything that changed since your last
          visit is marked New, with a count at the top. See <A href={`${base}/guides/after-you-buy`}>After you buy</A>.
        </li>
      </UL>
      <P>
        Email is the only way we reach you for now.
      </P>
    </DocPage>
  );
}
