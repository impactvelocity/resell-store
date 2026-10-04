import type { Metadata } from "next";
import { CodeBlock } from "../../../components/docs/code";
import { A, C, Callout, CardGrid, DocPage, H2, LinkCard, OL, P, Table } from "../../../components/docs/page";
import { docsBase } from "../../../lib/docs/base";
import { apiGroups } from "../../../lib/docs/nav";
import { apiUrl, siteUrl } from "../../../lib/urls";

export const metadata: Metadata = { title: "API" };

export default async function ApiIntro() {
  const base = await docsBase();
  const api = apiUrl();
  return (
    <DocPage
      base={base}
      path="/api"
      eyebrow="API"
      title="The resell.store API"
      lead="Everything you can do in the app, your code can do too: make and publish listings, look up prices, answer offers, ship sales, reply to buyers and follow your numbers."
      toc={[
        { id: "quick-start", title: "Quick start" },
        { id: "base-url", title: "Base URL" },
        { id: "conventions", title: "How it works" },
        { id: "lists", title: "Lists and pages" },
        { id: "reference", title: "Reference" },
      ]}
    >
      <H2 id="quick-start" className="mt-0">
        Quick start
      </H2>
      <OL>
        <li>
          Make a secret key on <A href={siteUrl("/tools/api")}>resell.store/tools/api</A>. Copy it from there whenever you need
          it, and keep it out of public code.
        </li>
        <li>Check it works:</li>
      </OL>
      <CodeBlock title="Terminal" code={`export RESELL_KEY=rs_live_...\n\ncurl ${api}/me \\\n  -H "Authorization: Bearer $RESELL_KEY"`} />
      <OL>
        <li value={3}>List something with one request. It goes live straight away because it has a title and a price:</li>
      </OL>
      <CodeBlock
        title="Terminal"
        code={`curl ${api}/listings \\\n  -H "Authorization: Bearer $RESELL_KEY" \\\n  -d shop=maya \\\n  -d title="Yellow dutch oven, 5.5 qt" \\\n  -d price=185 \\\n  -d lowest_price=160 \\\n  -d publish=true`}
      />
      <P>
        Not sure what it&apos;s worth? Send a <C>prompt</C> in your own words with <C>research=true</C> instead, and the research agent
        works out what it is and suggests a price. See <A href={`${base}/api/research`}>Research</A>.
      </P>

      <H2 id="base-url">Base URL</H2>
      <CodeBlock code={api} />
      <P>
        Everything is under <C>/v1</C>. We only add to v1 (new endpoints, new fields), so code you write now keeps working. Anything
        that would break it gets a new version.
      </P>

      <H2 id="conventions">How it works</H2>
      <Table
        head={["", ""]}
        rows={[
          [<strong key="a">Sending data</strong>, <>JSON with <C>Content-Type: application/json</C>, or plain form fields (<C>curl -d</C>). Nested fields use brackets: <C>-d fields[Brand]=Le Creuset</C>.</>],
          [<strong key="b">Money</strong>, <>US dollars as numbers: <C>185</C> or <C>185.5</C>. Never cents.</>],
          [<strong key="c">Times</strong>, <>ISO 8601 in UTC, like <C>2026-10-02T18:30:00.000Z</C>.</>],
          [<strong key="d">Objects</strong>, <>Every object has an <C>object</C> field saying what it is (<C>listing</C>, <C>offer</C>, <C>order</C>…) and an <C>id</C>. Shops and stores go by their <C>slug</C>.</>],
          [<strong key="e">Changes</strong>, <><C>PATCH</C> takes only the fields that change. <C>null</C> clears a field.</>],
          [<strong key="f">Who sees what</strong>, <>With your key you see your own shops, listings, offers, sales and messages, never anyone else&apos;s. Marketplace endpoints show what any visitor sees.</>],
        ]}
      />
      <Callout tone="tip" title="Seller and buyer, one key">
        A key belongs to a person, and people both sell and buy. Offers and messages take <C>role=seller</C> (the default) or{" "}
        <C>role=buyer</C> to say which side you&apos;re asking about.
      </Callout>

      <H2 id="lists">Lists and pages</H2>
      <P>
        Lists come back as <C>{`{ "object": "list", "data": [...], "total": 42, "has_more": true }`}</C>. Ask for the next page with{" "}
        <C>offset</C>, and up to 100 at a time with <C>limit</C> (default 25).
      </P>
      <CodeBlock title="Terminal" code={`curl "${api}/listings?status=live&limit=50&offset=50" \\\n  -H "Authorization: Bearer $RESELL_KEY"`} />

      <H2 id="reference">Reference</H2>
      <P>
        Prefer a machine-readable description? <A href={`${api}/openapi.json`}>openapi.json</A> works with Insomnia and code generators. For Postman,
        import <A href={`${api}/postman.json`}>postman.json</A>: every request is ready, and you set your key once. See{" "}
        <A href={`${base}/api/postman`}>Postman</A>.
      </P>
      <CardGrid>
        {apiGroups.map((g) => (
          <LinkCard key={g.id} href={`${base}/api/${g.id}`} title={g.title}>
            {g.blurb}
          </LinkCard>
        ))}
      </CardGrid>
    </DocPage>
  );
}
