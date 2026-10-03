import type { Metadata } from "next";
import {
  ArrowUpRightIcon,
  BagIcon,
  ChatIcon,
  CodeIcon,
  ListIcon,
  PlugIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TagIcon,
  TruckIcon,
} from "@repo/ui/icons";
import { CardGrid, DocPage, H2, LinkCard, P } from "../../components/docs/page";
import { docsBase } from "../../lib/docs/base";

export const metadata: Metadata = { title: { absolute: "resell.store docs" } };

export default async function DocsHome() {
  const base = await docsBase();
  const href = (p: string) => base + p;
  return (
    <DocPage
      base={base}
      path="/"
      eyebrow="Docs"
      title="Everything about resell.store"
      lead="How to sell and buy here, how to build on it with the API and your own AI, and how resell.store itself is put together."
      toc={[
        { id: "start", title: "Start here" },
        { id: "sell", title: "Sell" },
        { id: "buy", title: "Buy" },
        { id: "build", title: "Build on resell.store" },
        { id: "developers", title: "Work on resell.store" },
      ]}
    >
      <H2 id="start" className="mt-0">
        Start here
      </H2>
      <P>
        resell.store is a place to sell the things you no longer need. Each seller gets their own store at their own address, an agent
        that helps them list and price, and PayPal holds the buyer&apos;s money until the item arrives safely.
      </P>
      <CardGrid>
        <LinkCard href={href("/guides/getting-started")} title="Getting started" icon={<SparkleIcon size={18} />}>
          Sign in, choose whether you&apos;re here to sell or to shop, and find your way around.
        </LinkCard>
        <LinkCard href={href("/guides/how-it-works")} title="How a sale works" icon={<ShieldCheckIcon size={18} strokeWidth={2.2} />}>
          From listing to payout: who does what, where the money waits and when it moves.
        </LinkCard>
      </CardGrid>

      <H2 id="sell">Sell</H2>
      <CardGrid>
        <LinkCard href={href("/guides/shops")} title="Open a shop" icon={<TagIcon size={18} strokeWidth={2.2} />}>
          Pick a name and an address, then set how your agent answers buyers and haggles.
        </LinkCard>
        <LinkCard href={href("/guides/list-an-item")} title="List an item" icon={<PlusIcon size={18} strokeWidth={2.2} />}>
          Snap a photo, say what it is, and let the agent research it, price it and write the words.
        </LinkCard>
        <LinkCard href={href("/guides/offers")} title="Offers" icon={<ChatIcon size={18} strokeWidth={2.2} />}>
          Accept, counter or decline, and see what your agent says while you&apos;re busy.
        </LinkCard>
        <LinkCard href={href("/guides/getting-paid")} title="Getting paid" icon={<BagIcon size={18} strokeWidth={2.2} />}>
          Connect PayPal, what the fee is, and when held money is released to you.
        </LinkCard>
      </CardGrid>

      <H2 id="buy">Buy</H2>
      <CardGrid>
        <LinkCard href={href("/guides/finding")} title="Finding things" icon={<SearchIcon size={18} strokeWidth={2.2} />}>
          Search in your own words, browse stores, like things and follow the shops you love.
        </LinkCard>
        <LinkCard href={href("/guides/after-you-buy")} title="After you buy" icon={<TruckIcon size={18} strokeWidth={2.2} />}>
          Track it, say it arrived, cancel if it never ships, or report a problem.
        </LinkCard>
      </CardGrid>

      <H2 id="build">Build on resell.store</H2>
      <P>Everything you can do in the app, your code and your AI can do too.</P>
      <CardGrid>
        <LinkCard href={href("/api")} title="API" icon={<CodeIcon size={18} strokeWidth={2.2} />}>
          Make and publish listings, answer offers, ship sales, reply to buyers and read your stats over HTTP.
        </LinkCard>
        <LinkCard href={href("/mcp")} title="MCP" icon={<SparkleIcon size={18} />}>
          Connect Claude, ChatGPT or any MCP app with one link. Ask it what sold this week, or to find you a dutch oven.
        </LinkCard>
        <LinkCard href={href("/api/webhooks")} title="Webhooks" icon={<PlugIcon size={18} strokeWidth={2.2} />}>
          Get told when something sells, an offer comes in or a buyer asks a question.
        </LinkCard>
        <LinkCard href={href("/api/recipes")} title="Recipes" icon={<ListIcon size={18} strokeWidth={2.2} />}>
          Short, complete examples: list from a photo, answer offers from a script, export your sales.
        </LinkCard>
      </CardGrid>

      <H2 id="developers">Work on resell.store</H2>
      <P>resell.store is one Next.js app and a few packages. These pages are for running it, changing it and deploying your own copy.</P>
      <CardGrid>
        <LinkCard href={href("/dev")} title="Developer overview" icon={<SettingsIcon size={18} strokeWidth={2.2} />}>
          The moving parts, how a request finds its page, and where the code for each feature lives.
        </LinkCard>
        <LinkCard href={href("/dev/deploy")} title="Deploy to Render" icon={<ArrowUpRightIcon size={18} strokeWidth={2.2} />}>
          One blueprint: the web service, Postgres, the workflow that moves money on time, and the cron that starts it.
        </LinkCard>
        <LinkCard href={href("/dev/stack")} title="Built with" icon={<PlugIcon size={18} strokeWidth={2.2} />}>
          PayPal, the AI model, Channel3, Kernel and Render: what each one does here and what it makes possible.
        </LinkCard>
      </CardGrid>
    </DocPage>
  );
}
