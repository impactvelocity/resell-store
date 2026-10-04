import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Deploy to Render · Developers" };

export default async function Deploy() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/deploy"
      eyebrow="Developers"
      title="Deploy to Render"
      lead="render.yaml describes the whole thing. Point Render at your copy of the repo, fill in the keys, add two domains, and connect PayPal's webhook."
      toc={[
        { id: "blueprint", title: "What the blueprint makes" },
        { id: "steps", title: "Step by step" },
        { id: "domains", title: "Domains", depth: 3 },
        { id: "services", title: "Outside services", depth: 3 },
        { id: "each-deploy", title: "What happens on each deploy" },
        { id: "seed", title: "Seeding a deployed database" },
        { id: "check", title: "Check it works" },
        { id: "troubleshooting", title: "Troubleshooting" },
      ]}
    >
      <H2 id="blueprint" className="mt-0">
        What the blueprint makes
      </H2>
      <Table
        head={["Service", "Type", "Plan", "What it runs"]}
        rows={[
          [<C key="a">resell-store</C>, "Web service (Node 24)", "starter", "The Next.js app: marketplace, stores, seller app, API, docs, MCP. Health check on /"],
          [<C key="b">resell-sweeps</C>, "Workflow (Oregon)", "Render's default", <>The timed jobs in <C key="x">workflows/main.ts</C></>],
          [<C key="c">resell-sweeps-cron</C>, "Cron job (Oregon)", "starter", "Every 15 minutes, starts the sweeps on the workflow"],
          [<C key="d">resell-db</C>, "Postgres 17", "basic-256mb", "Database resell, user resell. pgvector is available and the first migration turns it on"],
        ]}
      />
      <P>
        Pick a region for the web service and database close to the workflow if you change it. Plans can be raised later in the
        dashboard; check Render&apos;s pricing page for what each costs.
      </P>

      <H2 id="steps">Step by step</H2>
      <OL>
        <li>Fork or push the repo to your own GitHub (or GitLab) account.</li>
        <li>
          In Render, choose <strong>New</strong>, then <strong>Blueprint</strong>, and pick the repo. Render reads{" "}
          <C>render.yaml</C> and lists the four resources.
        </li>
        <li>
          Fill in the values marked <C>sync: false</C>. You can leave any optional service blank and add it later; see{" "}
          <A href={`${base}/dev/env`}>Environment variables</A> for what each does. At minimum: <C>NEXT_PUBLIC_ROOT_DOMAIN</C> and{" "}
          <C>BETTER_AUTH_URL</C> on the web service and the workflow, and <C>RESEND_API_KEY</C> + <C>EMAIL_FROM</C> so people can
          sign in.
        </li>
        <li>
          On the cron job, set <C>RENDER_API_KEY</C> to an API key from your Render account settings. <C>RENDER_WORKFLOW_SLUG</C>{" "}
          is filled in from the workflow for you.
        </li>
        <li>
          Apply. <C>BETTER_AUTH_SECRET</C> and <C>CRON_SECRET</C> are generated, and the secret is copied to the workflow.
        </li>
      </OL>

      <H3 id="domains">Domains</H3>
      <OL>
        <li>
          On the web service, add two custom domains: <C>resell.store</C> and <C>*.resell.store</C> (your own domain, if
          different). The wildcard covers every store and the <C>api.</C>, <C>docs.</C> and <C>mcp.</C> hosts.
        </li>
        <li>
          Add the DNS records Render shows for each. Copy the exact targets from the dashboard, and remove any <C>AAAA</C>{" "}
          records: Render doesn&apos;t support IPv6 for custom domains.
        </li>

        <li>
          Set <C>NEXT_PUBLIC_ROOT_DOMAIN=resell.store</C> and <C>BETTER_AUTH_URL=https://resell.store</C> on the web service, and
          the same on the workflow. The root domain is baked in at build time, so trigger a new deploy after changing it.
        </li>
      </OL>
      <Table
        head={["Type", "Name", "Value"]}
        rows={[
          [<C key="a">A</C>, <C key="b">@</C>, <><C key="c">216.24.57.1</C>, or an ALIAS/ANAME to your <C>onrender.com</C> address</>],
          [<C key="d">CNAME</C>, <C key="e">www</C>, <>Your <C key="f">onrender.com</C> address. Render redirects www to the root</>],
          [<C key="g">CNAME</C>, <C key="h">*</C>, <>Your <C key="i">onrender.com</C> address</>],
          [<C key="j">CNAME</C>, <C key="k">_acme-challenge</C>, <><C key="l">{"<service-id>"}.verify.renderdns.com</C>, for the wildcard certificate</>],
          [<C key="m">CNAME</C>, <C key="n">_cf-custom-hostname</C>, <C key="o">{"<service-id>"}.hostname.renderdns.com</C>],
        ]}
      />
      <P>
        On Cloudflare, use a <C>CNAME</C> on <C>@</C> instead of the <C>A</C> record, and keep every record on DNS only (grey
        cloud) until Render has verified the domains and issued certificates. If you turn the proxy on afterwards, set SSL/TLS to
        Full. The wildcard only works while the root domain also points to Render.
      </P>
      <Callout tone="note">
        Until the domains are live you can try the app on its <C>onrender.com</C> address, but store subdomains, the session
        cookie and the api/docs/mcp hosts all need the real root domain.
      </Callout>

      <H3 id="services">Outside services</H3>
      <UL>
        <li>
          <strong>Resend:</strong> verify your domain in Resend and set <C>EMAIL_FROM</C> to an address on it, on both the web
          service and the workflow (the workflow sends reminders and payout emails).
        </li>
        <li>
          <strong>Cloudflare R2:</strong> create a bucket (default name <C>resell-store</C>) and an API token with read and write on
          it. Set <C>R2_URL</C> to <C>https://{"{account_id}"}.r2.cloudflarestorage.com</C> plus the two keys. For speed, connect a
          custom domain to the bucket (like <C>files.resell.store</C>) and set <C>R2_PUBLIC_URL</C>; the r2.dev address is
          rate-limited.
        </li>
        <li>
          <strong>PayPal:</strong> set the client id (also as <C>NEXT_PUBLIC_PAYPAL_CLIENT_ID</C>), secret, partner merchant id
          and BN code, on the web service and the workflow. Then, in the developer dashboard under your app&apos;s Webhooks, add{" "}
          <C>https://resell.store/api/paypal/webhook</C> with these events, and paste its id into <C>PAYPAL_WEBHOOK_ID</C>:
        </li>
      </UL>
      <CodeBlock
        title="PayPal webhook events"
        tone="paper"
        code={`PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.DECLINED
PAYMENT.CAPTURE.REFUNDED
PAYMENT.CAPTURE.REVERSED
CUSTOMER.DISPUTE.CREATED
CUSTOMER.DISPUTE.UPDATED
CUSTOMER.DISPUTE.RESOLVED
MERCHANT.ONBOARDING.COMPLETED
MERCHANT.PARTNER-CONSENT.REVOKED
PAYMENT.REFERENCED-PAYOUT-ITEM.COMPLETED
PAYMENT.REFERENCED-PAYOUT-ITEM.FAILED`}
      />
      <UL>
        <li>
          <strong>The demo seller</strong> (sandbox): from your machine with the same PayPal keys, run{" "}
          <C>node --env-file=.env.local scripts/paypal-demo-seller.mjs</C> in <C>apps/app</C>, follow the link it prints, run it
          again, and set the printed <C>PAYPAL_DEMO_SELLER_ID</C> on the web service and the workflow. Add the demo seller and buyer
          logins (<C>PAYPAL_DEMO_*_EMAIL</C> / <C>_PASSWORD</C>) to the web service if you want them shown in the app.
        </li>
        <li>
          <strong>The rest</strong> are just keys: <C>ANTHROPIC_API_KEY</C>, <C>CHANNEL3_API_KEY</C>, <C>KERNEL_API_KEY</C>,{" "}
          <C>JINA_EMBEDDING_MODEL_KEY</C>, and <C>SUPPORT_EMAIL</C> for escalations.
        </li>
      </UL>

      <H2 id="each-deploy">What happens on each deploy</H2>
      <OL>
        <li>
          <strong>Build:</strong> <C>corepack pnpm install --frozen-lockfile &amp;&amp; corepack pnpm --filter app build</C>.
          pnpm runs through corepack because <C>corepack enable</C> can&apos;t write to Render&apos;s read-only <C>/usr/bin</C>. The{" "}
          <C>NEXT_PUBLIC_</C> values are baked in here.
        </li>
        <li>
          <strong>Pre-deploy:</strong> <C>cd packages/db &amp;&amp; npm run db:migrate</C> applies any new migrations. If it fails, the deploy stops and the old
          version keeps serving.
        </li>
        <li>
          <strong>Start:</strong> <C>cd apps/app &amp;&amp; npm start</C>. Render switches traffic once the health check on <C>/</C> passes.
        </li>
      </OL>
      <P>
        The workflow and cron job install dependencies and run from source with tsx; they have no build step and no migrations of
        their own.
      </P>

      <H2 id="seed">Seeding a deployed database</H2>
      <P>
        To fill a fresh deploy with the ten demo stores, run the seed from your machine against the database&apos;s{" "}
        <strong>External Database URL</strong> (on the database&apos;s page in Render). It refuses a remote database unless you say{" "}
        <C>--remote</C>. Render only accepts encrypted connections from outside, which <C>PGSSLMODE=require</C> turns on:
      </P>
      <CodeBlock
        title="Terminal"
        code={`cd apps/app
PGSSLMODE=require DATABASE_URL="postgres://resell:...@....render.com/resell" pnpm seed --remote`}
      />
      <P>
        It uses the rest of your local <C>.env.local</C>: with R2 keys set there, the photos go to that bucket (use the same one as
        production); without, they go into Postgres. With a Jina key, the listings get embeddings. Running it again replaces only
        the seed&apos;s own rows.
      </P>

      <H2 id="check">Check it works</H2>
      <UL>
        <li>
          <C>https://resell.store</C> loads, and <C>https://docs.resell.store</C> shows these docs.
        </li>
        <li>
          <C>https://api.resell.store/v1/openapi.json</C> returns the API description.
        </li>
        <li>A store loads on its subdomain, e.g. one from the seed.</li>
        <li>Signing in by email works: the link arrives, and you stay signed in when you open your store.</li>
        <li>A checkout with the sandbox buyer completes, and the order shows on both sides.</li>
        <li>
          The cron job&apos;s log shows <C>Started resell-sweeps/offerSweep: …</C> every 15 minutes, and the workflow&apos;s runs
          succeed.
        </li>
        <li>In the PayPal dashboard, webhook deliveries to your site come back 200.</li>
      </UL>

      <H2 id="troubleshooting">Troubleshooting</H2>
      <Table
        head={["You see", "Check"]}
        rows={[
          [
            "Checkout says \"Test checkout: no money moves yet\"",
            <>
              <C key="a">PAYPAL_CLIENT_ID</C>, <C>PAYPAL_CLIENT_SECRET</C> and <C>PAYPAL_PARTNER_MERCHANT_ID</C> must all be set on the
              web service. If only the seller screens say it, <C>NEXT_PUBLIC_PAYPAL_CLIENT_ID</C> is missing or the app wasn&apos;t
              rebuilt
            </>,
          ],
          [
            "\"This seller hasn't connected PayPal yet\" at checkout",
            <>The seller needs to connect PayPal on Connections, or set <C key="b">PAYPAL_DEMO_SELLER_ID</C> in the sandbox</>,
          ],
          ["The Shopping sidekick says Coming soon", <><C key="c">KERNEL_API_KEY</C> and <C>ANTHROPIC_API_KEY</C> are both needed</>],
          ["No emails arrive", <><C key="d">RESEND_API_KEY</C> is set, the domain is verified in Resend, and <C>EMAIL_FROM</C> uses it. Without a key, emails only go to the log</>],
          ["Stores 404 or don't resolve", <>The <C key="e">*.resell.store</C> custom domain and its DNS, and <C>NEXT_PUBLIC_ROOT_DOMAIN</C> matching the domain (then redeploy)</>],
          ["Signed in on the marketplace but not on a store", <><C key="f">BETTER_AUTH_URL</C> and <C>NEXT_PUBLIC_ROOT_DOMAIN</C> use the real domain, so the cookie is set on <C>.resell.store</C></>],
          ["PayPal webhooks get 401", <><C key="g">PAYPAL_WEBHOOK_ID</C> matches the webhook in the same PayPal app and environment</>],
          ["Offers never expire, payouts never happen", <>The cron job&apos;s <C key="h">RENDER_API_KEY</C>, and the workflow&apos;s logs. As a stopgap, <C>POST /api/cron/sweep</C> with <C>CRON_SECRET</C> runs one pass</>],
          ["The deploy stops at pre-deploy", "A migration failed: read the log, fix it in a new migration and push"],
        ]}
      />
      <P>
        More on the timed side in <A href={`${base}/dev/jobs`}>Background jobs</A>.
      </P>
    </DocPage>
  );
}
