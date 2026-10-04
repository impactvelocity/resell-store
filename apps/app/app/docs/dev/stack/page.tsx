import type { Metadata } from "next";
import { CodeIcon, SearchIcon, ShieldCheckIcon, SparkleIcon, StatsIcon, TagIcon } from "@repo/ui/icons";
import { A, C, CardGrid, DocPage, H2, LinkCard, OL, P, Table } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "The stack · Developers" };

export default async function Stack() {
  const base = await docsBase();
  const req = <strong>Required</strong>;
  return (
    <DocPage
      base={base}
      path="/dev/stack"
      eyebrow="Built with"
      title="The stack"
      lead="Every service resell.store talks to, what it does here, and what you lose without it. Only Postgres and an auth secret are truly required: the rest switch features on."
      toc={[
        { id: "services", title: "Every service" },
        { id: "together", title: "How they fit together" },
        { id: "pages", title: "Read more" },
      ]}
    >
      <H2 id="services" className="mt-0">
        Every service
      </H2>
      <Table
        head={["Service", "Role here", "What it unlocks", "Needed?"]}
        rows={[
          ["PayPal", "Multiparty payments: sellers connect, orders paid to them with our fee, money held until delivery", "Real checkout (PayPal or guest card), escrow, automatic payouts, refunds", "Optional: a test checkout without it"],
          ["AI model (Anthropic by default, via the AI SDK)", "Identifies items, prices them, writes listings, answers buyers, words counters", "Every agent", "Optional: research falls back to plain numbers"],
          ["Channel3", "Product catalog: what it is, new and resale prices, maker photos", "The catalog and resale research steps", "Optional"],
          ["Kernel", "Cloud browsers reading listings on popular marketplaces", "Live comps and the shopping sidekick", "Optional"],
          ["Render", "Web service, Postgres, Workflows and a Cron Job", "Hosting with store subdomains, retried timers that move money", "Where it runs; locally, a cron route does the timers"],
          ["Postgres + pgvector", "Everything, plus listing embeddings", "Search by meaning", req],
          ["Jina", "Embeddings for listings and searches", "Semantic search", "Optional: text search alone"],
          ["Cloudflare R2", "Photo and video storage", "Uploads off the database", "Optional: bytes stay in Postgres"],
          ["Resend", "Sending email", "Sign-in links, sale and offer emails, digests", "Optional: logged instead"],
          ["Better Auth", "Sessions and email sign-in links", "Accounts shared across store subdomains", req],
          ["React Email", "The 10 email templates", "Emails that look like the app", "Built in"],
          ["MCP TypeScript SDK", "The two MCP servers", "Bring your own AI", "Built in"],
          ["Drizzle", "Schema, queries and migrations", "Type-safe data access", "Built in"],
        ]}
      />
      <P>
        Each service sits behind one file in <C>lib/server/</C> with a <C>…Configured</C> flag (<C>aiConfigured</C>,{" "}
        <C>channel3Configured</C>, <C>kernelConfigured</C>, <C>paypalEnabled()</C>, <C>r2Configured</C>,{" "}
        <C>embeddingsConfigured</C>), so the app checks the flag instead of crashing on a missing key. The full list of variables is
        on <A href={`${base}/dev/env`}>Environment variables</A>.
      </P>

      <H2 id="together">How they fit together</H2>
      <P>One sale, start to finish.</P>
      <OL>
        <li>
          <strong>Maya lists her yellow Le Creuset dutch oven.</strong> She signs in with an email link (Better Auth, sent by Resend
          from a React Email template) and uploads a photo, which goes to R2.
        </li>
        <li>
          <strong>Research.</strong> The AI model looks at the photo and names it. Channel3 finds the product and what it costs new. Kernel
          browsers read what the same pot is listed for on popular marketplaces. The model weighs it all and suggests $185.
        </li>
        <li>
          <strong>Published.</strong> The model writes the words. On publish, Jina embeds the listing into a pgvector column.
        </li>
        <li>
          <strong>Jess finds it</strong> by searching &quot;yellow cast iron pot&quot;. Postgres full text and the vector match are
          merged into one ranking.
        </li>
        <li>
          <strong>Jess pays</strong> through PayPal. The order is made out to Maya&apos;s PayPal with resell.store&apos;s fee in it, and
          the money is held.
        </li>
        <li>
          <strong>Maya ships; Jess gets it.</strong> Jess taps &quot;It&apos;s all good&quot; and the money goes to Maya. If Jess never
          says, a Render Workflow task releases it 13 days after shipping, retrying until PayPal says yes.
        </li>
      </OL>

      <H2 id="pages">Read more</H2>
      <CardGrid>
        <LinkCard href={`${base}/dev/stack/paypal`} title="PayPal" icon={<ShieldCheckIcon size={18} strokeWidth={2.2} />}>
          Seller onboarding, held payments, the platform fee, releases, refunds and webhooks.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack/ai-model`} title="AI model" icon={<SparkleIcon size={18} />}>
          The models, every call site, and the guardrails around them.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack/channel3`} title="Channel3" icon={<SearchIcon size={18} strokeWidth={2.2} />}>
          Catalog matches, new and used prices, maker photos.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack/kernel`} title="Kernel" icon={<TagIcon size={18} strokeWidth={2.2} />}>
          Cloud browsers that read live second-hand listings.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack/render`} title="Render" icon={<StatsIcon size={18} strokeWidth={2.2} />}>
          Web service, Postgres, Workflows and Cron.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack/more`} title="Everything else" icon={<CodeIcon size={18} strokeWidth={2.2} />}>
          Jina and pgvector, R2, Resend, Better Auth, React Email, MCP, Drizzle and the UI kit.
        </LinkCard>
      </CardGrid>
    </DocPage>
  );
}
