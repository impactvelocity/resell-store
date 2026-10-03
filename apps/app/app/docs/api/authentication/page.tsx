import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { apiUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Keys and permissions" };

const scopes = [
  ["read", "See your shops, listings, offers, sales, messages, likes, follows and stats."],
  ["shops", "Open shops and change or delete them, including their address."],
  ["listings", "Make, change, publish, take down and delete listings; photos; research; writing the words."],
  ["messages", "Reply to conversations and mark them read."],
  ["offers", "Accept, decline and counter offers on your listings."],
  ["orders", "Mark sales shipped."],
  ["buying", "Like, follow, share, make offers, message shops, get checkout links and confirm deliveries."],
  ["webhooks", "Set where we send events."],
];

export default async function Authentication() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/api/authentication"
      eyebrow="API"
      title="Keys and permissions"
      lead="Every request that touches your account carries a key. Marketplace reads don't need one."
      toc={[
        { id: "secret-keys", title: "Secret keys" },
        { id: "sending", title: "Sending your key" },
        { id: "agent-links", title: "Agent links" },
        { id: "permissions", title: "Permissions" },
        { id: "safety", title: "Keeping keys safe" },
      ]}
    >
      <H2 id="secret-keys" className="mt-0">
        Secret keys
      </H2>
      <P>
        Make one on <A href={siteUrl("/tools/api")}>resell.store/tools/api</A>. Secret keys start with <C>rs_live_</C> and can do
        everything you can do in the app, apart from changing where your money goes, which only you can do, signed in.
      </P>
      <UL>
        <li>We show a key once, when it&apos;s made. We only keep a fingerprint of it, so we can&apos;t show it again.</li>
        <li>You have one secret key at a time. Making a new one stops the old one straight away.</li>
        <li>Requests made with it count towards your monthly limit (see <A href={`${base}/api/errors`}>Errors and limits</A>).</li>
      </UL>

      <H2 id="sending">Sending your key</H2>
      <P>
        Put it in the <C>Authorization</C> header as a bearer token. <C>X-Api-Key: rs_live_…</C> works too, for tools that can only set
        a plain header.
      </P>
      <CodeBlock title="Terminal" code={`curl ${apiUrl("/me")} \\\n  -H "Authorization: Bearer rs_live_..."`} />
      <P>
        A missing key on an endpoint that needs one answers <C>401 unauthorized</C>. A key without the right permission answers{" "}
        <C>403 forbidden</C> and names the permission it needs.
      </P>

      <H2 id="agent-links">Agent links</H2>
      <P>
        The private link on <A href={siteUrl("/tools/agent")}>Your agent</A> is a key too, made for AI apps. It only has the
        permissions you switch on there, and you can change them at any time without making a new link. Its token works as a bearer
        token on this API, so a script can act exactly as your agent would. See <A href={`${base}/mcp`}>MCP</A>.
      </P>

      <H2 id="permissions">Permissions</H2>
      <P>
        Each endpoint in the reference says which permission it needs. Secret keys have all of them. Reads (<C>GET</C>) need{" "}
        <C>read</C> unless they say otherwise.
      </P>
      <Table head={["Permission", "Lets the key"]} rows={scopes.map(([s, what]) => [<C key={s}>{s}</C>, what])} />
      <Callout tone="note" title="Never through a key">
        Connecting PayPal, changing where payouts go and deleting your account only happen in the app, signed in as you.
      </Callout>

      <H2 id="safety">Keeping keys safe</H2>
      <UL>
        <li>Keep keys in environment variables or a secrets manager, never in code you share or in a web page.</li>
        <li>Calls from a browser are allowed (CORS is open), but only do that with your own key, on your own machine.</li>
        <li>If a key might have leaked, make a new one. The old one stops working at once.</li>
      </UL>
    </DocPage>
  );
}
