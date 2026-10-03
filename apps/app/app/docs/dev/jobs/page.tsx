import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Background jobs · Developers" };

export default async function Jobs() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/jobs"
      eyebrow="Developers"
      title="Background jobs"
      lead="Offers run out, sellers get nudged, unshipped orders are refunded and held money is released, all without anyone clicking. Here's what runs, when, and how it's started."
      toc={[
        { id: "timed", title: "What's timed" },
        { id: "workflow", title: "The workflow and the cron" },
        { id: "once", title: "Never twice" },
        { id: "fallback", title: "Without Render" },
        { id: "demo", title: "Shrinking the days" },
        { id: "after-response", title: "Work after the response" },
      ]}
    >
      <H2 id="timed" className="mt-0">
        What&apos;s timed
      </H2>
      <P>
        All of it is in <C>apps/app/lib/server/sweeps.ts</C>, with the money timings in <C>payout-policy.ts</C>. Each sweep looks
        for what&apos;s due right now and acts on it, so the timings below are &quot;at the first sweep after&quot;.
      </P>
      <H3>Offers (offerSweep)</H3>
      <Table
        head={["Job", "When", "What happens"]}
        rows={[
          [<C key="a">expireOffers</C>, "expires_at has passed (48 hours after the last move)", <>Open, countered or accepted offers become <C key="x">expired</C>; an <C key="y">offer.updated</C> webhook and emails to both sides</>],
          [<C key="b">remindOffers</C>, "12 hours before expiry", "The seller if it's theirs to answer, otherwise the buyer"],
        ]}
      />
      <H3>Orders (orderSweep)</H3>
      <Table
        head={["Job", "When", "What happens"]}
        rows={[
          [<C key="a">remindShipping</C>, "3 days after payment, still not shipped", "\"Did you ship it?\" to the seller; the buyer is told they can now cancel"],
          [<C key="b">cancelUnshipped</C>, "7 days after payment, still not shipped", "Order cancelled, the buyer refunded in full, both told"],
          [<C key="c">checkArrivals</C>, "7 days after shipping", "\"Did it arrive?\" to the buyer, unless there's an open problem"],
          [<C key="d">releaseDue</C>, "13 days after shipping, if the buyer hasn't confirmed it arrived", "Order completed and the held money released to the seller through PayPal, unless there's an open problem. There's no carrier tracking, so delivery is assumed 10 days after shipping, then the buyer gets a 3-day check window. Never later than 27 days after payment, a day inside PayPal's own 28-day release"],
          [<C key="e">escalateQuiet</C>, "3 days after a buyer reports a problem the seller hasn't answered", "Escalated to resell.store, with a note that the seller didn't answer in time"],
        ]}
      />
      <P>
        Most orders never wait for this: when the buyer taps <strong>It&apos;s all good</strong>, the order completes and the money is released right away. <C>releaseDue</C> also retries completed PayPal orders whose release failed earlier (<C>released_at</C> still empty).
      </P>
      <H3>Roll-ups (digestSweep)</H3>
      <Table
        head={["Job", "When", "What happens"]}
        rows={[
          [<C key="a">sendFollowDigests</C>, "Whenever a followed shop has published something since the last one", "\"New from shops you follow\", one email per shop. Off by default; people turn it on in their settings"],
          [<C key="b">sendAgentSummaries</C>, <>Once a day, from <C key="x">AGENT_SUMMARY_HOUR</C> UTC (default 1, early evening in the US)</>, "The seller's summary of what their shop's agent did and what's waiting on them. On by default"],
          [<C key="c">requestReviews</C>, "2 days after an order completes (up to 30 days)", "\"How was it?\" to the buyer, once, if they haven't reviewed"],
        ]}
      />
      <H3>Webhooks (webhookSweep)</H3>
      <P>
        Failed deliveries to a seller&apos;s webhook are tried again after 5 minutes, 30 minutes, 2 hours, 6 hours and 24 hours, then
        given up. Since the sweep runs every 15 minutes, the short waits round up to the next sweep. An endpoint that has been
        failing for 3 days is turned off. Deliveries are kept 30 days and API activity 90.
      </P>

      <H2 id="workflow">The workflow and the cron</H2>
      <P>
        In production the sweeps run as tasks on the <C>resell-sweeps</C> Render Workflow (<C>apps/app/workflows/main.ts</C>).
        Workflows can&apos;t schedule themselves, so the <C>resell-sweeps-cron</C> Render Cron Job runs{" "}
        <C>scripts/start-sweeps.ts</C> every 15 minutes, which starts four tasks and exits:
      </P>
      <CodeBlock
        title="scripts/start-sweeps.ts"
        code={`const slot = Math.floor(Date.now() / (15 * 60 * 1000));
for (const name of ["offerSweep", "orderSweep", "digestSweep", "webhookSweep"]) {
  await render.workflows.startTask(\`\${slug}/\${name}\`, [], { idempotencyKey: \`\${name}-\${slot}\` });
}`}
      />
      <P>
        The idempotency key is the task name plus the quarter hour, so if the cron fires twice in the same slot Render starts each
        sweep only once.
      </P>
      <Table
        head={["Task", "Retries", "Timeout"]}
        rows={[
          [<C key="a">offerSweep</C>, "2, from 30 s, doubling", "10 min"],
          [<C key="b">orderSweep</C>, "2, from 30 s, doubling", "30 min"],
          [<C key="c">digestSweep</C>, "2, from 30 s, doubling", "30 min"],
          [<C key="d">webhookSweep</C>, "2, from 30 s, doubling", "15 min"],
          [<C key="e">releaseOrder</C>, "6, from 60 s, doubling", "2 min"],
          [<C key="f">cancelUnshipped</C>, "6, from 60 s, doubling", "2 min"],
        ]}
      />
      <P>
        <C>orderSweep</C> doesn&apos;t move money itself. It finds the orders due for cancelling or releasing and starts one{" "}
        <C>cancelUnshipped</C> or <C>releaseOrder</C> task per order with <C>ctx.run</C>. If PayPal refuses a release, that task
        throws and Render retries just that order, with backoff, while the others carry on.
      </P>

      <H2 id="once">Never twice</H2>
      <UL>
        <li>
          <strong>Reminders are claimed first.</strong> Before sending one, a sweep inserts <C>(kind, ref_id)</C> into the{" "}
          <C>notice</C> table with <C>on conflict do nothing</C>. If no row comes back, someone already sent it. Kinds include{" "}
          <C>offer.open-reminder</C>, <C>order.ship-reminder</C>, <C>order.arrival-check</C>, <C>order.paid-out</C> and{" "}
          <C>agent-summary:YYYY-MM-DD</C>.
        </li>
        <li>
          <strong>State changes re-check the row.</strong> Expiring an offer updates it only if its status hasn&apos;t moved;
          completing an order only if it&apos;s still shipped. A sweep that runs twice, or two at once, does nothing
          extra.
        </li>
        <li>
          <strong>Webhook retries are claimed</strong> by pushing <C>next_attempt_at</C> ten minutes ahead before sending.
        </li>
      </UL>

      <H2 id="fallback">Without Render</H2>
      <P>
        <C>POST /api/cron/sweep</C> runs one pass of every sweep in the web process (<C>runSweeps()</C>) and returns what it did.
        Outside development it needs the <C>CRON_SECRET</C>:
      </P>
      <CodeBlock
        title="Terminal"
        code={`curl -X POST https://resell.store/api/cron/sweep \\
  -H "Authorization: Bearer $CRON_SECRET"`}
      />
      <P>
        Point any scheduler at it (every 15 minutes matches production). Locally no secret is needed:{" "}
        <C>curl -X POST localhost:5689/api/cron/sweep</C>. In this mode money moves aren&apos;t retried with backoff; a failed
        release is logged and picked up by the next pass.
      </P>

      <H2 id="demo">Shrinking the days</H2>
      <P>
        <C>PAYOUT_DEMO_MINUTES_PER_DAY</C> turns every &quot;day&quot; in <C>payout-policy.ts</C> into that many minutes. With{" "}
        <C>2</C>, the money for a shipped order is released 26 minutes after shipping (10 &quot;days&quot; plus the 3-day window). It doesn&apos;t
        change the 48-hour offer window, the 12-hour reminder or the digest timings. Set it on the workflow as well as the web
        service, and leave it unset in production.
      </P>
      <Callout tone="tip">
        For a live demo: set it to 1, mark a sale shipped, then run <C>/api/cron/sweep</C> (or wait for the cron) and watch the
        payout land in the sandbox seller&apos;s PayPal.
      </Callout>

      <H2 id="after-response">Work after the response</H2>
      <P>
        Some work is started by a person but shouldn&apos;t make them wait. It runs in the web process after the response is sent,
        through Next&apos;s <C>after()</C> or <C>runAfterResponse()</C> in <C>lib/server/later.ts</C> (which just runs it in the
        background when there&apos;s no request, as in scripts):
      </P>
      <OL>
        <li>
          <strong>Research.</strong> Starting a listing creates a <C>research_run</C> and runs <C>runResearch()</C> after the
          response. Each step writes its progress to the row, and the research page polls{" "}
          <C>/api/listings/[id]/research</C> every 1.2 seconds. A run that hasn&apos;t updated in 3 minutes counts as stuck, and a new
          one can start. The Shopping sidekick&apos;s checks work the same way.
        </li>
        <li>
          <strong>The store agent.</strong> When a buyer sends a message, <C>store-agent.ts</C> answers it after the response (if the
          shop allows it and there&apos;s an Anthropic key), or hands the thread to the seller.
        </li>
        <li>
          <strong>The negotiator.</strong> A new offer triggers <C>negotiator.ts</C>, which may counter within the seller&apos;s lowest
          price.
        </li>
        <li>
          <strong>Emails</strong> for offers, sales, shipping and problems, and the API&apos;s activity log.
        </li>
      </OL>
      <P>
        None of these are retried if the process restarts mid-way. More on the agents in{" "}
        <A href={`${base}/dev/agents`}>Research and agents</A>.
      </P>
    </DocPage>
  );
}
