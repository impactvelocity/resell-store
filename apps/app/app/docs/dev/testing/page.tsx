import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { C, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Testing · Developers" };

export default async function Testing() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/testing"
      eyebrow="Developers"
      title="Testing"
      lead="Code tests with Vitest, against a real Postgres test database, with every outside service switched off. No browser."
      toc={[
        { id: "run", title: "Running the tests" },
        { id: "database", title: "The test database" },
        { id: "mocked", title: "What's mocked" },
        { id: "writing", title: "Writing a test" },
        { id: "api", title: "Testing the API" },
        { id: "turbo", title: "Through Turborepo" },
        { id: "scripts", title: "Scripts outside Next" },
      ]}
    >
      <H2 id="run" className="mt-0">
        Running the tests
      </H2>
      <CodeBlock
        title="Terminal"
        code={`pnpm db:up                        # once: Postgres on 5433
pnpm --filter app test            # the app's tests
pnpm --filter app test:watch      # re-run on save
pnpm --filter app test sweeps     # only files matching "sweeps"
pnpm test                         # every package, through Turborepo`}
      />
      <P>
        There are 48 test files in the app, one in <C>@repo/email</C> (every template renders) and two in <C>@repo/mcp</C> (the
        API client and the tools). Tests sit next to what they test, as <C>*.test.ts</C> or <C>*.test.tsx</C>; the shared harness
        is in <C>apps/app/test</C>.
      </P>

      <H2 id="database">The test database</H2>
      <P>
        Anything that touches Postgres runs against <C>resell_test</C> on the same Docker server as your dev database, set by{" "}
        <C>TEST_DATABASE_URL</C> (default <C>postgres://resell:resell@localhost:5433/resell_test</C>).
      </P>
      <UL>
        <li>
          <C>test/global-setup.ts</C> runs once per run: it creates the database if it&apos;s missing and applies every migration,
          using <C>ensureDatabase</C> and <C>migrateDatabase</C> from <C>@repo/db/migrate</C>.
        </li>
        <li>
          It refuses any database whose name doesn&apos;t end in <C>_test</C>, so a typo can&apos;t wipe real data.
        </li>
        <li>
          Test files run one at a time (<C>fileParallelism: false</C>) because they share the database.
        </li>
        <li>
          <C>resetDb()</C> from <C>test/db.ts</C> truncates every table. Call it in <C>beforeEach</C>.
        </li>
      </UL>

      <H2 id="mocked">What&apos;s mocked</H2>
      <Table
        head={["What", "How"]}
        rows={[
          [
            "Email",
            <>
              <C key="a">test/setup.ts</C> replaces <C>sendEmail</C> with a spy for every file. <C>emailsTo(address)</C> returns the
              subjects sent to someone; <C>clearEmails()</C> resets.
            </>,
          ],
          [
            "Outside services",
            <>
              <C key="b">vitest.config.ts</C> blanks the PayPal, Resend, Anthropic, Channel3, Jina and R2 keys, so every
              &quot;configured&quot; flag is false and nothing can reach a real service
            </>,
          ],
          [
            "PayPal calls",
            <>
              Tests that need a release or refund <C key="c">vi.mock(&quot;./paypal&quot;)</C> and stub <C>releaseToSeller</C> /{" "}
              <C>refundCapture</C>. <C>paypal.test.ts</C> checks the client itself against a stubbed <C>fetch</C>
            </>,
          ],
          ["Service clients", <><C key="d">channel3.test.ts</C>, <C>embeddings.test.ts</C> and the share-image tests stub <C>fetch</C></>],
          ["server-only", <>Aliased to an empty module (<C key="e">test/empty.ts</C>)</>],
          [
            "Next.js",
            <>
              Tests that go through actions or route handlers mock <C key="f">next/server</C>&apos;s <C>after</C> and{" "}
              <C>next/cache</C>&apos;s <C>revalidatePath</C>
            </>,
          ],
        ]}
      />
      <P>
        The config also fixes <C>NEXT_PUBLIC_ROOT_DOMAIN=localhost:5689</C>, a test auth secret, <C>NODE_ENV=test</C> and{" "}
        <C>CRON_SECRET=test-cron-secret</C>, and clears <C>PAYOUT_DEMO_MINUTES_PER_DAY</C> and <C>PLATFORM_FEE_BPS</C> so timings
        and fees are the real defaults. The Render Workflow wrapper isn&apos;t tested; the sweeps it calls are.
      </P>

      <H2 id="writing">Writing a test</H2>
      <P>
        Factories in <C>test/factories.ts</C> make rows with sensible defaults and take overrides. <C>createSale()</C> gives you a
        seller (&quot;Maya Seller&quot;) with a shop and a live $100 listing with $9 shipping, plus a buyer (&quot;Jess Buyer&quot;).
        Then <C>createOrder(sale, {"{ ... }"})</C> and <C>createOffer(sale, {"{ ... }"})</C> add an order or offer in any state;{" "}
        <C>{"{ paypal: true }"}</C> makes an order look like a real capture. <C>daysAgo(n)</C> helps with timings.{" "}
        <C>test/factories-market.ts</C> adds files, photos, follows, likes and views.
      </P>
      <CodeBlock
        title="lib/server/sweeps.test.ts"
        code={`import { beforeEach, expect, it } from "vitest";
import { db, eq, orders } from "@repo/db";
import { resetDb } from "../../test/db";
import { createOrder, createSale, daysAgo } from "../../test/factories";
import { clearEmails, emailsTo } from "../../test/mail";
import { cancelUnshipped } from "./sweeps";

beforeEach(async () => {
  await resetDb();
  clearEmails();
});

it("cancels an order that never shipped", async () => {
  const sale = await createSale();
  const order = await createOrder(sale, { createdAt: daysAgo(8) });

  expect(await cancelUnshipped(order.id)).toBe(true);
  expect(await cancelUnshipped(order.id)).toBe(false); // twice does nothing

  const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
  expect(row!.status).toBe("cancelled");
  expect(emailsTo(sale.buyer.email).length).toBeGreaterThan(0);
});`}
      />
      <P>
        Factory people get <C>@test.dev</C> addresses, so notification code really &quot;sends&quot; into the spy. Use an{" "}
        <C>@example.com</C> address to check the path where mail is only logged.
      </P>
      <Callout tone="tip">
        Mocks that depend on module state (like <C>vi.mock(&quot;./paypal&quot;)</C>) go at the top of the file, then import the
        module under test with <C>await import(&quot;./sweeps&quot;)</C> so it picks up the mock.
      </Callout>

      <H2 id="api">Testing the API</H2>
      <P>
        <C>test/factories-api.ts</C> issues a real (hashed) key with <C>createKey(userId, {"{ scopes }"})</C> and calls the actual{" "}
        <C>/v1</C> route handler with <C>api(method, path, {"{ token, json }"})</C>, the way curl or the MCP client would. See{" "}
        <C>lib/server/api/routes.test.ts</C> for a buyer making an offer and a seller answering it, end to end.
      </P>
      <CodeBlock
        title="Example"
        code={`const { token } = await createKey(sale.seller.id);
const res = await api("GET", "/listings", { token });
expect(res.status).toBe(200);
expect(res.body.data[0].price).toBe(100); // dollars in the API`}
      />

      <H2 id="turbo">Through Turborepo</H2>
      <P>
        <C>pnpm test</C> runs <C>turbo run test</C>: each package&apos;s own <C>vitest run</C>. The <C>test</C> task has caching
        turned off (results depend on the database, not just files) and passes <C>TEST_DATABASE_URL</C> through. On a CI machine,
        start Postgres with pgvector first (the <C>docker-compose.yml</C> service works) and set <C>TEST_DATABASE_URL</C> if it
        isn&apos;t on <C>localhost:5433</C>. Type checks and lint are separate: <C>pnpm check-types</C> and <C>pnpm lint</C>.
      </P>

      <H2 id="scripts">Scripts outside Next</H2>
      <P>
        Server modules start with <C>import &quot;server-only&quot;</C>, which throws anywhere but inside Next.js.{" "}
        <C>apps/app/workflows/server-only.mjs</C> is a Node resolve hook that swaps it for an empty module. The workflow and the seed
        load it with <C>--import</C>; do the same to try server code from a script:
      </P>
      <CodeBlock
        title="Terminal"
        code={`cd apps/app
pnpm exec tsx --env-file=.env.local --import ./workflows/server-only.mjs scripts/try-something.ts`}
      />
    </DocPage>
  );
}
