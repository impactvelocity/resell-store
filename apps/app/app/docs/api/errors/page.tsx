import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { C, DocPage, H2, P, Table } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Errors and limits" };

const types = [
  ["400", "invalid_request", "Something in the request needs fixing. `param` names the field when there is one."],
  ["401", "unauthorized", "No key, or the key isn't valid any more."],
  ["403", "forbidden", "The key doesn't have the permission this needs."],
  ["404", "not_found", "Nothing with that id, or it isn't yours."],
  ["409", "conflict", "It can't happen in the state things are in: the listing already sold, the offer was already answered."],
  ["429", "rate_limited", "That's this month's requests."],
  ["503", "unavailable", "A part of the service isn't set up or is down, like the writing agent."],
  ["500", "server_error", "Something broke on our side. Quote the request id if you tell us."],
];

export default async function Errors() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/api/errors"
      eyebrow="API"
      title="Errors and limits"
      lead="Errors are plain sentences you can show to a person, with a type your code can switch on."
      toc={[
        { id: "errors", title: "Errors" },
        { id: "types", title: "Types" },
        { id: "limits", title: "Limits" },
        { id: "request-ids", title: "Request ids" },
      ]}
    >
      <H2 id="errors" className="mt-0">
        Errors
      </H2>
      <P>Anything that isn&apos;t a 2xx answers with the same shape:</P>
      <CodeBlock
        tone="paper"
        title="Response · 409"
        code={JSON.stringify({ error: { type: "conflict", message: "That offer has already been answered or ran out." } }, null, 2)}
      />
      <CodeBlock
        tone="paper"
        title="Response · 400"
        code={JSON.stringify(
          { error: { type: "invalid_request", message: "price: Use a number of dollars, like 185 or 185.50.", param: "price" } },
          null,
          2,
        )}
      />

      <H2 id="types">Types</H2>
      <Table
        head={["Status", "Type", "What it means"]}
        rows={types.map(([status, type, what]) => [
          <span key="s" className="font-mono">{status}</span>,
          <C key="t">{type}</C>,
          what!.split("`").map((part, i) => (i % 2 ? <C key={i}>{part}</C> : part)),
        ])}
      />

      <H2 id="limits">Limits</H2>
      <P>
        While we&apos;re in beta, each person gets 10,000 requests a month across all their keys and agent links, free. The count
        starts over on the 1st (UTC). Every response with a key says where you are:
      </P>
      <CodeBlock code={`X-RateLimit-Limit: 10000\nX-RateLimit-Remaining: 8760`} />
      <P>
        Past the limit, requests answer <C>429 rate_limited</C> until the month turns. You can see this month&apos;s count on the API
        page in the app.
      </P>

      <H2 id="request-ids">Request ids</H2>
      <P>
        Every response has an <C>X-Request-Id</C> header (<C>req_…</C>). Server errors include it in the message, too. Send it to us
        and we can find exactly what happened.
      </P>
    </DocPage>
  );
}
