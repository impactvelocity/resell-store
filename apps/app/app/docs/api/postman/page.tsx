import type { Metadata } from "next";
import { A, C, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { apiUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Postman" };

/* How to get the Postman collection (/v1/postman.json, lib/server/api/postman.ts) and set your key in it. */
export default async function Postman() {
  const base = await docsBase();
  const link = apiUrl("/postman.json");
  return (
    <DocPage
      base={base}
      path="/api/postman"
      eyebrow="API"
      title="Postman"
      lead="Every request in the API, ready to send from Postman. Import it, set your key once, and try anything."
      toc={[
        { id: "get-it", title: "Get the collection" },
        { id: "your-key", title: "Set your key" },
        { id: "first-request", title: "Send your first request" },
        { id: "filling-in", title: "Filling in a request" },
        { id: "variables", title: "The variables" },
        { id: "updating", title: "Keeping it up to date" },
        { id: "trouble", title: "If something's wrong" },
      ]}
    >
      <H2 id="get-it" className="mt-0">
        Get the collection
      </H2>
      <P>There are two ways in. Both give you the same collection: one folder per part of the API, one request per endpoint.</P>
      <OL>
        <li>
          <strong>Download it.</strong> On <A href={siteUrl("/tools/api")}>resell.store/tools/api</A>, choose{" "}
          <strong>Download collection</strong>. If you have a key, it&apos;s already filled in. In Postman, choose{" "}
          <strong>Import</strong> and drop the file in.
        </li>
        <li>
          <strong>Import the link.</strong> In Postman, choose <strong>Import</strong> and paste <C>{link}</C>. This copy has no key in
          it, so set yours next.
        </li>
      </OL>

      <H2 id="your-key">Set your key</H2>
      <P>
        Every request sends the collection&apos;s <C>apiKey</C> variable as <C>Authorization: Bearer …</C>, so you set it in one place.
        Your key is on <A href={siteUrl("/tools/api")}>resell.store/tools/api</A>: choose <strong>Copy</strong> next to it. No key yet?
        Choose <strong>Make a key</strong> there first.
      </P>
      <OL>
        <li>In Postman&apos;s sidebar, open the <strong>resell.store API</strong> collection.</li>
        <li>
          Go to its <strong>Variables</strong> tab and find <C>apiKey</C>.
        </li>
        <li>
          Paste your key as its value. If Postman shows both an <strong>Initial value</strong> and a <strong>Current value</strong>, use{" "}
          <strong>Current value</strong>: it stays on your computer and isn&apos;t synced or shared.
        </li>
        <li>Save the collection.</li>
      </OL>
      <Callout tone="warn" title="The key travels with the collection">
        A downloaded collection has your key in it, and so does any collection where you put it in the initial value. Before you share
        the collection or move it to a team workspace, clear <C>apiKey</C>, or keep the key in an environment instead (below).
      </Callout>
      <P>
        Prefer environments? Make one with a variable called <C>apiKey</C> holding your key and select it. A variable in the selected
        environment wins over the collection&apos;s, so you can leave the collection&apos;s <C>apiKey</C> empty and keep one environment
        per key.
      </P>

      <H2 id="first-request">Send your first request</H2>
      <P>
        Open <strong>Account</strong>, then <strong>Who this key belongs to</strong>, and choose <strong>Send</strong>. It calls{" "}
        <C>GET /me</C> and answers with your name, what the key may do and your shops. If that works, everything else will.
      </P>
      <P>
        Each request has an example response saved with it, under <strong>Examples</strong>, so you can see what comes back before you
        send it. The description beside each request says which permission it needs.
      </P>

      <H2 id="filling-in">Filling in a request</H2>
      <Table
        head={["In Postman", "What to do"]}
        rows={[
          [
            "Path variables",
            <span key="p">
              Paths like <C>/listings/:id</C> need the id. Fill it in under <strong>Params</strong>, in Path Variables. Ids come from
              list requests, like <strong>Listings</strong>, then the request that lists them.
            </span>,
          ],
          [
            "Query params",
            <span key="q">
              Ticked ones come from the docs example. The rest are there unticked: tick the ones you want and give them a value.
            </span>,
          ],
          [
            "Body",
            <span key="b">
              JSON, taken from the docs example, so it already has the right fields. Change the values to yours. Money is in dollars,
              like <C>185</C>.
            </span>,
          ],
          [
            "Photo uploads",
            <span key="f">
              The body is form data with a <C>file</C> field. Choose a picture from your computer for it.
            </span>,
          ],
        ]}
      />
      <Callout tone="tip" title="Drafts are safe to try">
        Making a listing gives you a draft. Nobody sees it until you publish it, and you can delete it afterwards.
      </Callout>

      <H2 id="variables">The variables</H2>
      <Table
        head={["Variable", "What it is"]}
        rows={[
          [<C key="b">baseUrl</C>, <span key="bv">Where requests go: <C>{apiUrl()}</C>. Every request starts with it.</span>],
          [
            <C key="k">apiKey</C>,
            <span key="kv">
              Your secret key (<C>rs_live_…</C>). An agent link&apos;s token works here too, with only the permissions you gave it.
            </span>,
          ],
        ]}
      />

      <H2 id="updating">Keeping it up to date</H2>
      <P>
        The collection is made from the same list as these docs, so new endpoints turn up in it straight away. To get them, import the
        link or a fresh download again. It&apos;s the same collection, so Postman offers to replace the one you have.
      </P>
      <P>Replacing it can reset your variables. Check <C>apiKey</C> afterwards, or keep your key in an environment so it&apos;s never touched.</P>
      <P>
        Prefer OpenAPI? <A href={apiUrl("/openapi.json")}>openapi.json</A> also imports into Postman. It has the same endpoints but
        without the key set up for you.
      </P>

      <H2 id="trouble">If something&apos;s wrong</H2>
      <UL>
        <li>
          <C>401 unauthorized</C>: <C>apiKey</C> is empty, or it&apos;s an old key. Making a new key stops the old one, so copy the
          current one from <A href={siteUrl("/tools/api")}>resell.store/tools/api</A>.
        </li>
        <li>
          <C>403 forbidden</C>: the key can&apos;t do that. Secret keys can do everything, so this usually means you&apos;re using an
          agent link without that permission. See <A href={`${base}/api/authentication`}>Keys and permissions</A>.
        </li>
        <li>
          <C>not_found</C> or <C>invalid_request</C> on a request with <C>:id</C>: the path variable is empty, or it isn&apos;t one of
          yours.
        </li>
        <li>
          <C>429 rate_limited</C>: you&apos;ve used this month&apos;s requests. See <A href={`${base}/api/errors`}>Errors and limits</A>.
        </li>
      </UL>
    </DocPage>
  );
}
