import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CodeBlock } from "../../../../components/docs/code";
import { Endpoint } from "../../../../components/docs/endpoint";
import { A, C, Callout, DocPage, H2, P, Table } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { apiGroups, groupId } from "../../../../lib/docs/nav";
import { anchorFor } from "../../../../lib/docs/samples";
import { apiRoutes } from "../../../../lib/server/api";
import { webhookEvents } from "../../../../lib/server/api/webhooks";
import { apiUrl } from "../../../../lib/urls";

type Props = { params: Promise<{ group: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await params;
  const g = apiGroups.find((x) => x.id === group);
  return { title: g ? `${g.title} · API` : "API" };
}

const verifyNode = `import { createHmac, timingSafeEqual } from "node:crypto";

// In your handler, with the raw request body as a string
export function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret)
    .update(\`\${parts.t}.\${rawBody}\`)
    .digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 ?? ""));
}`;

const eventExample = {
  id: "evt_8c1d2f…",
  object: "event",
  type: "offer.received",
  created_at: "2026-10-02T18:00:00.000Z",
  data: {
    object: {
      object: "offer",
      id: "5b0f…",
      status: "open",
      amount: 150,
      note: "Could pick up this weekend.",
      listing: { id: "8d1e6c2a-…", title: "Yellow Le Creuset dutch oven, 5.5 qt", price: 185 },
      shop: { slug: "maya", name: "Maya's closet" },
      buyer: { name: "Jess" },
    },
  },
};

/** Words above the endpoints, for the groups that need explaining. */
function intro(group: string, base: string): { toc: { id: string; title: string }[]; body: ReactNode } | null {
  if (group === "webhooks") {
    return {
      toc: [
        { id: "events", title: "Events" },
        { id: "payload", title: "What we send" },
        { id: "retries", title: "When it fails" },
        { id: "verifying", title: "Checking it's us" },
        { id: "subscriptions", title: "More addresses (Zapier)" },
      ],
      body: (
        <>
          <P>
            Set an address and we&apos;ll <C>POST</C> a JSON event to it when something happens on your shops. You can also set it up
            on the API page in the app. Answer with any 2xx within 10 seconds; anything else shows as a failed delivery there.
          </P>
          <H2 id="events">Events</H2>
          <Table head={["Event", "When"]} rows={webhookEvents.map((e) => [<C key={e.id}>{e.id}</C>, e.what])} />
          <H2 id="payload">What we send</H2>
          <P>
            The object in <C>data.object</C> is the same shape the API returns: an offer, an order (for <C>listing.sold</C>,{" "}
            <C>order.completed</C> and <C>payout.sent</C>) a message (for <C>question.asked</C>) or a review (for <C>review.created</C>). The <C>Resell-Event</C> header
            repeats the type.
          </P>
          <CodeBlock tone="paper" title="POST to your address" code={JSON.stringify(eventExample, null, 2)} />
          <H2 id="retries">When it fails</H2>
          <P>
            If your server doesn&apos;t answer with a 2xx, we try again about 5 minutes, 30 minutes, 2 hours, 6 hours and a day later,
            six tries in all. Every try carries the same event <C>id</C>, so keep the ones you&apos;ve handled and skip repeats. Retries
            can arrive after newer events, so go by <C>created_at</C>, or fetch the object from the API, rather than by arrival order.
          </P>
          <P>
            If deliveries keep failing for three days, we turn the webhook off and say so on the API page. Fix your server, then save
            the webhook again to switch it back on.
          </P>
          <H2 id="verifying">Checking it&apos;s us</H2>
          <P>
            Each request has a <C>Resell-Signature: t=1759428000,v1=5f2b…</C> header. <C>v1</C> is an HMAC-SHA256 of{" "}
            <C>{"{t}.{raw body}"}</C> with your signing secret. Compare it in constant time, and ignore anything older than five
            minutes.
          </P>
          <CodeBlock title="Node" code={verifyNode} />
          <H2 id="subscriptions">More addresses (Zapier)</H2>
          <P>
            Your webhook is one address. Subscriptions are more of them, each with its own events and its own signing secret, sent the
            same way and retried the same way. They&apos;re REST hooks: the resell.store Zapier app subscribes when a Zap is turned on
            and unsubscribes when it&apos;s turned off, and Make, n8n or your own integration can do the same. Answer a delivery with{" "}
            <C>410 Gone</C> and we delete the subscription.
          </P>
          <P>
            Samples (<C>GET /webhooks/samples/:event</C>) are events built from your own latest things, with <C>test: true</C>, for
            showing fields while a Zap is set up. See <A href={`${base}/api/zapier`}>Zapier</A> for setting one up without code.
          </P>
        </>
      ),
    };
  }
  if (group === "marketplace") {
    return {
      toc: [],
      body: (
        <Callout tone="tip" title="No key needed">
          These read what any visitor to resell.store can see: listed stores and things for sale. Send a key anyway and listings say
          whether you&apos;ve liked them, and stores whether you follow them. To act on them, see{" "}
          <A href={`${base}/api/likes-and-follows`}>Likes and follows</A> and <A href={`${base}/api/offers`}>Offers</A>.
        </Callout>
      ),
    };
  }
  if (group === "research") {
    return {
      toc: [],
      body: (
        <Callout tone="note" title="Research runs in the background">
          It takes about a minute: it identifies the item, finds it in a catalog of 100M products, checks second-hand prices and
          suggests one. Start it, then check <C>GET /listings/:id/research</C> every few seconds until <C>status</C> is{" "}
          <C>done</C>.
        </Callout>
      ),
    };
  }
  return null;
}

export default async function ApiGroupPage({ params }: Props) {
  const { group } = await params;
  const g = apiGroups.find((x) => x.id === group);
  if (!g) notFound();
  const base = await docsBase();
  const routes = apiRoutes.filter((r) => groupId(r.group) === g.id && r.path !== "/openapi.json" && r.path !== "/postman.json");
  const extra = intro(g.id, base);

  return (
    <DocPage
      base={base}
      path={`/api/${g.id}`}
      eyebrow="API reference"
      title={g.title}
      lead={g.blurb}
      wide
      toc={[...(extra?.toc ?? []), ...routes.map((r) => ({ id: anchorFor(r), title: r.summary }))]}
    >
      {extra?.body}
      {extra?.toc.length ? <H2 id="endpoints">Endpoints</H2> : null}
      <div className="flex flex-col gap-10">
        {routes.map((r) => (
          <Endpoint key={`${r.method} ${r.path}`} route={r} baseUrl={apiUrl()} />
        ))}
      </div>
    </DocPage>
  );
}
