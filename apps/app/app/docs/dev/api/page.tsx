import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, CardGrid, DocPage, H2, H3, LinkCard, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "API, docs and MCP · Developers" };

const routeExample = `// lib/server/api/routes/stats.ts
export const statsRoutes = [
  route({
    method: "GET",
    path: "/stats",
    group: "Stats",                 // the reference page it shows on
    access: "key",                  // "public" or "key"
    // scope: GETs default to "read"; writes name theirs, e.g. "listings"
    summary: "How your shops are doing",
    description: "Earnings, views, likes, shares, followers, offers and sales…",
    query: z.object({
      shop: z.string().optional().describe("A shop slug. Leave out for every shop."),
      period: z.enum(["7d", "30d", "90d", "year"]).default("30d"),
    }),
    example: { query: "period=7d", response: { object: "stats", period: "7d", earned: 214, … } },
    handler: async ({ auth, query }) => {
      const all = await sellerStats(auth!.user.id, query.shop ?? null);
      return { object: "stats", period: query.period, … };
    },
  }),
];`;

const stdio = `pnpm --filter @repo/mcp build

RESELL_API_KEY=rs_live_… node packages/mcp/dist/stdio.js          # your shops
RESELL_API_KEY=rs_live_… node packages/mcp/dist/stdio.js buyer    # shopping (key optional)
RESELL_API_URL=http://localhost:5689/api/v1 …                     # point it at your dev server`;

export default async function ApiInternals() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/api"
      eyebrow="Developers"
      title="API, docs and MCP"
      lead="One list of route definitions serves the public API, renders its reference docs, generates openapi.json and backs both MCP servers. Add a route once and all four pick it up."
      toc={[
        { id: "one-definition", title: "One definition, four uses" },
        { id: "request", title: "What happens on a request" },
        { id: "adding", title: "Adding an endpoint" },
        { id: "keys", title: "Keys and limits" },
        { id: "activity", title: "The activity log" },
        { id: "webhooks", title: "Webhooks" },
        { id: "mcp", title: "The MCP package" },
        { id: "public-docs", title: "Public docs" },
      ]}
    >
      <H2 id="one-definition" className="mt-0">
        One definition, four uses
      </H2>
      <P>
        Every endpoint is one <C>route()</C> call in <C>lib/server/api/routes/*.ts</C>: method, path, docs group, who may call it,
        zod schemas for the query and body, an example, and the handler. <C>lib/server/api/index.ts</C> collects them into{" "}
        <C>apiRoutes</C>, and everything else reads that list.
      </P>
      <CodeBlock title="A route" code={routeExample} />
      <Table
        head={["Reads apiRoutes", "Where"]}
        rows={[
          ["The router", <span key="a"><C>createRouter</C> in <C>lib/server/api/router.ts</C>, served by <C>app/api/v1/[[...path]]</C> (and <C>api.resell.store/v1</C> via <C>proxy.ts</C>)</span>],
          ["The reference pages", <span key="b"><C>app/docs/api/[group]/page.tsx</C>, one page per <C>group</C>, with schemas, examples and curl samples</span>],
          ["openapi.json", <span key="c"><C>openapi()</C> in <C>index.ts</C>: OpenAPI 3.1 from the same schemas (<C>z.toJSONSchema</C>), served at <C>/v1/openapi.json</C></span>],
          ["The MCP servers", <span key="d">Their tools call these routes through <C>ResellClient</C>; hosted, in-process</span>],
        ]}
      />
      <P>Because the docs render from the definitions, they can&apos;t drift from what the API does.</P>

      <H2 id="request">What happens on a request</H2>
      <OL>
        <li>The path after <C>/v1</C> is matched against every route. A path that exists with another method gets a hint saying which.</li>
        <li>
          A bearer token (or <C>x-api-key</C>) is checked if sent, even on public routes. On <C>access: &quot;key&quot;</C> routes it&apos;s
          required, and its scopes must include the route&apos;s <C>scope</C> (GETs default to <C>read</C>).
        </li>
        <li>The request is counted against the month&apos;s limit, with <C>x-ratelimit-limit</C> and <C>x-ratelimit-remaining</C> headers.</li>
        <li>The query and body are parsed with the route&apos;s zod schemas. JSON, form fields and multipart all work.</li>
        <li>The handler runs. Writes revalidate the app so a change through the API shows there straight away.</li>
        <li>After the response, the change is written to the owner&apos;s activity log. Errors use one envelope with a type and a plain message, plus an <C>x-request-id</C> to quote.</li>
      </OL>

      <H2 id="adding">Adding an endpoint</H2>
      <OL>
        <li>
          Add a <C>route()</C> to the right file in <C>lib/server/api/routes/</C> (or a new file, spread into <C>apiRoutes</C>). Put
          the logic in <C>lib/server/*</C> and keep the handler thin, so the app&apos;s server actions can share it.
        </li>
        <li>
          Pick <C>access</C> and <C>scope</C>: <C>read</C>, <C>shops</C>, <C>listings</C>, <C>messages</C>, <C>offers</C>,{" "}
          <C>orders</C>, <C>buying</C> or <C>webhooks</C>.
        </li>
        <li>
          Write the <C>query</C> and <C>body</C> schemas with a <C>.describe()</C> on every field. Those descriptions are the docs.
        </li>
        <li>
          Add an <C>example</C> with a realistic response. Use the docs&apos; people: Maya&apos;s shop, Jess buying, the yellow dutch
          oven. Use a <C>group</C> that matches one in <C>apiGroups</C> (<C>lib/docs/nav.ts</C>), or it won&apos;t have a page.
        </li>
        <li>
          For a write, add a line to <C>describers</C> in <C>lib/server/api/log.ts</C>, keyed <C>&quot;POST /your/:path&quot;</C>, so the
          activity log says what happened in words. Without one it falls back to the summary.
        </li>
        <li>
          If an AI app should be able to do it, add a tool to <C>packages/mcp/src/seller.ts</C> or <C>buyer.ts</C> with the same{" "}
          <C>scope</C>. Mark it <C>consequential</C> if it moves money, answers an offer or puts something live.
        </li>
        <li>
          If it&apos;s something a seller would want to hear about, emit a webhook (<C>emitOrderEvent</C>, <C>emitOfferEvent</C> and
          friends in <C>lib/server/api/webhooks.ts</C>) from the shared function, so the app and the API both fire it.
        </li>
        <li>Add a test next to it. <C>lib/server/api/routes.test.ts</C> and <C>router.test.ts</C> show the pattern.</li>
      </OL>

      <H2 id="keys">Keys and limits</H2>
      <P>
        Keys live in <C>api_key</C> (<C>lib/server/api/keys.ts</C>). Requests are matched by the token&apos;s SHA-256 hash. The token
        itself is kept sealed with AES-256-GCM (<C>token_sealed</C>, keyed from <C>BETTER_AUTH_SECRET</C>) so its owner can show and
        copy it again; the readable start and last four characters label it. Each person has at most one live key of each kind, and making a new
        one revokes the old one at once.
      </P>
      <Table
        head={["Kind", "Looks like", "Made on", "Scopes"]}
        rows={[
          [<C key="a">api</C>, <C key="a2">rs_live_…</C>, <C key="a3">/tools/api</C>, "Everything"],
          [
            <C key="b">agent</C>,
            <C key="b2">maya-…</C>,
            <C key="b3">/tools/agent</C>,
            "Chosen by the owner; never shops or webhooks. Starts with read, listings, messages, offers, orders and buying, with offers and buying set to ask first, and a $200 ceiling per offer.",
          ],
        ]}
      />
      <P>
        Usage is counted per person per month in <C>api_usage</C>: 10,000 requests while we&apos;re in beta (<C>MONTHLY_LIMIT</C>),
        shared by scripts and MCP. Over that, requests get <C>rate_limited</C> until the 1st.
      </P>

      <H2 id="activity">The activity log</H2>
      <P>
        Every change made with a key gets one line in <C>api_activity</C>, written by <C>recordActivity</C> in{" "}
        <C>lib/server/api/log.ts</C>; reads aren&apos;t kept. Refused calls are logged too (&quot;Tried to …&quot;) so the owner sees
        what an app wasn&apos;t allowed to do. The app is named from the MCP server&apos;s <C>resell-client</C> header or the user
        agent (Claude, ChatGPT, Cursor, &quot;A script&quot;…). Lines are kept for 90 days; the webhook sweep clears older ones.
      </P>

      <H2 id="webhooks">Webhooks</H2>
      <UL>
        <li>
          One endpoint per person (<C>webhook_endpoint</C>), with a <C>whsec_</C> secret. Events: <C>listing.sold</C>,{" "}
          <C>offer.received</C>, <C>offer.updated</C>, <C>question.asked</C>, <C>order.completed</C>, <C>order.problem</C>,{" "}
          <C>order.refunded</C>, <C>payout.sent</C>, <C>review.created</C>.
        </li>
        <li>
          Each POST carries <C>Resell-Signature: t=&lt;unix seconds&gt;,v1=&lt;hex&gt;</C>, where <C>v1</C> is HMAC-SHA256 of{" "}
          <C>&#123;t&#125;.&#123;body&#125;</C> with the secret. 10 second timeout. Delivery never blocks or fails what caused it.
        </li>
        <li>
          Anything but a 2xx is retried by the webhook sweep about 5 minutes, 30 minutes, 2 hours, 6 hours and a day later, six
          tries in all, with the same event id. An endpoint failing for three days straight is turned off until it&apos;s saved again.
        </li>
        <li>
          Subscriptions (<C>webhook_subscription</C>) are more targets, each with its own events and secret: REST hooks, up to 50 a
          person, upserted by address. <C>source</C> says who made one: <C>zapier</C> (the Zapier app, told apart by its{" "}
          <C>resell-client: Zapier</C> header), <C>app</C> (pasted under Start a Zap on /tools/api) or <C>api</C>. <C>emit()</C> sends
          each event to the endpoint and every enabled subscription that asked for it. Deliveries share the{" "}
          <C>webhook_delivery</C> queue (<C>subscription_id</C> set), so retries and the three-day turn-off work per target. A
          subscription that answers 410 is deleted, as Zapier asks.
        </li>
        <li>
          Samples (<C>lib/server/api/webhook-samples.ts</C>) build an event from the seller&apos;s latest matching thing, or a made-up
          one, with <C>test: true</C>. They back <C>GET /webhooks/samples/:event</C> (Zapier&apos;s trigger test) and Send a sample.
          Tests and samples are never queued for retry.
        </li>
        <li>
          The Zapier app is <C>integrations/zapier</C>: a Zapier Platform CLI app with one hook trigger per event, outside the pnpm
          workspace. Its README covers testing and <C>zapier push</C>. Setting <C>ZAPIER_APP_URL</C> to its invite link shows Connect
          on Zapier on /tools/api. A new webhook event needs a line in its <C>lib/events.js</C>; a test in apps/app fails until it has
          one.
        </li>
      </UL>

      <H2 id="mcp">The MCP package</H2>
      <P>
        <C>packages/mcp</C> (<C>@repo/mcp</C>) builds two servers on <C>@modelcontextprotocol/server</C>: a seller one (38 tools in{" "}
        <C>src/seller.ts</C>) and a buyer one (31 in <C>src/buyer.ts</C>). Tools never touch the database. They call the public API
        through <C>ResellClient</C> (<C>src/client.ts</C>), so an AI app can do exactly what a script with the same key can.
      </P>
      <H3>Hosted and local</H3>
      <Table
        head={["", "Hosted", "Local (stdio)"]}
        rows={[
          ["Where", <C key="a">app/api/mcp/[[...path]]/route.ts</C>, <C key="b">packages/mcp/src/stdio.ts</C>],
          [
            "Addresses",
            <span key="c"><C>/u/&#123;token&#125;</C>, <C>/seller</C> (bearer), <C>/buy</C>, <C>/buy/&#123;token&#125;</C>, <C>/buyer</C></span>,
            <span key="d"><C>resell-mcp</C> or <C>resell-mcp buyer</C></span>,
          ],
          ["Calls the API", "In-process: the same router, auth and limits, without a network hop", <span key="e">Over HTTP to <C>RESELL_API_URL</C></span>],
          ["Server", "A fresh one per request; who a token is gets cached for 15 seconds", "One per process; a bad key fails at start"],
        ]}
      />
      <CodeBlock title="Terminal" code={stdio} />
      <H3>Scopes and asking first</H3>
      <P>
        <C>createResellServer</C> looks up the key with <C>GET /v1/me</C> and registers only the tools its scopes allow (
        <C>allowedTools</C> in <C>src/tools.ts</C>), so an app never sees a tool it can&apos;t use. For a <C>consequential</C> tool whose
        scope the owner set to &quot;Ask me first&quot;, the server asks before calling the API: with an elicitation if the app can
        show a yes/no question, otherwise by returning a message telling the model to ask and call again with{" "}
        <C>confirmed: true</C>. A buyer key&apos;s offer ceiling is added to the server&apos;s instructions.
      </P>

      <H2 id="public-docs">Public docs</H2>
      <CardGrid>
        <LinkCard href={`${base}/api`} title="API reference">
          The public guide and every endpoint, rendered from the route definitions.
        </LinkCard>
        <LinkCard href={`${base}/mcp`} title="MCP">
          Connecting an AI app, the two servers and their tools.
        </LinkCard>
      </CardGrid>
      <Callout tone="note">
        The docs site itself is <C>app/docs</C>, served on <C>docs.resell.store</C> by <C>proxy.ts</C> or at <C>/docs</C> on the
        marketplace. The sidebar is <C>lib/docs/nav.ts</C>.
      </Callout>
    </DocPage>
  );
}
