import type { Metadata } from "next";
import { BagIcon, ChatIcon } from "@repo/ui/icons";
import { A, C, Callout, CardGrid, DocPage, H2, H3, LinkCard, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { mcpUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Your AI agent" };

export default async function YourAgent() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/your-agent"
      eyebrow="Both sides"
      title="Your AI agent"
      lead="There are two kinds of help here: the agent that looks after your shop inside resell.store, and your own AI app, like Claude or ChatGPT, connected with a private link."
      toc={[
        { id: "two", title: "Two kinds of agent" },
        { id: "shop-agent", title: "Your shop's agent" },
        { id: "link", title: "Your private link" },
        { id: "permissions", title: "What it may do" },
        { id: "shopping", title: "Shopping limits" },
        { id: "watching", title: "Seeing what it did" },
        { id: "new-link", title: "A new link, or turning it off" },
      ]}
    >
      <H2 id="two" className="mt-0">
        Two kinds of agent
      </H2>
      <CardGrid>
        <LinkCard title="Your shop's agent" icon={<ChatIcon size={18} strokeWidth={2.2} />} href={`${base}/guides/questions`}>
          Lives in resell.store. Answers buyers&apos; questions and haggles on offers for you, within rules you set.
        </LinkCard>
        <LinkCard title="Your own AI" icon={<BagIcon size={18} strokeWidth={2.2} />} href={`${base}/mcp`}>
          Claude, ChatGPT or any app that takes MCP. Ask it to list things, answer buyers, or go shopping for you.
        </LinkCard>
      </CardGrid>

      <H2 id="shop-agent">Your shop&apos;s agent</H2>
      <P>
        Every shop comes with an agent, set up in the shop&apos;s settings under <strong>What your agent may do</strong>:
      </P>
      <UL>
        <li>
          <strong>Answer buyers&apos; questions</strong> (on to start with): it replies straight away using only what&apos;s in the
          listing and your own earlier answers, and hands anything else to you. Those show in your Inbox under <strong>New messages</strong>, marked{" "}
          <strong>A question for you</strong>. See{" "}
          <A href={`${base}/guides/questions`}>Questions and your shop agent</A>.
        </li>
        <li>
          <strong>Haggle on offers</strong> (on to start with): it counters lowball offers, never under your lowest, and leaves
          good offers for your yes. It never accepts on its own. See <A href={`${base}/guides/offers`}>Offers</A>.
        </li>
      </UL>
      <P>Everything it does shows in your inbox, and you get one summary email each evening when it&apos;s been busy.</P>

      <H2 id="link">Your private link</H2>
      <P>
        To use your own AI app, make a private link. It&apos;s one link per person, and it covers both selling and shopping.
      </P>
      <UL>
        <li>
          Sellers: go to <A href={siteUrl("/tools/agent")}>Your agent</A>. You get two addresses to copy:{" "}
          <strong>Your shops</strong> and <strong>Shopping, as you</strong>.
        </li>
        <li>
          Shoppers: go to <A href={siteUrl("/agent")}>For your agent</A> and tap <strong>Make my shopping link</strong>.
        </li>
      </UL>
      <Callout tone="warn" title="It's shown once, and it works like a password">
        Copy it the moment it appears. We can&apos;t show it again, and anyone who has it can act as you within the rules below.
        Only you should have it.
      </Callout>
      <OL>
        <li>Copy your link.</li>
        <li>In your AI app, look for Connectors or MCP servers in its settings and paste it.</li>
        <li>Ask it something: &quot;What needs me today?&quot; or &quot;Find me a dutch oven under $150.&quot;</li>
      </OL>
      <P>
        Step-by-step setup for Claude, ChatGPT, Claude Code, Cursor and VS Code is in{" "}
        <A href={`${base}/mcp/connect`}>Connect your app</A>. Just want your AI to look around without an account? Give it{" "}
        <C>{mcpUrl("/buy")}</C>; it can search and look at listings and stores, nothing more.
      </P>

      <H2 id="permissions">What it may do</H2>
      <P>
        On <A href={siteUrl("/tools/agent")}>Your agent</A>, set each of these to <strong>Always</strong>,{" "}
        <strong>Ask me first</strong> or <strong>Never</strong>. They apply to every AI app using your link.
      </P>
      <Table
        head={["Permission", "Starts as"]}
        rows={[
          ["See listings, sales and stats", "On (reading only)"],
          ["Make and edit listings", "Always. Ask me first covers publishing and deleting."],
          ["Reply to buyers", "Always"],
          ["Answer offers: accept, counter or decline", "Ask me first"],
          ["Mark things shipped, with the tracking number", "Always"],
          ["Shop for you: like, follow, message sellers, make offers", "Ask me first"],
        ]}
      />
      <P>
        With <strong>Ask me first</strong>, your AI app checks with you before it goes ahead. With <strong>Never</strong>, it
        can&apos;t see that tool at all.
      </P>

      <H2 id="shopping">Shopping limits</H2>
      <P>
        On <A href={siteUrl("/agent")}>For your agent</A>, under <strong>You hold the purse</strong>:
      </P>
      <UL>
        <li>
          <strong>Most it can spend on one thing</strong>: $200 to start, in whole dollars, or no limit. It can&apos;t offer or
          agree to a counter above it; anything more comes back to you.
        </li>
        <li>
          <strong>Make offers on its own</strong>: off to start with, so it asks you before each offer. Turn it on and it can make
          offers up to your limit by itself.
        </li>
      </UL>
      <Callout tone="note" title="Paying is always yours">
        Your AI can never pay. When you&apos;re ready, it hands you the checkout link, and you pay with PayPal yourself. It also
        can&apos;t connect PayPal, change where your money goes or delete your account.
      </Callout>

      <H2 id="watching">Seeing what it did</H2>
      <UL>
        <li>
          <strong>Using your link now</strong> lists the AI apps that have connected, and when they were last used.
        </li>
        <li>
          <strong>What it did lately</strong> shows every action, including ones it <strong>Asked you first</strong> about and
          ones that were <strong>Not allowed</strong>.
        </li>
      </UL>

      <H2 id="new-link">A new link, or turning it off</H2>
      <H3>Lost it, or think someone else has it?</H3>
      <P>
        Tap <strong>Make a new link</strong>. The old one stops working right away, in every app using it, including any that run
        your shops. Set them up again with the new link. Your permissions and limits stay the same.
      </P>
      <H3>Done with it?</H3>
      <P>
        On <A href={siteUrl("/tools/agent")}>Your agent</A>, tap <strong>Turn it off</strong>. Every AI app using it loses access
        straight away, and you can make a new one any time.
      </P>
    </DocPage>
  );
}
