import type { Metadata } from "next";
import type { ReactNode } from "react";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Environment variables · Developers" };

type Row = [name: string, needed: string, what: ReactNode, without: ReactNode];

const head = ["Variable", "Needed", "What it does", "Without it"];
const table = (rows: Row[]) => (
  <Table head={head} rows={rows.map(([name, needed, what, without]) => [<C key={name}>{name}</C>, needed, what, without])} />
);

export default async function Env() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/env"
      eyebrow="Developers"
      title="Environment variables"
      lead="Every setting the app reads, whether you need it, and what happens without it. Locally they go in apps/app/.env.local (start from .env.example); on Render, in each service's Environment."
      toc={[
        { id: "build-time", title: "Read at build time" },
        { id: "core", title: "Core" },
        { id: "auth", title: "Sign-in" },
        { id: "email", title: "Email" },
        { id: "ai", title: "AI" },
        { id: "research", title: "Research" },
        { id: "search", title: "Search" },
        { id: "files", title: "Files" },
        { id: "paypal", title: "PayPal" },
        { id: "zapier", title: "Zapier" },
        { id: "payouts", title: "Fees and timers" },
        { id: "jobs", title: "Timed jobs" },
        { id: "demo", title: "Demo accounts" },
        { id: "misc", title: "Everything else" },
        { id: "services", title: "Which service needs what" },
      ]}
    >
      <H2 id="build-time" className="mt-0">
        Read at build time
      </H2>
      <P>
        Anything starting <C>NEXT_PUBLIC_</C> is written into the app when Next builds it, on the server as well as in the browser.
        Changing one on Render means a new build and deploy, not just a restart; locally, restart <C>pnpm dev</C>. Everything else
        is read when the server starts.
      </P>

      <H2 id="core">Core</H2>
      {table([
        ["DATABASE_URL", "Yes", "Postgres with pgvector. Locally postgres://resell:resell@localhost:5433/resell; on Render it comes from the database", "Nothing works"],
        ["NEXT_PUBLIC_ROOT_DOMAIN", "Yes", <>The marketplace host, with port if any: <C key="a">localhost:5689</C> or <C>resell.store</C>. Stores, links, cookies and the api/docs/mcp hosts all hang off it</>, "Defaults to localhost:5689"],
        ["NODE_VERSION", "Render", "Set to 24 in the blueprint so Render uses Node 24", "Render's default Node"],
      ])}

      <H2 id="auth">Sign-in</H2>
      {table([
        ["BETTER_AUTH_SECRET", "Yes", <>Signs sessions and tokens. <C key="a">openssl rand -hex 32</C>. The blueprint generates one and copies it to the workflow</>, "Auth fails"],
        ["BETTER_AUTH_URL", "Yes", "The app's own URL: http://localhost:5689, or https://resell.store", "Sign-in links point at the wrong place"],
      ])}

      <H2 id="email">Email</H2>
      {table([
        ["RESEND_API_KEY", "Production", "Sends sign-in links and every notification through Resend", "Emails are printed to the server log. In development the sign-in link also shows on the page; in production nobody can sign in by email"],
        ["EMAIL_FROM", "With Resend", "The sender, on a domain verified in Resend", <>&quot;resell.store &lt;hello@resell.store&gt;&quot;</>],
        ["SUPPORT_EMAIL", "Optional", "Where problems escalated to resell.store are sent for a decision", "Escalations still happen; nobody at resell.store gets an email"],
      ])}

      <H2 id="ai">AI</H2>
      {table([
        ["ANTHROPIC_API_KEY", "Recommended", "The AI model (Anthropic), for identifying and pricing items, writing listings, the listing chat, the store agent, the negotiator's wording and the Sidekick", "Research prices from catalog and comps numbers; the chat, the words step, store agent answers and the Sidekick are off; counters use a template"],
        ["AI_MODEL", "Optional", <>The main model as <C key="a">provider:model</C></>, "The default Anthropic main model"],
        ["AI_MODEL_FAST", "Optional", "The quick model, for the store agent, negotiator, search queries and Sidekick", "The default Anthropic fast model"],
      ])}
      <P>
        Anthropic is the only provider registered today, so out of the box both models start <C>anthropic:</C>. Any other model
        the AI SDK supports works too: add its provider in <C>lib/server/ai.ts</C> and its key here. See{" "}
        <A href={`${base}/dev/stack/ai-model#changing`}>Changing the model</A>.
      </P>

      <H2 id="research">Research</H2>
      {table([
        ["CHANNEL3_API_KEY", "Recommended", "The product catalog: what an item is, new prices, used offers, maker photos", "Research skips the catalog step and prices from comps and the model"],
        ["KERNEL_API_KEY", "Optional", "Headless browsers that read public listings on popular marketplaces. Needs ANTHROPIC_API_KEY too", "No live comps step in research; the Shopping sidekick shows Coming soon"],
        ["KERNEL_MAX_BROWSERS", "Optional", "How many Kernel browsers may run at once; extra searches queue", "5, the free plan's limit"],
      ])}

      <H2 id="search">Search</H2>
      {table([
        ["JINA_EMBEDDING_MODEL_KEY", "Recommended", "Jina embeddings for semantic search, written when a listing is published", "Search is Postgres full text only"],
        ["JINA_EMBEDDING_MODEL", "Optional", "The Jina model. It must give 1024-dimension vectors to fit listing.embedding", "jina-embeddings-v5-text-small"],
      ])}

      <H2 id="files">Files</H2>
      {table([
        ["R2_URL", "Production", <>The account&apos;s S3 endpoint, <C key="a">https://{"{account_id}"}.r2.cloudflarestorage.com</C></>, "Uploads are stored in Postgres (file.data)"],
        ["R2_ACCESS_KEY", "Production", "An R2 API token's access key, with read and write on the bucket", "Same"],
        ["R2_SECRET_ACCESS_KEY", "Production", "Its secret", "Same"],
        ["R2_BUCKET", "Optional", "The bucket name", "resell-store"],
        ["R2_PUBLIC_URL", "Optional", "A public domain for the bucket (e.g. files.resell.store). /api/files/[id] then redirects there instead of streaming the file", "Files are streamed through the app"],
      ])}

      <H2 id="paypal">PayPal</H2>
      <P>
        Checkout uses PayPal when the client id, secret and partner merchant id are all set. This project only runs against the
        sandbox.
      </P>
      {table([
        ["PAYPAL_ENV", "Optional", <><C key="a">sandbox</C> or <C>live</C></>, "sandbox"],
        ["PAYPAL_CLIENT_ID", "For payments", "The Platform app's client id", "Test checkout: orders are real, no money moves"],
        ["PAYPAL_CLIENT_SECRET", "For payments", "Its secret", "Test checkout"],
        ["PAYPAL_PARTNER_MERCHANT_ID", "For payments", "The platform's own PayPal account id (the partner)", "Test checkout"],
        ["NEXT_PUBLIC_PAYPAL_CLIENT_ID", "With PayPal", "Same value as PAYPAL_CLIENT_ID. Only changes wording on seller screens (\"PayPal holds the buyer's money until they have it\")", "Seller screens say it's a test checkout"],
        ["PAYPAL_BN_CODE", "Optional", "Sent as PayPal-Partner-Attribution-Id on every call", "Calls aren't attributed to the platform"],
        ["PAYPAL_WEBHOOK_ID", "Production", "The webhook's id from the dashboard, used to verify every delivery", "Every webhook is rejected with 401"],
        ["PAYPAL_DEMO_SELLER_ID", "Sandbox demo", <>The shared demo seller&apos;s merchant id, from <C key="a">scripts/paypal-demo-seller.mjs</C>. Sellers who haven&apos;t connected PayPal are paid here, and &quot;Use demo PayPal&quot; links to it</>, "A seller's items can't be bought until they connect their own PayPal"],
        ["PAYPAL_DEMO_SELLER_EMAIL", "Sandbox demo", "The demo seller's sandbox login, shown on Connections so people can watch sales land", "Not shown"],
        ["PAYPAL_DEMO_SELLER_PASSWORD", "Sandbox demo", "Its password", "Not shown"],
        ["PAYPAL_DEMO_BUYER_EMAIL", "Sandbox demo", "A sandbox buyer login, shown at checkout", "Not shown"],
        ["PAYPAL_DEMO_BUYER_PASSWORD", "Sandbox demo", "Its password", "Not shown"],
      ])}

      <H2 id="zapier">Zapier</H2>
      {table([
        ["ZAPIER_APP_URL", "Optional", <>The resell.store Zapier app&apos;s invite link, once it&apos;s pushed (<C key="a">integrations/zapier</C>). Shows Connect on Zapier on /tools/api and the docs</>, "Zaps start from Webhooks by Zapier only; the docs call the app coming soon"],
      ])}

      <H2 id="payouts">Fees and timers</H2>
      {table([
        ["PLATFORM_FEE_BPS", "Optional", "The platform fee in basis points of the item price (shipping is never charged). 1000 = 10%", "1000. A blank value also means 1000"],
        ["PAYOUT_DEMO_MINUTES_PER_DAY", "Demo only", "Makes every \"day\" in the shipping, delivery and release timers this many minutes. Set it on the workflow too", "Real days"],
        ["AGENT_SUMMARY_HOUR", "Optional", "The UTC hour from which the seller's daily agent summary goes out. Not in the blueprint; add it to the workflow", "1 (early evening in the US)"],
      ])}

      <H2 id="jobs">Timed jobs</H2>
      {table([
        ["CRON_SECRET", "Production", <>Required as <C key="a">Authorization: Bearer</C> on <C>POST /api/cron/sweep</C> outside development. The blueprint generates one</>, "The sweep route answers 401 (it runs without one in development)"],
        ["RENDER_API_KEY", "Cron job", "Lets scripts/start-sweeps.ts start tasks on the workflow. A Render API key from your account settings", "The cron job fails; nothing timed runs"],
        ["RENDER_WORKFLOW_SLUG", "Cron job", "The workflow's slug. The blueprint fills it in from the resell-sweeps service", "resell-sweeps"],
      ])}

      <H2 id="demo">Demo accounts</H2>
      {table([
        ["DEMO", "Demo only", <>Set to <C key="a">true</C> to offer &quot;Sell as&quot; and &quot;Shop as&quot; on the sign-in page: shared accounts that sign in with no email. They can&apos;t publish, edit what was there, or deal with real sellers, and what they add is reset. Set it on the workflow too</>, "No demo accounts"],
        ["DEMO_SELLER_EMAIL", "Demo only", "The shared seller. Must already exist with a store (the seed makes it)", "dana.okafor@example.com"],
        ["DEMO_BUYER_EMAIL", "Demo only", "The shared buyer", "ava.lindqvist@example.com"],
        ["DEMO_RESET_MINUTES", "Demo only", "The least time between resets. The sweep cron and the next demo sign-in reset once it has passed", "10"],
        ["DEMO_MAX_DRAFTS", "Demo only", "New drafts the demo seller may start between resets (each runs research)", "5"],
      ])}

      <H2 id="misc">Everything else</H2>
      {table([
        ["TEST_DATABASE_URL", "Tests", "The tests' own database. Its name must end in _test", "postgres://resell:resell@localhost:5433/resell_test"],
        ["RESELL_API_KEY", "stdio MCP", <>For running <C key="a">@repo/mcp</C>&apos;s <C>dist/stdio.js</C> yourself: a secret key or agent link token</>, "The seller server won't start; the buyer server runs with public marketplace tools only"],
        ["RESELL_API_URL", "stdio MCP", "Which API the stdio server talks to, e.g. http://localhost:5689/api/v1", "https://api.resell.store/v1"],
      ])}

      <H2 id="services">Which service needs what</H2>
      <UL>
        <li>
          <strong>Web service:</strong> everything above except <C>RENDER_API_KEY</C>, <C>RENDER_WORKFLOW_SLUG</C> and the test and
          stdio ones.
        </li>
        <li>
          <strong>Workflow</strong> (<C>resell-sweeps</C>): <C>DATABASE_URL</C>, <C>NEXT_PUBLIC_ROOT_DOMAIN</C> (for links in
          emails), <C>BETTER_AUTH_SECRET</C> and <C>BETTER_AUTH_URL</C> (the sweeps import code that sets up auth), the Resend
          settings and <C>SUPPORT_EMAIL</C>, the PayPal keys (releases and refunds), <C>PAYPAL_DEMO_SELLER_ID</C>,{" "}
          <C>PLATFORM_FEE_BPS</C> and <C>PAYOUT_DEMO_MINUTES_PER_DAY</C>. The workflow runs from source with tsx, so its{" "}
          <C>NEXT_PUBLIC_</C> values are read at start, not at build.
        </li>
        <li>
          <strong>Cron job</strong> (<C>resell-sweeps-cron</C>): <C>RENDER_API_KEY</C> and <C>RENDER_WORKFLOW_SLUG</C> only.
        </li>
      </UL>
      <Callout tone="note">
        <C>render.yaml</C> lists all of these with <C>sync: false</C> for secrets, so the Blueprint asks for them on first deploy.
        Step by step: <A href={`${base}/dev/deploy`}>Deploy to Render</A>.
      </Callout>
    </DocPage>
  );
}
