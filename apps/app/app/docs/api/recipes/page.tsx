import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { apiUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Recipes · API" };

export default async function Recipes() {
  const base = await docsBase();
  const api = apiUrl();
  const ref = (group: string) => `${base}/api/${group}`;

  const listFromWords = `# 1. Make a draft and start the research agent on it
curl ${api}/listings \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d shop=maya \\
  -d prompt="yellow le creuset dutch oven, 5.5 qt, used twice" \\
  -d "photo_urls[]=https://example.com/dutch-oven.jpg" \\
  -d research=true

# 2. Check on it every few seconds until "status" is "done" (about a minute)
curl ${api}/listings/$LISTING/research \\
  -H "Authorization: Bearer $RESELL_KEY"

# 3. Have the writing agent write the title and description
curl ${api}/listings/$LISTING/words \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d tone="Straight to the point"

# 4. Put it live
curl -X POST ${api}/listings/$LISTING/publish \\
  -H "Authorization: Bearer $RESELL_KEY"`;

  const offersScript = `// answer-offers.mjs: run it whenever you like, or from a webhook
const api = "${api}";
const headers = { Authorization: \`Bearer \${process.env.RESELL_KEY}\`, "Content-Type": "application/json" };
const get = (path) => fetch(api + path, { headers }).then((r) => r.json());
const post = (path, body = {}) => fetch(api + path, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json());

const { data: offers } = await get("/offers?status=open&limit=100");

for (const offer of offers) {
  const listing = await get(\`/listings/\${offer.listing.id}\`);
  const lowest = listing.lowest_price ?? listing.price;

  if (offer.amount >= lowest) {
    await post(\`/offers/\${offer.id}/accept\`);
    console.log(\`Accepted $\${offer.amount} from \${offer.buyer.name} on \${offer.listing.title}\`);
  } else if (offer.amount < lowest * 0.6) {
    await post(\`/offers/\${offer.id}/decline\`);
  } else {
    // Meet them halfway, never under your lowest
    const amount = Math.max(lowest, Math.round((offer.amount + listing.price) / 2));
    if (amount < listing.price) await post(\`/offers/\${offer.id}/counter\`, { amount });
  }
}`;

  const shipLoop = `# Everything waiting to be shipped
curl "${api}/sales?status=paid" \\
  -H "Authorization: Bearer $RESELL_KEY"

# Mark one shipped. The buyer gets an email with the tracking link
curl ${api}/sales/$SALE/ship \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d tracking_number=9400111899223197428490`;

  const exportSales = `# Needs jq. Pages through every sale, 100 at a time
offset=0
echo "sold_at,item,shipping,total,you_get,status,title" > sales.csv
while :; do
  page=$(curl -s "${api}/sales?limit=100&offset=$offset" -H "Authorization: Bearer $RESELL_KEY")
  echo "$page" | jq -r '.data[] | [.paid_at, .item, .shipping, .total, .payout.seller_net, .status, .listing.title] | @csv' >> sales.csv
  [ "$(echo "$page" | jq .has_more)" = "true" ] || break
  offset=$((offset + 100))
done`;

  const webhookServer = `// server.mjs: node server.mjs, then set the address with PUT /webhooks
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.RESELL_WEBHOOK_SECRET; // whsec_…, shown once when you set the webhook
const seen = new Set();

function genuine(rawBody, header = "") {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret).update(\`\${parts.t}.\${rawBody}\`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && expected.length === (parts.v1 ?? "").length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!genuine(raw, req.headers["resell-signature"])) return res.writeHead(401).end();

  const event = JSON.parse(raw);
  res.writeHead(200).end(); // answer fast, then do the work
  if (seen.has(event.id)) return; // retries reuse the same id
  seen.add(event.id);

  if (event.type === "listing.sold") {
    const order = event.data.object;
    console.log(\`Sold: \${order.listing.title} for $\${order.total}. Ship to \${order.ship_to.name}.\`);
  }
  if (event.type === "offer.received") {
    const offer = event.data.object;
    console.log(\`\${offer.buyer.name} offered $\${offer.amount} on \${offer.listing.title}\`);
  }
}).listen(3000);`;

  const setWebhook = `curl -X PUT ${api}/webhooks \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com/hooks/resell", "events": ["listing.sold", "offer.received"] }'

# Send a test event to check it's wired up
curl -X POST ${api}/webhooks/test \\
  -H "Authorization: Bearer $RESELL_KEY"`;

  const priceCheck = `# Look something up without listing it
curl ${api}/research \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d query="Patagonia Better Sweater, women's M, navy"

# Poll with the listing id from the answer, then read findings.price
curl ${api}/listings/$LISTING/research \\
  -H "Authorization: Bearer $RESELL_KEY"

# Not selling it after all? Delete the draft
curl -X DELETE ${api}/listings/$LISTING \\
  -H "Authorization: Bearer $RESELL_KEY"`;

  const search = `# No key needed: search by meaning, not just words
curl "${api}/market/search?q=something%20to%20cook%20a%20stew%20in&price=25-100&offers=true"

# Then, as a buyer with a key: make an offer…
curl ${api}/offers \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d listing=$LISTING \\
  -d amount=60 \\
  -d note="Could you post it this week?"

# …and once it's accepted, get the page to pay on
curl ${api}/checkout \\
  -H "Authorization: Bearer $RESELL_KEY" \\
  -d listing=$LISTING`;

  return (
    <DocPage
      base={base}
      path="/api/recipes"
      eyebrow="API"
      title="Recipes"
      lead="Short, complete examples of the things people most often build: list from a few words, answer offers on your own rules, ship, export your sales and react to events."
      toc={[
        { id: "before", title: "Before you start" },
        { id: "list", title: "List something from a few words" },
        { id: "worth", title: "What's it worth?" },
        { id: "offers", title: "Answer offers with your own rules" },
        { id: "ship", title: "Ship what sold" },
        { id: "export", title: "Export your sales" },
        { id: "webhooks", title: "React when something happens" },
        { id: "shopping", title: "Shop from a script" },
      ]}
    >
      <H2 id="before" className="mt-0">
        Before you start
      </H2>
      <P>
        Every recipe below uses a secret key from <A href={siteUrl("/tools/api")}>resell.store/tools/api</A> in a <C>RESELL_KEY</C>{" "}
        variable. Replace <C>$LISTING</C> and <C>$SALE</C> with ids from earlier answers. Amounts are dollars.
      </P>
      <CodeBlock title="Terminal" code={`export RESELL_KEY=rs_live_...`} />

      <H2 id="list">List something from a few words</H2>
      <P>
        The same agent that helps in the app does the work: it reads your words and picture, finds the item in the catalog, checks
        what similar ones are listed for, and sets a price and a lowest price. You only have to publish.
      </P>
      <CodeBlock title="Terminal" code={listFromWords} />
      <P>
        Research sets <C>price</C> and <C>lowest_price</C> from what it found, unless you sent your own. Change anything with{" "}
        <C>PATCH /listings/:id</C> before you publish. See <A href={ref("listings")}>Listings</A> and{" "}
        <A href={ref("research")}>Research</A>.
      </P>
      <Callout tone="tip" title="Already know the price?">
        Skip research: send <C>title</C>, <C>price</C> and <C>publish=true</C> in the first request and it goes live straight away.
      </Callout>

      <H2 id="worth">What&apos;s it worth?</H2>
      <P>
        <C>POST /research</C> is the shortcut for pricing something you haven&apos;t decided to sell. It makes a draft to hold the
        findings, so delete it afterwards if you don&apos;t need it.
      </P>
      <CodeBlock title="Terminal" code={priceCheck} />

      <H2 id="offers">Answer offers with your own rules</H2>
      <P>
        Your shop agent already counters lowball offers in the app. If you&apos;d like different rules, turn off &quot;Haggle on
        offers&quot; in your shop settings and run your own. This one accepts anything at or above your lowest price, declines
        anything far below it, and meets everyone else halfway.
      </P>
      <CodeBlock title="answer-offers.mjs" code={offersScript} />
      <P>
        A counter has to sit between their offer and your asking price, and the buyer then has 48 hours to take it. See{" "}
        <A href={ref("offers")}>Offers</A>.
      </P>

      <H2 id="ship">Ship what sold</H2>
      <P>
        Sales waiting for you have the status <C>paid</C>. Each one carries the buyer&apos;s <C>ship_to</C> address. Ship within 3
        days of payment; after that the buyer may cancel.
      </P>
      <CodeBlock title="Terminal" code={shipLoop} />

      <H2 id="export">Export your sales</H2>
      <P>
        Every sale includes what the buyer paid and what you get once the money&apos;s released (<C>payout.seller_net</C>, after the
        resell.store and PayPal fees). This writes them all to a spreadsheet.
      </P>
      <CodeBlock title="export-sales.sh" code={exportSales} />

      <H2 id="webhooks">React when something happens</H2>
      <OL>
        <li>Run a small server that checks the signature and handles the events you care about:</li>
      </OL>
      <CodeBlock title="server.mjs" code={webhookServer} />
      <OL>
        <li value={2}>
          Tell resell.store where it is. The first answer includes the signing <C>secret</C>, once:
        </li>
      </OL>
      <CodeBlock title="Terminal" code={setWebhook} />
      <P>
        Answer with a 2xx within 10 seconds. Anything else is retried, with the same event id, for about a day. See{" "}
        <A href={ref("webhooks")}>Webhooks</A> for every event and what it carries.
      </P>

      <H2 id="shopping">Shop from a script</H2>
      <P>
        Marketplace search needs no key at all. Offers and checkout links need a key with the <C>buying</C> permission. Paying
        always happens in a browser: <C>POST /checkout</C> hands you the page, and nothing is charged until someone pays there.
      </P>
      <CodeBlock title="Terminal" code={search} />
      <P>
        See <A href={ref("marketplace")}>Marketplace</A> and <A href={ref("buying")}>Buying</A>, or let an AI app do this for you
        with the <A href={`${base}/mcp/buyer`}>shopping MCP server</A>.
      </P>
    </DocPage>
  );
}
