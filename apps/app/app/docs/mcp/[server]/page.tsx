import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverInfo, type ServerKind } from "@repo/mcp";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, DocPage, H2, P } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { params as paramList } from "../../../../lib/docs/samples";
import { mcpUrl } from "../../../../lib/urls";

type Props = { params: Promise<{ server: string }> };

const pages: Record<ServerKind, { title: string; lead: string; address: string; groups: [string, string[]][] }> = {
  seller: {
    title: "Your shops",
    lead: "The seller's server: everything you do in the app, from asking your AI.",
    address: mcpUrl("/u/your-private-link"),
    groups: [
      ["Overview", ["whats_waiting", "whoami", "get_stats"]],
      ["Shops", ["list_shops", "get_shop", "update_shop", "open_shop"]],
      [
        "Listings",
        ["list_listings", "get_listing", "create_listing", "update_listing", "publish_listing", "unpublish_listing", "mark_sold_elsewhere", "relist", "delete_listing"],
      ],
      ["Photos", ["add_photos", "remove_photo", "reorder_photos"]],
      ["Research and words", ["research_item", "research_listing", "get_research", "write_listing_words"]],
      ["Offers", ["list_offers", "accept_offer", "decline_offer", "counter_offer"]],
      ["Sales", ["list_sales", "get_sale", "mark_shipped"]],
      ["Messages", ["list_conversations", "read_conversation", "reply_to_buyer", "mark_conversation_read"]],
    ],
  },
  buyer: {
    title: "Shopping",
    lead: "The buyer's server: find things, keep track of them and talk to sellers. Searching and looking work without a link.",
    address: mcpUrl("/buy/your-private-link"),
    groups: [
      ["Looking", ["search", "view_listing", "browse_stores", "view_store"]],
      ["Likes, follows and shares", ["like_listing", "unlike_listing", "my_likes", "follow_store", "unfollow_store", "stores_i_follow", "share_listing"]],
      ["Offers", ["make_offer", "my_offers", "answer_counter", "withdraw_offer"]],
      ["Messages", ["message_shop", "my_conversations", "read_conversation", "reply"]],
      ["Buying", ["get_checkout_link", "my_orders", "confirm_delivery"]],
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = (await params).server as ServerKind;
  return { title: pages[kind] ? `${pages[kind].title} · MCP` : "MCP" };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default async function ServerPage({ params }: Props) {
  const kind = (await params).server as ServerKind;
  const page = pages[kind];
  if (!page) notFound();
  const base = await docsBase();
  const tools = new Map(serverInfo[kind].tools.map((t) => [t.name, t]));

  return (
    <DocPage
      base={base}
      path={`/mcp/${kind}`}
      eyebrow="MCP server"
      title={page.title}
      lead={page.lead}
      toc={[{ id: "address", title: "Address" }, ...page.groups.map(([g]) => ({ id: slug(g), title: g }))]}
    >
      <H2 id="address" className="mt-0">
        Address
      </H2>
      <CodeBlock code={page.address} />
      <P>
        Each tool lists the permission it needs. Tools your link isn&apos;t allowed to use don&apos;t show up in your app at all. See{" "}
        <A href={`${base}/mcp`}>What it may do</A>.
      </P>
      {page.groups.map(([group, names]) => (
        <section key={group} className="flex flex-col gap-3">
          <H2 id={slug(group)}>{group}</H2>
          <div className="flex flex-col divide-y divide-public-border rounded-xl border border-border">
            {names.map((name) => {
              const t = tools.get(name);
              if (!t) return null;
              const inputs = paramList(t.input);
              return (
                <div key={name} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <code className="font-mono text-sm font-bold">{t.name}</code>
                    <span className="text-sm text-text-muted">{t.title}</span>
                    <span className="ml-auto flex gap-1.5">
                      {t.scope ? (
                        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-text-muted">{t.scope}</span>
                      ) : (
                        <span className="rounded-full bg-secondary-soft px-2.5 py-0.5 text-xs font-semibold text-secondary">no link needed</span>
                      )}
                      {t.consequential && (
                        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold">can ask first</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[15px] leading-6 text-text/85">{t.description}</p>
                  {inputs.length > 0 && (
                    <p className="flex flex-wrap gap-1.5 text-sm">
                      {inputs.map((p) => (
                        <span key={p.name} title={p.description} className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                          {p.name}
                          {p.required ? "" : "?"}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <P className="pt-4">
        Every tool is one or two <A href={`${base}/api`}>API</A> calls. <C>search</C>, for example, is{" "}
        <C>GET /v1/market/search</C>.
      </P>
    </DocPage>
  );
}
