import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, DocPage, H2, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "Everything else · Developers" };

export default async function More() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/more"
      eyebrow="Built with"
      title="Everything else"
      lead="The rest of the stack: search, storage, email, sign-in, the MCP servers, the database layer and the UI kit. Each one is a single file or package, and most switch off cleanly without their keys."
      toc={[
        { id: "jina", title: "Jina and pgvector" },
        { id: "r2", title: "Cloudflare R2" },
        { id: "resend", title: "Resend" },
        { id: "better-auth", title: "Better Auth" },
        { id: "react-email", title: "React Email" },
        { id: "mcp-sdk", title: "MCP TypeScript SDK" },
        { id: "drizzle", title: "Drizzle" },
        { id: "ui", title: "Base UI and Tailwind" },
      ]}
    >
      <H2 id="jina" className="mt-0">
        Jina and pgvector
      </H2>
      <P>
        Search by meaning, so &quot;yellow cast iron pot&quot; finds Maya&apos;s Le Creuset even though she never wrote &quot;cast
        iron&quot;.
      </P>
      <UL>
        <li>
          <strong>Embedding.</strong> <C>lib/server/embeddings.ts</C> calls <C>POST https://api.jina.ai/v1/embeddings</C> with 1024
          dimensions, normalized. A listing is embedded as a <C>retrieval.passage</C> (title, one-liner, category, details and
          description) when it&apos;s published and whenever its words change (<C>refreshEmbedding</C>); a search as a{" "}
          <C>retrieval.query</C>.
        </li>
        <li>
          <strong>Storing.</strong> <C>listing.embedding</C> is <C>vector(1024)</C> with an HNSW cosine index. Migration{" "}
          <C>0000_enable-pgvector</C> switches the extension on.
        </li>
        <li>
          <strong>Searching.</strong> <C>searchListings</C> in <C>lib/server/market.ts</C> runs two rankings side by side, 200
          candidates each: Postgres full text (<C>websearch_to_tsquery</C>, ranked by <C>ts_rank_cd</C>, with a boost when the shop
          name matches) and pgvector cosine distance, ignoring anything under 0.3 similarity so &quot;boots&quot; doesn&apos;t return
          mugs. They&apos;re merged with reciprocal rank fusion: each ranking adds <C>1 / (60 + rank)</C>.
        </li>
        <li>
          <strong>Without it.</strong> No <C>JINA_EMBEDDING_MODEL_KEY</C>, or a failed call, and search quietly uses text alone.
        </li>
      </UL>
      <CodeBlock code={`JINA_EMBEDDING_MODEL_KEY=jina_…\nJINA_EMBEDDING_MODEL=jina-embeddings-v5-text-small   # the default`} />

      <H2 id="r2">Cloudflare R2</H2>
      <P>
        Photos and videos. <C>lib/server/files.ts</C> signs S3 requests with <C>aws4fetch</C> and stores uploads at{" "}
        <C>uploads/&#123;owner&#125;/&#123;id&#125;.&#123;ext&#125;</C>. Photos can be up to 10 MB, videos 40 MB. The rest of the app
        only sees file ids and <C>/api/files/&#123;id&#125;</C>, which redirects (308) to <C>R2_PUBLIC_URL</C> when there is one or
        streams from the bucket, cached forever since files never change.
      </P>
      <P>
        Without R2 the bytes are kept in Postgres (<C>file.data</C>), which is fine locally. Env: <C>R2_URL</C>,{" "}
        <C>R2_ACCESS_KEY</C>, <C>R2_SECRET_ACCESS_KEY</C>, <C>R2_BUCKET</C> (default <C>resell-store</C>), <C>R2_PUBLIC_URL</C>{" "}
        (optional).
      </P>

      <H2 id="resend">Resend</H2>
      <P>
        <C>sendEmail()</C> in <C>lib/server/email.ts</C> renders a React Email template to HTML and plain text and posts it to{" "}
        <C>https://api.resend.com/emails</C>. Without <C>RESEND_API_KEY</C> the text is logged to the console instead, and in
        development the sign-in link shows on the sign-in page. Notifications to <C>example.com</C> addresses are logged, never
        sent (<C>lib/server/notify.ts</C>), so seeded accounts stay quiet. Env: <C>RESEND_API_KEY</C>, <C>EMAIL_FROM</C>, and <C>SUPPORT_EMAIL</C> for problems that need a person.
      </P>

      <H2 id="better-auth">Better Auth</H2>
      <UL>
        <li>
          <C>lib/server/auth.ts</C>, with the Drizzle adapter and the handler at <C>/api/auth/[...all]</C>. Sign-in is an email link
          (15 minutes). Sessions last 30 days.
        </li>
        <li>
          Stores live on subdomains, so in production the session cookie is set on <C>.resell.store</C> and every store reads it.
          Browsers won&apos;t share a cookie across <C>*.localhost</C>, so in development a one-time token hands the same session to
          each store host (see <A href={`${base}/dev/routing`}>Domains and routing</A>).
        </li>
        <li>
          Pages check auth themselves with <C>requireUser()</C> from <C>lib/server/session.ts</C>, which sends signed-out people to{" "}
          <C>/welcome</C>. Env: <C>BETTER_AUTH_SECRET</C> (required), <C>BETTER_AUTH_URL</C>.
        </li>
      </UL>

      <H2 id="react-email">React Email</H2>
      <P>
        <C>packages/email</C> holds the templates as React components with a shared theme, so emails look like the app. There are
        10: sign-in, offer received, offer update, sold, shipped, order placed, paid out, new from a shop you follow, the evening
        agent summary, and a general notice. Preview them with <C>pnpm email</C> (port 5690).
      </P>

      <H2 id="mcp-sdk">MCP TypeScript SDK</H2>
      <P>
        <C>packages/mcp</C> builds both MCP servers on <C>@modelcontextprotocol/server</C> 2.3.0: <C>McpServer</C> and{" "}
        <C>registerTool</C> for the tools, <C>createMcpHandler</C> for the hosted HTTP endpoint, <C>serveStdio</C> for the local
        command, and elicitation for &quot;Ask me first&quot;. How the package fits together is on{" "}
        <A href={`${base}/dev/api`}>API, docs and MCP</A>.
      </P>

      <H2 id="drizzle">Drizzle</H2>
      <P>
        <C>packages/db</C> (<C>@repo/db</C>) has the schema (<C>src/schema.ts</C>, 33 tables) and the SQL migrations (
        <C>packages/db/drizzle</C>, <C>0000</C> to <C>0015</C>). Render runs <C>pnpm db:migrate</C> before each deploy.
      </P>
      <Table
        head={["Command", "Does"]}
        rows={[
          [<C key="a">pnpm db:generate</C>, "Writes a migration from schema changes"],
          [<C key="b">pnpm db:migrate</C>, "Applies migrations"],
          [<C key="c">pnpm db:studio</C>, "Opens Drizzle Studio"],
        ]}
      />
      <P>
        Import query helpers (<C>eq</C>, <C>and</C>, <C>sql</C>…) from <C>@repo/db</C>, never from <C>drizzle-orm</C> directly, so
        the app and the schema share one copy of Drizzle.
      </P>

      <H2 id="ui">Base UI and Tailwind</H2>
      <P>
        <C>packages/ui</C> (<C>@repo/ui</C>) is the component kit: buttons, chips, fields, item and seller cards, the tab bar,
        dialogs, drawers, popovers, toasts, tooltips and the icon set. Interactive pieces are built on <C>@base-ui/react</C> for
        accessible behaviour, styled with Tailwind CSS v4 from the tokens in <C>src/styles.css</C>. Components import as{" "}
        <C>@repo/ui/button</C>, icons as <C>@repo/ui/icons</C>, and helpers like <C>cn</C> from <C>@repo/ui/lib/utils</C>.
      </P>
    </DocPage>
  );
}
