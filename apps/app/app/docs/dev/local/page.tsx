import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Run it locally · Developers" };

export default async function RunLocally() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/local"
      eyebrow="Developers"
      title="Run it locally"
      lead="Postgres in Docker, a seeded marketplace with ten stores, and the app on port 5689. No API keys needed to start."
      toc={[
        { id: "prerequisites", title: "Before you start" },
        { id: "steps", title: "Get it running" },
        { id: "keys", title: "Which keys you need" },
        { id: "sign-in", title: "Signing in" },
        { id: "sweeps", title: "Running the timed jobs" },
        { id: "mock", title: "Live and mock screens" },
        { id: "email", title: "Email previews" },
        { id: "paypal", title: "PayPal sandbox" },
        { id: "gotchas", title: "Gotchas" },
      ]}
    >
      <H2 id="prerequisites" className="mt-0">
        Before you start
      </H2>
      <UL>
        <li>
          <strong>Node 24</strong> or newer (the root <C>package.json</C> says <C>&quot;node&quot;: &quot;&gt;=24&quot;</C>).
        </li>
        <li>
          <strong>pnpm</strong> through Corepack: <C>corepack enable</C> picks up the version pinned in <C>packageManager</C>.
        </li>
        <li>
          <strong>Docker</strong>, for Postgres 17 with pgvector (<C>pgvector/pgvector:pg17</C>, the same major version as Render).
        </li>
      </UL>

      <H2 id="steps">Get it running</H2>
      <P>From the repo root:</P>
      <CodeBlock
        title="Terminal"
        code={`corepack enable
cp apps/app/.env.example apps/app/.env.local
# set BETTER_AUTH_SECRET in .env.local: openssl rand -hex 32

pnpm install
pnpm db:up          # Postgres + pgvector in Docker, on port 5433
pnpm db:migrate     # runs packages/db/drizzle/*.sql
pnpm --filter app seed
pnpm dev            # http://localhost:5689`}
      />
      <Table
        head={["Open", "What you get"]}
        rows={[
          [<C key="a">http://localhost:5689</C>, "The landing page and marketplace"],
          [<C key="b">http://claspandcarry.localhost:5689</C>, <>A seeded store. Any store is <C key="x">{"{slug}"}.localhost:5689</C></>],
          [<C key="c">http://localhost:5689/docs</C>, "These docs"],
          [<C key="d">http://localhost:5689/api/v1</C>, "The public API (api.resell.store/v1 in production)"],
          [<C key="e">http://localhost:5689/api/mcp</C>, "The hosted MCP servers"],
          [<C key="f">http://localhost:5689/design-system</C>, "Every design system component"],
          [<C key="g">http://localhost:5689/screens</C>, "Every designed screen, with live and mock links"],
        ]}
      />
      <P>
        The seed makes ten stores, four buyers, about 70 items, some sales with reviews, questions in messages, follows, likes and a
        month of views for Stats. Everyone it makes has an id starting with <C>seed_</C>, so running it again replaces only its own
        rows. <C>--reset</C> removes them, <C>--no-embed</C> skips the Jina calls. Pictures come from <C>apps/app/seed/images</C>;{" "}
        <C>pnpm --filter app seed:art</C> renders them from the drawings in <C>seed/art</C>.
      </P>

      <H2 id="keys">Which keys you need</H2>
      <P>
        None, to start. With an empty <C>.env.local</C> (apart from the secret) everything works, with these differences. Add keys
        as you need the feature, then restart <C>pnpm dev</C>. The full list is on{" "}
        <A href={`${base}/dev/env`}>Environment variables</A>.
      </P>
      <Table
        head={["Without", "What happens"]}
        rows={[
          [<C key="a">RESEND_API_KEY</C>, "Emails are printed in the dev server's terminal, and the sign-in link shows on the page"],
          [<C key="b">ANTHROPIC_API_KEY</C>, "Research still runs and prices from catalog numbers; the listing chat, the words step, the store agent's answers and the Sidekick are off; the negotiator counters with a template"],
          [<C key="c">CHANNEL3_API_KEY</C>, <>Research skips the catalog (&quot;Add CHANNEL3_API_KEY to search the catalog&quot;) and prices from comps and the model</>],
          [<C key="d">KERNEL_API_KEY</C>, "No live comps step in research, and the Shopping sidekick shows Coming soon"],
          [<C key="e">JINA_EMBEDDING_MODEL_KEY</C>, "Search is Postgres full text only, no semantic matches"],
          [<C key="f">R2_*</C>, "Uploads are stored in Postgres (file.data) and served from /api/files/[id] the same way"],
          [<C key="g">PAYPAL_*</C>, "Checkout is a test checkout: the order is real, no money moves, releases do nothing"],
        ]}
      />

      <H2 id="sign-in">Signing in</H2>
      <P>
        Go to <C>/welcome</C>, type an email and choose <strong>Email me a sign-in link</strong>. In development the link is kept in
        memory and an <strong>Open the sign-in link</strong> button appears on the page:
      </P>
      <UL>
        <li>for every address, when <C>RESEND_API_KEY</C> is empty;</li>
        <li>
          always for <C>@example.com</C> addresses, which never get real email. All the seeded people use them, so you can sign in
          as a store owner (for example <C>priya.nair@example.com</C>, who runs claspandcarry) or a buyer (<C>ava.lindqvist@example.com</C>).
        </li>
      </UL>
      <P>Links last 15 minutes and work once. Sessions last 30 days.</P>

      <H2 id="sweeps">Running the timed jobs</H2>
      <P>
        Offer expiry, reminders, cancellations and payouts don&apos;t run on their own locally. Run one pass of everything in-process
        (no secret needed in development):
      </P>
      <CodeBlock title="Terminal" code={`curl -X POST http://localhost:5689/api/cron/sweep`} />
      <P>
        Or run the real Render Workflow locally with the Render CLI. The workflow script doesn&apos;t read <C>.env.local</C> by itself,
        so export it first, then start tasks from a second terminal:
      </P>
      <CodeBlock
        title="Terminal"
        code={`cd apps/app
set -a; source .env.local; set +a
render workflows dev -- pnpm workflows

# in another terminal
render workflows tasks start offerSweep --local`}
      />
      <P>
        To watch a payout happen without waiting days, set <C>PAYOUT_DEMO_MINUTES_PER_DAY=1</C> so every &quot;day&quot; in the money
        timers is a minute. See <A href={`${base}/dev/jobs`}>Background jobs</A>.
      </P>

      <H2 id="mock">Live and mock screens</H2>
      <P>
        Every designed screen was first built as a front-end prototype, and those versions still live under <C>app/mock</C>. In
        development a tab on the right edge flips the current URL between the live screen and its mock. <C>?view=mock</C> and{" "}
        <C>?view=live</C> do the same (they set or clear the <C>rs_view</C> cookie). <C>/screens</C> lists every screen with both
        links; signed in, the live links point at your own shop and listings.
      </P>

      <H2 id="email">Email previews</H2>
      <CodeBlock title="Terminal" code={`pnpm email   # React Email preview at http://localhost:5690`} />
      <P>
        The ten templates are in <C>packages/email/emails</C>. Images in sent emails come from <C>apps/app/public/email</C>; the
        preview serves its own copies from <C>emails/static</C>.
      </P>

      <H2 id="paypal">PayPal sandbox</H2>
      <P>PayPal is sandbox only for this project. To try real (sandbox) checkout, payouts and refunds:</P>
      <OL>
        <li>
          In the <A href="https://developer.paypal.com/dashboard">PayPal developer dashboard</A>, create a Platform app. Put its
          client id in <C>PAYPAL_CLIENT_ID</C> and <C>NEXT_PUBLIC_PAYPAL_CLIENT_ID</C>, and the secret in <C>PAYPAL_CLIENT_SECRET</C>.
        </li>
        <li>
          Find the platform&apos;s sandbox business account (Testing Tools, Sandbox Accounts) and put its Account ID in{" "}
          <C>PAYPAL_PARTNER_MERCHANT_ID</C>. Add your BN code to <C>PAYPAL_BN_CODE</C>.
        </li>
        <li>
          Create two sandbox personal accounts, one to act as the shared demo seller and one as the demo buyer, and put their logins
          in <C>PAYPAL_DEMO_SELLER_EMAIL</C> / <C>_PASSWORD</C> and <C>PAYPAL_DEMO_BUYER_EMAIL</C> / <C>_PASSWORD</C>. These are shown
          in the app on purpose, so people trying the demo can use them.
        </li>
        <li>Connect the demo seller once. The script prints a PayPal link the first time:</li>
      </OL>
      <CodeBlock
        title="Terminal"
        code={`cd apps/app
node --env-file=.env.local scripts/paypal-demo-seller.mjs
# open the link in a private window, sign in as the demo seller, allow everything
node --env-file=.env.local scripts/paypal-demo-seller.mjs
# Connected. PAYPAL_DEMO_SELLER_ID=...`}
      />
      <OL>
        <li value={5}>
          Put the printed id in <C>PAYPAL_DEMO_SELLER_ID</C> and restart. Sellers who haven&apos;t connected PayPal are now paid
          there, and <strong>Use demo PayPal</strong> on Connections links an account to it.
        </li>
        <li>
          Webhooks need a public URL, so locally you can skip them: the app reads capture and payout results from PayPal&apos;s
          responses. To test them, tunnel to <C>/api/paypal/webhook</C> and set <C>PAYPAL_WEBHOOK_ID</C>.
        </li>
      </OL>

      <H2 id="gotchas">Gotchas</H2>
      <UL>
        <li>
          <strong>Use port 5689.</strong> <C>NEXT_PUBLIC_ROOT_DOMAIN</C> and <C>BETTER_AUTH_URL</C> say <C>localhost:5689</C>, and
          every absolute link, store URL and auth origin is built from them. <C>pnpm dev</C> already uses that port.
        </li>
        <li>
          <strong>Store subdomains get their own copy of your session.</strong> Chrome won&apos;t send a <C>Domain=localhost</C>{" "}
          cookie to <C>*.localhost</C>, so the first page load on a store bounces through the marketplace to copy it over. It only
          tries once every 10 minutes (the <C>rs_handoff</C> cookie): if you signed in after opening a store, clear that
          cookie or wait. See <A href={`${base}/dev/routing`}>Domains and routing</A>.
        </li>
        <li>
          <strong>Import Drizzle helpers from <C>@repo/db</C></strong> (<C>eq</C>, <C>and</C>, <C>sql</C>…), never from{" "}
          <C>drizzle-orm</C>. pnpm can hand the app a second copy of drizzle-orm and the types stop matching.
        </li>
        <li>
          <strong>
            <C>NEXT_PUBLIC_*</C> values are baked in when Next builds
          </strong>
          . In dev, restart after changing them.
        </li>
        <li>
          <strong>Postgres is on 5433</strong>, not 5432, so it doesn&apos;t clash with one you already run.
        </li>
      </UL>
      <Callout tone="tip">
        Running scripts outside Next? Server modules start with <C>import &quot;server-only&quot;</C>, which throws outside Next. Load{" "}
        <C>workflows/server-only.mjs</C> with <C>--import</C>, like the seed does. See <A href={`${base}/dev/testing`}>Testing</A>.
      </Callout>
    </DocPage>
  );
}
