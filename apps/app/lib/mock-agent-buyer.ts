/* P7 For your agent: the assistants a buyer can connect, and the limits they set. */

export const mcpUrl = "https://resell.store/mcp";

export type AssistantId = "chatgpt" | "claude" | "grok" | "mcp" | "webmcp";

export type Assistant = {
  id: AssistantId;
  name: string;
  blurb: string;
  /** "add" connects in place, "copy" copies the MCP link, "none" needs nothing. */
  action: "add" | "copy" | "none";
  /** Letter tile, or a drawn icon for the two generic options. */
  mark: string | "link" | "browser";
  connected?: boolean;
};

export const assistants: Assistant[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    blurb: "Shop and make offers from any chat.",
    action: "add",
    mark: "C",
  },
  {
    id: "claude",
    name: "Claude",
    blurb: "Add it as a connector, then just ask.",
    action: "add",
    mark: "C",
    connected: true,
  },
  {
    id: "grok",
    name: "Grok",
    blurb: "Browse and buy without leaving it.",
    action: "add",
    mark: "G",
  },
  {
    id: "mcp",
    name: "Any MCP client",
    blurb: "One link for any agent that speaks MCP.",
    action: "copy",
    mark: "link",
  },
  {
    id: "webmcp",
    name: "In your browser",
    blurb: "WebMCP. Browser agents can use this site as is.",
    action: "none",
    mark: "browser",
  },
];

export const abilities = [
  {
    title: "Finds the right one",
    body: "Describe what you want in your own words. It searches every store by size, year, condition and budget.",
    example: "A linen dress, size M, under $30",
  },
  {
    title: "Tells you first",
    body: "Ask it to watch a store, a thing or a price. You hear the moment one turns up or drops.",
    example: "Tell me if that lamp goes under $40",
  },
  {
    title: "Haggles politely",
    body: "It makes the offer, answers the counter, and stops at the ceiling you set. Deposits are refunded on a no.",
    example: "Offer $120, go to $126 at most",
  },
  {
    title: "Checks out safely",
    body: "It pays through PayPal, and the money is held until your order arrives. It asks you before it pays.",
    example: "Yes, buy it",
  },
] as const;

export const spendLimit = 200;

export type LimitId = "askBeforePaying" | "makeOffers" | "messageSellers";

export const limitSwitches: {
  id: LimitId;
  title: string;
  hint: string;
  on: boolean;
}[] = [
  {
    id: "askBeforePaying",
    title: "Ask me before it pays",
    hint: "You approve each payment in your assistant.",
    on: true,
  },
  {
    id: "makeOffers",
    title: "Make offers on its own",
    hint: "Up to the ceiling you give it for each thing.",
    on: true,
  },
  {
    id: "messageSellers",
    title: "Message sellers as me",
    hint: "Sellers always see when a message came from an agent.",
    on: false,
  },
];
