import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Data model · Developers" };

const migrations = [
  ["0000", "enable-pgvector", "CREATE EXTENSION vector"],
  ["0001", "init", "Auth tables, file, shop, listing and its photos, copy, research runs, chat"],
  ["0002", "file-storage-key", "file.storage_key for R2"],
  ["0003", "offers-orders", "offer, orders"],
  ["0004", "paypal", "paypal_account, checkout, fee and payout columns on orders"],
  ["0005", "messages-follows", "thread, message, follow"],
  ["0006", "stats", "activity, favourite"],
  ["0007", "api-keys-webhooks", "api_key, api_usage, webhook_endpoint"],
  ["0008", "paypal-demo", "paypal_account.demo"],
  ["0009", "disputes-reminders", "dispute, dispute_event, notice, paypal_event, refund and cancel columns"],
  ["0010", "store-agent", "countered_by and agent_note on offer, by_agent on message, needs_seller on thread"],
  ["0011", "reviews-visits", "review, user.account_seen_at and follow_mailed_at"],
  ["0012", "agent-activity-webhook-retries", "api_activity, api_client, webhook_delivery, api_key.max_offer_cents"],
  ["0013", "price-checks", "price_check (the Shopping sidekick)"],
  ["0014", "account-visit", "user.account_visit_from"],
  ["0015", "market-logins", "market_login (not used yet)"],
];

export default async function DataModel() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/data"
      eyebrow="Developers"
      title="Data model"
      lead="33 tables in one Postgres database, defined in packages/db/src/schema.ts with Drizzle. Here's how they fit together and how to change them."
      toc={[
        { id: "tables", title: "Tables by area" },
        { id: "lifecycles", title: "Statuses" },
        { id: "money", title: "Money" },
        { id: "search", title: "Search columns" },
        { id: "migrations", title: "Changing the schema" },
        { id: "seed", title: "Seed data" },
      ]}
    >
      <H2 id="tables" className="mt-0">
        Tables by area
      </H2>
      <P>
        Ids are text: random UUIDs for app rows, Better Auth&apos;s own ids for its four tables. Columns are snake_case in Postgres
        and camelCase in TypeScript (Drizzle&apos;s <C>casing: &quot;snake_case&quot;</C>). Status columns are text with a TypeScript
        union type, not Postgres enums, so adding a value needs no migration.
      </P>
      <Table
        head={["Area", "Tables", "Notes"]}
        rows={[
          ["Auth", <><C key="a">user</C>, <C>session</C>, <C>account</C>, <C>verification</C></>, "Better Auth's. user also keeps onboarding, profile, notification switches and writing style"],
          ["Files", <C key="b">file</C>, "One row per upload: an R2 key in storage_key, or the bytes in data when there's no R2"],
          ["Shops", <C key="c">shop</C>, "One per subdomain (slug is unique). Visibility, paused, and what the shop's agent may do: answer_questions, haggle, lowest_percent (default 15), ask_hold"],
          ["Listings", <><C key="d">listing</C>, <C>listing_photo</C>, <C>listing_copy</C>, <C>research_run</C>, <C>listing_message</C></>, "The item, its photos (an upload or a credited web picture), each take of the words, research progress, and the workspace chat"],
          ["Buying", <><C key="e">offer</C>, <C>checkout</C>, <C>orders</C></>, "An offer may become an order; checkout remembers a buyer's choices while they're away at PayPal"],
          ["After the sale", <><C key="f">review</C>, <C>dispute</C>, <C>dispute_event</C>, <C>notice</C></>, "Reviews (one per order), problems and their timeline, and every timed email already sent"],
          ["PayPal", <><C key="g">paypal_account</C>, <C>paypal_event</C></>, "A seller's connected merchant (one per person), and every webhook taken in, by PayPal's event id"],
          ["Messages", <><C key="h">thread</C>, <C>message</C></>, "One thread per buyer, shop and listing. Per-side read marks; messages can be by_agent"],
          ["Social and stats", <><C key="i">follow</C>, <C>favourite</C>, <C>activity</C></>, "Follows, likes (the heart), and views and shares with where they came from"],
          ["Developer access", <><C key="j">api_key</C>, <C>api_usage</C>, <C>api_activity</C>, <C>api_client</C>, <C>webhook_endpoint</C>, <C>webhook_delivery</C></>, "Keys and agent links (SHA-256 hashes), monthly usage, what keys changed, which apps use them, and outgoing webhooks"],
          ["Sidekick", <C key="k">price_check</C>, "Things a buyer checked before buying"],
          ["Not wired", <C key="l">market_login</C>, "Signed-in marketplace accounts through Kernel. The table exists; nothing uses it yet"],
        ]}
      />
      <H3>How they connect</H3>
      <CodeBlock
        tone="paper"
        title="Relationships"
        code={`user ─┬─ shop ─── listing ─┬─ listing_photo ── file
      │                     ├─ listing_copy, research_run, listing_message
      │                     ├─ offer ──→ orders ─┬─ review
      │                     │   (buyer = user)   ├─ dispute ── dispute_event
      │                     │                    └─ checkout (PayPal round trip)
      │                     └─ thread ── message (buyer = user)
      ├─ paypal_account, api_key, webhook_endpoint, price_check
      └─ follow (→ shop), favourite (→ listing), activity (→ shop, listing)`}
      />
      <P>
        Deleting a user or shop cascades to most of what hangs off it. Orders are the exception: <C>orders</C> references its
        listing, shop and buyer with <C>restrict</C>, so a sale can&apos;t silently disappear.
      </P>

      <H2 id="lifecycles">Statuses</H2>
      <H3>listing.status</H3>
      <P>
        <C>draft</C> → <C>live</C> → <C>sold</C>. <C>step</C> records the furthest workspace step reached (<C>research</C>,{" "}
        <C>details</C>, <C>photos</C>, <C>words</C>, <C>publish</C>), and <C>visibility</C> is <C>everyone</C> or <C>link</C>.{" "}
        <C>slug</C> is set on publish and unique within the shop. Sold listings stay public and read-only.
      </P>
      <H3>offer.status</H3>
      <Table
        head={["Status", "Means"]}
        rows={[
          [<C key="a">open</C>, "Waiting on the seller"],
          [<C key="b">countered</C>, "The seller (or the shop's agent, see countered_by) named a price; waiting on the buyer"],
          [<C key="c">accepted</C>, "Agreed; the buyer has until expires_at to pay"],
          [<C key="d">paid</C>, "An order exists for it"],
          [<><C key="e">declined</C>, <C>withdrawn</C>, <C>expired</C></>, "Over"],
        ]}
      />
      <P>
        Each new offer, counter or acceptance gets 48 hours (<C>OFFER_HOURS</C> in <C>commerce.ts</C>). The offer sweep marks lapsed
        ones <C>expired</C>.
      </P>
      <H3>orders.status</H3>
      <P>
        <C>paid</C> → <C>shipped</C> → <C>completed</C>, or <C>cancelled</C> / <C>refunded</C>. An order completes when the buyer
        confirms it arrived, or when the order sweep releases it 13 days after shipping. <C>delivered</C> is part of the type (and
        the API&apos;s filter) but nothing sets it yet, since there&apos;s no carrier tracking; <C>delivered_at</C> is filled in when
        the order completes. The money is held until then; <C>released_at</C> is set when PayPal pays the
        seller. <C>payment_provider</C> is <C>paypal</C>, or <C>mock</C> for test checkouts. A partial unique index allows only one
        order per listing that isn&apos;t cancelled or refunded, so two buyers can&apos;t both win a race.
      </P>
      <H3>dispute.status</H3>
      <P>
        <C>open</C> → <C>escalated</C> (someone asked resell.store to step in) → <C>refunded</C> or <C>closed</C>.{" "}
        <C>source</C> is <C>buyer</C> or <C>paypal</C> (opened in PayPal, synced by the webhook). At most one open or escalated
        dispute per order, and while there is one the money stays held.
      </P>
      <H3>The rest</H3>
      <UL>
        <li>
          <C>research_run.status</C> and <C>price_check.status</C>: <C>running</C>, <C>done</C>, <C>failed</C>.
        </li>
        <li>
          <C>checkout.status</C>: <C>created</C>, <C>completed</C>, <C>failed</C>.
        </li>
        <li>
          <C>webhook_delivery.status</C>: <C>pending</C>, <C>delivered</C>, <C>failed</C>.
        </li>
        <li>
          <C>notice</C> has no status: its primary key is <C>(kind, ref_id)</C>, and inserting a row is how a sweep claims a reminder.
        </li>
      </UL>

      <H2 id="money">Money</H2>
      <P>
        Every amount is an integer number of US cents in a column ending <C>_cents</C>: <C>listing.price_cents</C>,{" "}
        <C>lowest_cents</C> and <C>shipping_cents</C>; <C>offer.amount_cents</C>, <C>counter_cents</C> and <C>deposit_cents</C>;
        and on <C>orders</C>, <C>item_cents</C>, <C>shipping_cents</C>, <C>total_cents</C>, <C>platform_fee_cents</C>,{" "}
        <C>paypal_fee_cents</C>, <C>seller_net_cents</C> and <C>refunded_cents</C>. The app converts at the edges with{" "}
        <C>lib/money.ts</C>; the public API speaks dollars.
      </P>

      <H2 id="search">Search columns</H2>
      <UL>
        <li>
          <C>listing.search</C> is a generated <C>tsvector</C>: title and name weighted A, one-liner and category B, description C.
          GIN index.
        </li>
        <li>
          <C>listing.embedding</C> is <C>vector(1024)</C>, a Jina embedding of the public words written on publish. It has an HNSW
          index with <C>vector_cosine_ops</C>. Migration 0000 turns pgvector on.
        </li>
      </UL>
      <P>
        Search runs both and merges them with reciprocal rank fusion (k = 60), ignoring vector matches under 0.3 similarity. Rows
        without an embedding are simply found by text.
      </P>

      <H2 id="migrations">Changing the schema</H2>
      <OL>
        <li>
          Edit <C>packages/db/src/schema.ts</C>.
        </li>
        <li>
          Run <C>pnpm db:generate</C>. drizzle-kit writes the next SQL file to <C>packages/db/drizzle</C>; give it a readable name
          and check the SQL.
        </li>
        <li>
          Run <C>pnpm db:migrate</C> locally. On Render it runs on its own before each deploy (<C>preDeployCommand</C>), and the
          tests migrate <C>resell_test</C> on every run.
        </li>
      </OL>
      <P>
        drizzle-kit reads <C>DATABASE_URL</C> from <C>apps/app/.env.local</C>, or from the environment. <C>pnpm db:studio</C> opens a
        browser view of the data.
      </P>
      <Table head={["#", "Migration", "Adds"]} rows={migrations.map(([n, name, what]) => [n, <C key={n}>{name}</C>, what])} />
      <Callout tone="warn">
        Migrations only ever go forward. Never edit one that&apos;s been applied anywhere; add a new one.
      </Callout>

      <H2 id="seed">Seed data</H2>
      <P>
        <C>pnpm --filter app seed</C> fills the database from <C>apps/app/seed/stores.ts</C>: ten stores, four buyers, about 70
        listings with photos and embeddings, a few sales with reviews, questions in messages, follows, likes and a month of views.
        Everything it creates belongs to users whose id starts with <C>seed_</C>, so it only ever replaces its own rows. It refuses
        a database that isn&apos;t on your machine unless you pass <C>--remote</C>. See{" "}
        <A href={`${base}/dev/local`}>Run it locally</A> and <A href={`${base}/dev/deploy`}>Deploy to Render</A>.
      </P>
    </DocPage>
  );
}
