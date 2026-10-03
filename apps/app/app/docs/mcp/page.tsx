import type { Metadata } from "next";
import { BagIcon, TagIcon } from "@repo/ui/icons";
import { CodeBlock } from "../../../components/docs/code";
import { A, C, Callout, CardGrid, DocPage, H2, LinkCard, P, Table, UL } from "../../../components/docs/page";
import { docsBase } from "../../../lib/docs/base";
import { mcpUrl, siteUrl } from "../../../lib/urls";

export const metadata: Metadata = { title: "MCP" };

export default async function McpOverview() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/mcp"
      eyebrow="MCP"
      title="Bring your own AI"
      lead="Connect Claude, ChatGPT or any app that takes MCP servers, then just ask: list this, answer that buyer, what sold this week, find me a dutch oven under $150."
      toc={[
        { id: "two-servers", title: "Two servers" },
        { id: "addresses", title: "Addresses" },
        { id: "permissions", title: "What it may do" },
        { id: "money", title: "Money stays with you" },
        { id: "how", title: "How it works" },
      ]}
    >
      <H2 id="two-servers" className="mt-0">
        Two servers
      </H2>
      <CardGrid>
        <LinkCard href={`${base}/mcp/seller`} title="Your shops" icon={<TagIcon size={18} strokeWidth={2.2} />}>
          For sellers. See what needs you, make and publish listings, look up prices, answer offers, ship, reply to buyers and read
          your stats.
        </LinkCard>
        <LinkCard href={`${base}/mcp/buyer`} title="Shopping" icon={<BagIcon size={18} strokeWidth={2.2} />}>
          For buyers. Search by description, look at listings and stores, like, follow, share, message sellers and make offers.
        </LinkCard>
      </CardGrid>

      <H2 id="addresses">Addresses</H2>
      <P>
        Get your private link on <A href={siteUrl("/tools/agent")}>Your agent</A>. It works like a password for your shop, so keep it
        to yourself. Then add it to your AI app (see <A href={`${base}/mcp/connect`}>Connect your app</A>).
      </P>
      <Table
        head={["Server", "Address"]}
        rows={[
          ["Your shops", <C key="a">{mcpUrl("/u/your-private-link")}</C>],
          ["Shopping, as you", <C key="b">{mcpUrl("/buy/your-private-link")}</C>],
          ["Shopping, just looking", <C key="c">{mcpUrl("/buy")}</C>],
        ]}
      />
      <P>
        The &quot;just looking&quot; address needs no link at all: anyone&apos;s AI can search resell.store and look at listings and
        stores with it.
      </P>

      <H2 id="permissions">What it may do</H2>
      <P>
        On Your agent you choose what AI apps using your link may do: see your listings and sales, make and edit listings, reply to
        buyers, answer offers, mark things shipped, and shop for you. Each can be on, off, or <strong>Ask me first</strong>. Your AI app
        only sees the tools it&apos;s allowed to use.
      </P>
      <Callout tone="note" title="Ask me first">
        For things like accepting an offer or making one, your AI app asks you before it goes ahead. Apps that can show a yes/no
        question do; others ask you in the chat and only continue once you&apos;ve said yes.
      </Callout>

      <H2 id="money">Money stays with you</H2>
      <UL>
        <li>No AI app can connect PayPal, change where your money goes or delete your account. Those need you, signed in.</li>
        <li>
          Paying for something always happens in your browser. The shopping server hands you a checkout link; nothing is charged
          until you pay there.
        </li>
        <li>Confirming a delivery pays the seller, so it&apos;s always an ask-first action.</li>
      </UL>

      <H2 id="how">How it works</H2>
      <P>
        The servers are built on the public <A href={`${base}/api`}>API</A>: every tool is an API call made with your link&apos;s
        permissions. Anything your AI can do, a script with the same link can do too, and the same monthly limit covers both.
      </P>
      <CodeBlock
        title="Claude Code"
        code={`claude mcp add --transport http resell-shops ${mcpUrl("/u/your-private-link")}`}
      />
    </DocPage>
  );
}
